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

/** The `?tab=` value a bucket is filtered by on the History page. */
export type BucketTab = 'not-started' | 'struggling' | 'learning' | 'mastered' | 'skipped';

/**
 * How each bucket is named and painted, in one place, so a word carries the
 * same word and colour on the flash card, the History filters and the
 * dashboard bar. Internal ids stay as they are (`pending`/`difficult`) — only
 * what the learner reads is defined here.
 *
 * Every use pairs the label with `icon`, so state never rides on colour alone.
 */
export const BUCKET_META: Record<
  WordBucket,
  {
    /** What the learner sees — the only wording used for this bucket. */
    label: string;
    icon: string;
    /** Fill colour for bar segments. */
    bar: string;
    /** Text colour on its own. */
    text: string;
    /** Text + tint, for pills and chips. */
    chip: string;
    /** One line on why a word lands here. */
    hint: string;
    /** History's `?tab=` value for this bucket. */
    tab: BucketTab;
  }
> = {
  pending: {
    label: 'Not started',
    icon: 'lucide:circle-dashed',
    bar: 'bg-accent-orange',
    text: 'text-accent-orange',
    chip: 'text-accent-orange bg-accent-orange/10',
    hint: 'Never answered yet — waiting for their first round.',
    tab: 'not-started',
  },
  difficult: {
    label: 'Struggling',
    icon: 'lucide:flame',
    bar: 'bg-accent-red',
    text: 'text-accent-red',
    chip: 'text-accent-red bg-accent-red/10',
    hint: 'Failed the last round, or more wrong answers than correct — these repeat until learned.',
    tab: 'struggling',
  },
  learning: {
    label: 'Learning',
    icon: 'lucide:refresh-cw',
    bar: 'bg-accent-cyan',
    text: 'text-accent-cyan',
    chip: 'text-accent-cyan bg-accent-cyan/10',
    hint: 'On the review schedule, coming back at growing intervals.',
    tab: 'learning',
  },
  mastered: {
    label: 'Mastered',
    icon: 'lucide:sparkles',
    bar: 'bg-accent-green',
    text: 'text-accent-green',
    chip: 'text-accent-green bg-accent-green/10',
    hint: 'Graduated — the review gap passed ~3 weeks.',
    tab: 'mastered',
  },
  dismissed: {
    label: 'Skipped',
    icon: 'lucide:eye-off',
    bar: 'bg-border-light',
    text: 'text-text-muted',
    chip: 'text-text-muted bg-bg-tertiary',
    hint: 'Skipped for good — never shown (restore from History).',
    tab: 'skipped',
  },
};

/**
 * Bucket order as a progression — never answered, struggling, in rotation,
 * done, opted out — so any list built from it reads as forward movement.
 */
export const BUCKET_ORDER: WordBucket[] = [
  'pending',
  'difficult',
  'learning',
  'mastered',
  'dismissed',
];
