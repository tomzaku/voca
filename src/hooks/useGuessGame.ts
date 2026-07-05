import { useCallback, useState } from 'react';

// 'random' picks a different real game for every word.
export type GuessGameMode = 'random' | 'letters' | 'scramble' | 'choice' | 'hangman' | 'listen' | 'vowels';
export type RealGuessGameMode = Exclude<GuessGameMode, 'random'>;

export interface GuessGameInfo {
  id: GuessGameMode;
  label: string;
  description: string;
  icon: string;
}

// `icon` values are Iconify names (Lucide set) — rendered with <Icon icon=… />.
export const GUESS_GAMES: GuessGameInfo[] = [
  { id: 'random',   label: 'Random',     icon: 'lucide:dices',         description: 'A different game for every word' },
  { id: 'letters',  label: 'Letters',    icon: 'lucide:type',          description: 'Reveal letters and type the word' },
  { id: 'scramble', label: 'Unscramble', icon: 'lucide:shuffle',       description: 'Tap the shuffled letters in order' },
  { id: 'choice',   label: 'Choice',     icon: 'lucide:list-checks',   description: 'Pick the word from its definition' },
  { id: 'hangman',  label: 'Hangman',    icon: 'lucide:skull',         description: 'Guess letters before your lives run out' },
  { id: 'listen',   label: 'Listen',     icon: 'lucide:headphones',    description: 'Hear the word and spell it' },
  { id: 'vowels',   label: 'No Vowels',  icon: 'lucide:circle-dashed', description: 'Fill in the missing vowels' },
];

export const REAL_GUESS_GAMES = GUESS_GAMES.filter((g) => g.id !== 'random') as (GuessGameInfo & { id: RealGuessGameMode })[];

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
