// The rules of the Learn page's guess games, with no UI: what each game hands
// the player, what counts as a right answer, and whether one miss ends the
// round. The flash card's GuessGame and the world's archive desk both play by
// these, so a word is as hard to guess in the city as on the card.

import type { RealGuessGameMode } from '../hooks/useGuessGame';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A typed or built answer is right if it spells the word, ignoring case and
 *  surrounding spaces. */
export function guessMatches(guess: string, word: string): boolean {
  return guess.trim().toLowerCase() === word.trim().toLowerCase();
}

/**
 * Games where a single wrong answer ends the round (and is graded as giving
 * up): retrying a typed word or a four-way pick until it happens to fit
 * teaches nothing. In the others the player keeps going and every miss is
 * counted against the solve.
 */
export const ONE_SHOT: Record<RealGuessGameMode, boolean> = {
  choice: true,
  letters: true,
  scramble: false,
  hangman: false,
  listen: false,
  vowels: false,
  speak: false,
};

/** Share of the letters handed to the player for free in 'letters'. Two
 *  letters (first and last) left most words unguessable; 40% keeps it a puzzle
 *  but a solvable one. */
export const LETTERS_REVEAL_RATIO = 0.4;

/** Is this character part of the puzzle? Spaces, hyphens and apostrophes
 *  aren't — they're always shown. */
export const isLetter = (c: string) => /\p{L}/u.test(c);

/** Random positions of the freely-shown letters in 'letters'. */
export function freeLetterPositions(word: string): Set<number> {
  const positions = word.split('').map((c, i) => (isLetter(c) ? i : -1)).filter((i) => i >= 0);
  const count = Math.max(1, Math.round(positions.length * LETTERS_REVEAL_RATIO));
  return new Set(shuffle(positions).slice(0, Math.min(count, positions.length)));
}

export interface Tile { char: string; id: number; }

/** The word's letters as tiles in a new order — never the answer already in
 *  order (unless the word can't be anything else). */
export function scrambleTiles(word: string): Tile[] {
  const base = word.split('').map((char, id) => ({ char, id }));
  let s = shuffle(base);
  for (let i = 0; i < 8 && word.length > 1 && s.map((t) => t.char).join('') === word; i++) s = shuffle(base);
  return s;
}

/** The word plus three distractors from `pool`, preferring ones of a similar
 *  length so the answer doesn't stand out by size. */
export function choiceOptions(word: string, pool: string[]): string[] {
  const answer = word.toLowerCase();
  const sorted = shuffle(pool.filter((w) => w.toLowerCase() !== answer)).sort(
    (a, b) => Math.abs(a.length - word.length) - Math.abs(b.length - word.length),
  );
  const distractors: string[] = [];
  for (const w of sorted) {
    if (distractors.some((d) => d.toLowerCase() === w.toLowerCase())) continue;
    distractors.push(w);
    if (distractors.length === 3) break;
  }
  return shuffle([word, ...distractors]);
}
