import { useCallback, useState } from 'react';
import type { ReviewEvent, WordProgress } from '../types';

// 'random' picks a different real game for every word; 'smart' picks by the
// word's answer history (see smartPick below).
export type GuessGameMode = 'smart' | 'random' | 'letters' | 'scramble' | 'choice' | 'hangman' | 'listen' | 'vowels';
export type RealGuessGameMode = Exclude<GuessGameMode, 'random' | 'smart'>;

export interface GuessGameInfo {
  id: GuessGameMode;
  label: string;
  description: string;
  icon: string;
}

// `icon` values are Iconify names (Lucide set) — rendered with <Icon icon=… />.
export const GUESS_GAMES: GuessGameInfo[] = [
  { id: 'smart',    label: 'Smart',      icon: 'lucide:brain',         description: 'Difficulty adapts to how well you know each word' },
  { id: 'random',   label: 'Random',     icon: 'lucide:dices',         description: 'A different game for every word' },
  { id: 'letters',  label: 'Letters',    icon: 'lucide:type',          description: 'Reveal letters and type the word' },
  { id: 'scramble', label: 'Unscramble', icon: 'lucide:shuffle',       description: 'Tap the shuffled letters in order' },
  { id: 'choice',   label: 'Choice',     icon: 'lucide:list-checks',   description: 'Pick the word from its definition' },
  { id: 'hangman',  label: 'Hangman',    icon: 'lucide:skull',         description: 'Guess letters before your lives run out' },
  { id: 'listen',   label: 'Listen',     icon: 'lucide:headphones',    description: 'Hear the word and spell it' },
  { id: 'vowels',   label: 'No Vowels',  icon: 'lucide:circle-dashed', description: 'Fill in the missing vowels' },
];

export const REAL_GUESS_GAMES = GUESS_GAMES.filter(
  (g) => g.id !== 'random' && g.id !== 'smart',
) as (GuessGameInfo & { id: RealGuessGameMode })[];

// ── Smart mode ── the games ordered by how much recall they demand: from
// recognizing the word among options up to spelling it from audio alone.
export const GAME_LADDER: RealGuessGameMode[] = ['choice', 'letters', 'listen'];

/** Mean correctness of the player's last 20 recorded answers, across all
 *  words — a rough "how is the session going" signal. Null = no data yet. */
export function recentAccuracy(progress: Record<string, WordProgress>): number | null {
  const events: ReviewEvent[] = [];
  for (const p of Object.values(progress)) {
    if (p.history) events.push(...p.history);
  }
  if (events.length === 0) return null;
  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  const recent = events.slice(0, 20);
  return recent.filter((e) => e.ok).length / recent.length;
}

/**
 * Pick the game for a word by climbing the difficulty ladder: solve a word
 * and its next round is one game harder; miss it and the next round is one
 * easier. First-time words start at recognition ('choice') — or one step up
 * when the player is on a hot run — and a rough patch overall (recent
 * accuracy under 50%) pulls every pick one step easier.
 */
export function smartPick(word: WordProgress | undefined, overallAccuracy: number | null): RealGuessGameMode {
  const ladder = GAME_LADDER as readonly string[];
  const played = (word?.history ?? []).filter((e) => e.via && ladder.includes(e.via));
  let rank: number;
  if (played.length > 0) {
    const last = played[played.length - 1];
    rank = ladder.indexOf(last.via!) + (last.ok ? 1 : -1);
  } else {
    rank = overallAccuracy !== null && overallAccuracy >= 0.8 ? 1 : 0;
  }
  if (overallAccuracy !== null && overallAccuracy < 0.5) rank -= 1;
  return GAME_LADDER[Math.max(0, Math.min(GAME_LADDER.length - 1, rank))];
}

const GAME_KEY = 'voca-guess-game';

function isMode(v: string | null): v is GuessGameMode {
  return GUESS_GAMES.some((g) => g.id === v);
}

export function getGuessGame(): GuessGameMode {
  try {
    const v = localStorage.getItem(GAME_KEY);
    if (isMode(v)) return v;
  } catch { /* ignore */ }
  return 'random';
}

/** Persisted default guess game for the home page. */
export function useGuessGame() {
  const [game, setGameState] = useState<GuessGameMode>(getGuessGame);

  const setGame = useCallback((g: GuessGameMode) => {
    setGameState(g);
    try { localStorage.setItem(GAME_KEY, g); } catch { /* ignore */ }
  }, []);

  return { game, setGame };
}
