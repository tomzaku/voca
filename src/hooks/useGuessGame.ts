import { useCallback, useState } from 'react';

export type GuessGameMode = 'letters' | 'scramble' | 'choice' | 'hangman' | 'listen' | 'vowels';

export interface GuessGameInfo {
  id: GuessGameMode;
  label: string;
  description: string;
  icon: string;
}

export const GUESS_GAMES: GuessGameInfo[] = [
  { id: 'letters',  label: 'Letters',    icon: '🔡', description: 'Reveal letters and type the word' },
  { id: 'scramble', label: 'Unscramble', icon: '🔀', description: 'Tap the shuffled letters in order' },
  { id: 'choice',   label: 'Choice',     icon: '🎯', description: 'Pick the word from its definition' },
  { id: 'hangman',  label: 'Hangman',    icon: '💀', description: 'Guess letters before your lives run out' },
  { id: 'listen',   label: 'Listen',     icon: '🎧', description: 'Hear the word and spell it' },
  { id: 'vowels',   label: 'No Vowels',  icon: '⭕', description: 'Fill in the missing vowels' },
];

const GAME_KEY = 'voca-guess-game';

function isMode(v: string | null): v is GuessGameMode {
  return GUESS_GAMES.some((g) => g.id === v);
}

export function getGuessGame(): GuessGameMode {
  try {
    const v = localStorage.getItem(GAME_KEY);
    if (isMode(v)) return v;
  } catch { /* ignore */ }
  return 'letters';
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
