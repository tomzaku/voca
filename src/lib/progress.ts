import type { WordProgress } from '../types';

const DAY = 86_400_000;

/** Relative "how long ago" label (e.g. "3d ago", "yesterday", "2h ago"). */
export function agoLabel(iso?: string): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const days = Math.floor(diff / DAY);
  if (days <= 0) {
    const hrs = Math.floor(diff / 3_600_000);
    return hrs <= 0 ? 'just now' : `${hrs}h ago`;
  }
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

/**
 * The one-line "why is this word here" — how often and how recently it was
 * reviewed. Shown under a word on the review popup and the History list so the
 * spaced-repetition schedule feels legible rather than mysterious.
 */
export function whyLine(p: WordProgress): string {
  const reps = p.reps ?? 0;
  const last = agoLabel(p.lastReviewedAt ?? p.seenAt);
  if (reps <= 0) return `Learned ${last}`;
  const times = reps === 1 ? 'once' : reps === 2 ? 'twice' : `${reps} times`;
  return `Reviewed ${times} · ${last}`;
}

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
