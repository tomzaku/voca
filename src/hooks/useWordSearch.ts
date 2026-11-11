import { create } from 'zustand';

// Bridges a search to whatever plays the word next inside the world: the
// library sets a pending word for the Đông Ba stall (useLearnRound), which
// picks it up and clears it. The app's own searches don't come through here —
// they navigate to the word's URL (wordUrl), which FlashCard follows.
//
// `openCount` is the world's door: on /world the header's search (button,
// ⌘K) opens the library inside the game instead of the app's modal, and
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
