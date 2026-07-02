import { create } from 'zustand';

// Bridges the header search (Navbar) to the FlashCard word loader. The Navbar
// sets a pending word; FlashCard picks it up, loads it, and clears it. Kept in a
// store so the search box can live in the global header while the loading logic
// stays in FlashCard.
interface WordSearchState {
  /** A word requested from the header search, awaiting FlashCard to load it. */
  pending: string | null;
  requestSearch: (word: string) => void;
  consume: () => void;
}

export const useWordSearch = create<WordSearchState>((set) => ({
  pending: null,
  requestSearch: (word) => set({ pending: word }),
  consume: () => set({ pending: null }),
}));
