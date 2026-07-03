// Spaced repetition (an SM-2-lite scheme). A word is reviewed at growing
// intervals; getting it right pushes the next review further out, getting it
// wrong resets it. Once the interval crosses MASTER_INTERVAL the word is
// "mastered" and drops out of rotation — i.e. it repeats until you know it.

import type { WordProgress } from '../types';

export const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
export const MASTER_INTERVAL = 21; // days — reach this and the word graduates
const AGAIN_MS = 10 * 60_000;      // lapsed words come back in ~10 minutes
const DAY_MS = 86_400_000;

export type ReviewOutcome = 'good' | 'again';

export interface SrsFields {
  reps: number;
  lapses: number;
  interval: number;
  ease: number;
  dueAt: string;
  lastReviewedAt: string;
  mastered: boolean;
}

/** Next interval (days) after a correct review of a card at `interval`/`ease`. */
function nextInterval(interval: number, ease: number): number {
  if (interval <= 0) return 1;
  if (interval === 1) return 3;
  return Math.round(interval * ease);
}

/** Compute updated SR fields for a review outcome. */
export function gradeReview(prev: WordProgress | undefined, outcome: ReviewOutcome, now = new Date()): SrsFields {
  const lapses = prev?.lapses ?? 0;
  const ease = prev?.ease ?? DEFAULT_EASE;
  const t = now.getTime();

  if (outcome === 'again') {
    return {
      reps: 0,
      lapses: lapses + 1,
      interval: 0,
      ease: Math.max(MIN_EASE, ease - 0.2),
      dueAt: new Date(t + AGAIN_MS).toISOString(),
      lastReviewedAt: now.toISOString(),
      mastered: false,
    };
  }

  const interval = nextInterval(prev?.interval ?? 0, ease);
  return {
    reps: (prev?.reps ?? 0) + 1,
    lapses,
    interval,
    ease: Math.min(MAX_EASE, ease + 0.05),
    dueAt: new Date(t + interval * DAY_MS).toISOString(),
    lastReviewedAt: now.toISOString(),
    mastered: interval >= MASTER_INTERVAL,
  };
}

/** Has this word entered the SR system (been reviewed at least once)? */
export function inReview(p: WordProgress | undefined): boolean {
  return !!p && !!p.dueAt;
}

/** Is the word due for review right now (in review, not mastered, past due)? */
export function isDue(p: WordProgress | undefined, now = Date.now()): boolean {
  return inReview(p) && !p!.mastered && new Date(p!.dueAt!).getTime() <= now;
}

export function dueTime(p: WordProgress | undefined): number {
  return p?.dueAt ? new Date(p.dueAt).getTime() : Infinity;
}

/** Approximate number of correct reviews still needed to reach mastery. */
export function reviewsUntilMastered(p: WordProgress | undefined): number {
  if (p?.mastered) return 0;
  let interval = p?.interval ?? 0;
  const ease = p?.ease ?? DEFAULT_EASE;
  let steps = 0;
  while (interval < MASTER_INTERVAL && steps < 20) {
    interval = nextInterval(interval, ease);
    steps++;
  }
  return steps;
}
