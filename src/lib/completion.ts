import type { WordProgress } from '../types';

/** Percent of a word list the viewer has finished (known or mastered). Shared
 *  by the Collections list and the world game's station data. */
/** How many of `words` are known — answered right, or mastered. */
export function completionCount(words: string[], progress: Record<string, WordProgress>): number {
  let done = 0;
  for (const w of words) {
    const p = progress[w];
    if (p?.status === 'known' || p?.mastered) done++;
  }
  return done;
}

export function completionPct(words: string[], progress: Record<string, WordProgress>): number {
  if (words.length === 0) return 0;
  return Math.round((completionCount(words, progress) / words.length) * 100);
}
