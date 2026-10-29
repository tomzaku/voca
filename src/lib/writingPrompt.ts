// The rules of "write a sentence with this word", with no UI: which word to
// ask for, and whether a sentence actually used it. The world's Văn Miếu
// stele game asks through this; the sentence itself is corrected by the same
// Improve Writing call the Writing page makes.

import type { WordProgress } from '../types';
import { wordBucket } from './progress';
import { normalizeSpoken } from './speechMatch';

/**
 * A word worth writing with: one in rotation or giving trouble, at random —
 * producing a word is what fixes it in memory, and these are the words that
 * need it. Falls back to any word met, then null. `skip` keeps the words
 * just asked from coming straight back.
 */
export function pickWritingWord(
  progress: Record<string, WordProgress>,
  skip: Set<string> = new Set(),
  rand: () => number = Math.random,
): string | null {
  const all = Object.values(progress).filter((p) => p.status !== 'dismissed' && !skip.has(p.word));
  const working = all.filter((p) => ['learning', 'difficult'].includes(wordBucket(p)));
  const pool = working.length > 0 ? working : all;
  return pool.length > 0 ? pool[Math.floor(rand() * pool.length)].word : null;
}

/**
 * Did the sentence use the word? Any inflection counts ("decide" in "she
 * decided"), as does a form from the word's family ("decision"); a phrase
 * must appear whole.
 */
export function sentenceUsesWord(sentence: string, word: string, family: string[] = []): boolean {
  const said = ` ${normalizeSpoken(sentence)} `;
  const tokens = said.trim().split(' ');
  return [word, ...family].some((form) => {
    const w = normalizeSpoken(form);
    if (!w) return false;
    if (w.includes(' ')) return said.includes(` ${w} `);
    // Inflections: a stem (dropping a final silent e) plus a short ending.
    const stem = w.length > 3 ? w.replace(/e$/, '') : w;
    return tokens.some((t) => t === w || (t.startsWith(stem) && t.length - stem.length <= 3));
  });
}
