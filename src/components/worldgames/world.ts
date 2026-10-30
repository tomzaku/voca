import { createContext, useContext, type ReactNode } from 'react';
import type { Look } from '../../game/wardrobe';

// What the world gives its activities' screens, so a screen asks for what it
// needs (useWorld) instead of WorldGame passing it in — which is what lets an
// activity be a file of its own (./activity.ts). WorldGame provides it.

export interface WorldApi {
  /** Words the activities draw from: the collection you study, or all you have. */
  wordPool: string[];
  openActivity: (id: string) => void;
  /** Hand a word to the Đông Ba stall, which plays it next. */
  learnWord: (word: string) => void;
  /** Has this learner ever chosen a collection. */
  chosen: boolean;
  /** The collections list with its actions — study, preview, quiz, manage. */
  collectionsHall: (focus: string | null, prompt?: string) => ReactNode;
  /** The tailor's: what you have on, and how a fitting ends. */
  tailor: {
    initial: Look;
    firstVisit: boolean;
    name: string;
    rename: (name: string) => void;
    tryOn: (look: Look) => void;
    done: (look: Look) => void;
  };
}

export const WorldContext = createContext<WorldApi | null>(null);

export function useWorld(): WorldApi {
  const api = useContext(WorldContext);
  if (!api) throw new Error('useWorld outside the world');
  return api;
}
