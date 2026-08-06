import { create } from 'zustand';

// The word peek popup — one at a time, opened from anywhere (a synonym chip on
// the flashcard, a common phrase, a word-family form, a quiz card). Kept in a
// store rather than local state so the popup itself can be mounted once at the
// app root: a card that renders chips shouldn't have to own an overlay, and a
// popup nested inside a scrolling card would be clipped by it.

/** Where the popup should point — the viewport rect of the chip that opened it. */
export interface PeekAnchor {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface WordPeekState {
  /** The word being peeked at, or null when the popup is closed. */
  word: string | null;
  anchor: PeekAnchor | null;
  open: (word: string, el?: Element | null) => void;
  close: () => void;
}

export const useWordPeek = create<WordPeekState>((set) => ({
  word: null,
  anchor: null,
  open: (word, el) => {
    const r = el?.getBoundingClientRect();
    set({
      word: word.trim(),
      anchor: r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null,
    });
  },
  close: () => set({ word: null, anchor: null }),
}));

/**
 * Open the peek for `word`, pointing at the element that was clicked.
 *
 * Call site: `onClick={(e) => peekWord(word, e.currentTarget)}`. Chips live in
 * components that don't otherwise subscribe to this store, so this reads the
 * store imperatively — no re-render on open for the card behind it.
 */
export function peekWord(word: string, el?: Element | null): void {
  useWordPeek.getState().open(word, el);
}
