import { create } from 'zustand';

// Bridges a search to whatever plays the word next. The header search sets a
// pending word for FlashCard; in the world, the library sets one for the Đông
// Ba stall (useLearnRound). Whoever is mounted picks it up and clears it. Kept
// in a store so the search box can live in the global header while the
// loading logic stays with the player.
//
// `openCount` is the world's door: on /world the header's search (button,
// ⌘K, "/") opens the library inside the game instead of the app's modal, and
// WorldGame watches this counter to know when.
interface WordSearchState {
  /** A word requested from a search, awaiting a player to load it. */
  pending: string | null;
  requestSearch: (word: string) => void;
  consume: () => void;
  openCount: number;
  requestOpen: () => void;
}

export const useWordSearch = create<WordSearchState>((set) => ({
  pending: null,
  requestSearch: (word) => set({ pending: word }),
  consume: () => set({ pending: null }),
  openCount: 0,
  requestOpen: () => set((s) => ({ openCount: s.openCount + 1 })),
}));
