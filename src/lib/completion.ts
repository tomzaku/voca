import type { WordProgress } from '../types';

/** Percent of a word list the viewer has finished (known or mastered). Shared
 *  by the Collections list and the world game's station data. */
export function completionPct(words: string[], progress: Record<string, WordProgress>): number {
  if (words.length === 0) return 0;
  let done = 0;
  for (const w of words) {
    const p = progress[w];
    if (p?.status === 'known' || p?.mastered) done++;
  }
  return Math.round((done / words.length) * 100);
}
