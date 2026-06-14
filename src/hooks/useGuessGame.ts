import { useCallback, useState } from 'react';

export type GuessGameMode = 'letters' | 'scramble' | 'choice';

export interface GuessGameInfo {
  id: GuessGameMode;
  label: string;
  description: string;
}

export const GUESS_GAMES: GuessGameInfo[] = [
  { id: 'letters',  label: 'Letters',  description: 'Reveal letters and type the word' },
  { id: 'scramble', label: 'Unscramble', description: 'Tap the shuffled letters in order' },
  { id: 'choice',   label: 'Choice',   description: 'Pick the word from its definition' },
];

const GAME_KEY = 'voca-guess-game';

function isMode(v: string | null): v is GuessGameMode {
  return v === 'letters' || v === 'scramble' || v === 'choice';
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
