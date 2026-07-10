import type { WordProgress } from '../types';

/**
 * Case-insensitive progress lookup. Progress may be recorded under a different
 * casing than a collection stores (custom lists keep the user's typing; older
 * versions saved under the AI-normalized form), so exact-key misses fall back
 * to a lowercased index.
 */
export function progressLookup(
  progress: Record<string, WordProgress>,
): (word: string) => WordProgress | undefined {
  const byLower = new Map<string, WordProgress>();
  for (const p of Object.values(progress)) byLower.set(p.word.toLowerCase(), p);
  return (word) => progress[word] ?? byLower.get(word.toLowerCase());
}

/** Where a word stands in the learning flow — one mutually-exclusive bucket. */
export type WordBucket = 'pending' | 'difficult' | 'learning' | 'mastered' | 'dismissed';

/**
 * Classify a word for selection/analytics. Matches the Learn-page rotation:
 * "difficult" words (last round failed, or more wrong answers than correct)
 * repeat until learned; "pending" words were never answered.
 */
export function wordBucket(p: WordProgress | undefined): WordBucket {
  if (p?.status === 'dismissed') return 'dismissed';
  if (p?.mastered) return 'mastered';
  if (p && (p.status === 'skipped' || (p.wrong ?? 0) > (p.correct ?? 0))) return 'difficult';
  if (p?.dueAt) return 'learning';
  return 'pending';
}
