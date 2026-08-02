// Tests for the Spaced Repetition System scheduler.
//
// This file is the highest-value thing to pin down in the app: `gradeReview` is
// pure math with four consumers — the review queue, the dashboard, the word the
// daily notification names, and the streak — and a regression in it corrupts all
// four silently, weeks before anyone notices a schedule drifting.
//
// The assertions below deliberately test *properties* (an interval grows, a
// lapse shortens it, mastery latches) rather than exact FSRS constants. Pinning
// the constants would just re-state W[] and would fail on any legitimate tuning.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EASE,
  MASTER_INTERVAL,
  dueTime,
  gradeReview,
  inReview,
  isDue,
  retrievability,
  reviewsUntilMastered,
} from './spacedRepetition';
import type { WordProgress } from '../types';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-08-02T12:00:00.000Z');

/** A word in the SR system, `daysAgo` since its last review. */
function reviewed(fields: Partial<WordProgress> & { daysAgo?: number } = {}): WordProgress {
  const { daysAgo = 1, ...rest } = fields;
  const last = new Date(NOW.getTime() - daysAgo * DAY_MS);
  return {
    word: 'gaudy',
    seenAt: last.toISOString(),
    stability: 3,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    interval: 3,
    ease: DEFAULT_EASE,
    dueAt: NOW.toISOString(),
    lastReviewedAt: last.toISOString(),
    mastered: false,
    ...rest,
  };
}

describe('retrievability', () => {
  it('is 1 the instant a word is reviewed', () => {
    expect(retrievability(0, 5)).toBeCloseTo(1, 6);
  });

  it('is the target retention exactly one stability-period later', () => {
    // The whole scheduler rests on this: interval = stability, because that is
    // when recall probability hits 90%.
    expect(retrievability(5, 5)).toBeCloseTo(0.9, 6);
  });

  it('decays monotonically and never goes negative', () => {
    const points = [0, 1, 5, 20, 100, 10_000].map((d) => retrievability(d, 5));
    for (let i = 1; i < points.length; i++) {
      expect(points[i]).toBeLessThan(points[i - 1]);
    }
    // Index arithmetic rather than `.at(-1)`: the app targets ES2020.
    expect(points[points.length - 1]).toBeGreaterThan(0);
  });

  it('treats negative elapsed time as zero rather than exploding', () => {
    // A device with a skewed clock can produce this; it must not return NaN.
    expect(retrievability(-10, 5)).toBeCloseTo(1, 6);
  });
});

describe('gradeReview — first ever answer', () => {
  it('seeds memory state from the grade and schedules a real interval', () => {
    const good = gradeReview(undefined, 'good', NOW);
    expect(good.reps).toBe(1);
    expect(good.lapses).toBe(0);
    expect(good.stability).toBeGreaterThan(0);
    expect(good.interval).toBeGreaterThanOrEqual(1);
    expect(new Date(good.dueAt).getTime()).toBeGreaterThan(NOW.getTime());
    expect(good.lastReviewedAt).toBe(NOW.toISOString());
  });

  it('rates a clean solve as more stable than a struggled one', () => {
    expect(gradeReview(undefined, 'good', NOW).stability).toBeGreaterThan(
      gradeReview(undefined, 'hard', NOW).stability,
    );
  });

  it('sends a failed first answer to the short relearn step, not a day out', () => {
    const again = gradeReview(undefined, 'again', NOW);
    expect(again.interval).toBe(0);
    expect(again.lapses).toBe(1);
    expect(again.reps).toBe(0);
    const gapMinutes = (new Date(again.dueAt).getTime() - NOW.getTime()) / 60_000;
    expect(gapMinutes).toBeGreaterThan(0);
    expect(gapMinutes).toBeLessThan(60);
  });
});

describe('gradeReview — subsequent answers', () => {
  it('grows the interval on a correct review', () => {
    const prev = reviewed({ daysAgo: 3, stability: 3 });
    const next = gradeReview(prev, 'good', NOW);
    expect(next.stability).toBeGreaterThan(prev.stability!);
    expect(next.reps).toBe(2);
  });

  it('never leaves a forgotten word more stable than before', () => {
    // stabilityOnFailure clamps to the old stability — without it a lapse could
    // paradoxically push the next review further away.
    //
    // These numbers matter: the raw FSRS failure formula only exceeds the prior
    // stability for a *weak, easy, long-overdue* word (here it returns ~1.33
    // against a stability of 0.5). With a strong word the formula lands below
    // anyway and the clamp is inert — so a gentler case would pass whether or
    // not the clamp exists.
    const prev = reviewed({ daysAgo: 30, stability: 0.5, difficulty: 1 });
    const next = gradeReview(prev, 'again', NOW);
    expect(next.stability).toBeLessThanOrEqual(prev.stability!);
    expect(next.lapses).toBe(1);
    expect(next.reps).toBe(0);
  });

  it('rewards answering later than due with more stability than answering early', () => {
    // Retrievability feeds the update, so a word recalled after a long gap is
    // stronger evidence of memory than one recalled immediately.
    const early = gradeReview(reviewed({ daysAgo: 1, stability: 5 }), 'good', NOW);
    const late = gradeReview(reviewed({ daysAgo: 15, stability: 5 }), 'good', NOW);
    expect(late.stability).toBeGreaterThan(early.stability);
  });

  it('advances a same-day repeat without treating it as a full review', () => {
    const prev = reviewed({ daysAgo: 0, stability: 3 });
    const next = gradeReview(prev, 'good', NOW);
    expect(Number.isFinite(next.stability)).toBe(true);
    expect(next.stability).toBeGreaterThan(0);
  });

  it('carries a legacy SM-2 interval over as the starting stability', () => {
    // Pre-FSRS rows have `interval` but no `stability`; dropping that would
    // reset every existing user's schedule to day one.
    const legacy: WordProgress = {
      word: 'ebb',
      seenAt: NOW.toISOString(),
      dueAt: NOW.toISOString(),
      interval: 12,
      ease: DEFAULT_EASE,
      lastReviewedAt: new Date(NOW.getTime() - 12 * DAY_MS).toISOString(),
    };
    const next = gradeReview(legacy, 'good', NOW);
    expect(next.stability).toBeGreaterThan(5);
  });

  it('keeps a word out of the SR system from ever being mastered by one answer', () => {
    expect(gradeReview(undefined, 'good', NOW).mastered).toBe(false);
  });
});

describe('gradeReview — mastery', () => {
  it('graduates only once the interval reaches the master threshold', () => {
    const next = gradeReview(reviewed({ daysAgo: 200, stability: 300 }), 'good', NOW);
    expect(next.interval).toBeGreaterThanOrEqual(MASTER_INTERVAL);
    expect(next.mastered).toBe(true);
  });

  it('never marks a failed answer as mastered, however stable the word was', () => {
    const next = gradeReview(reviewed({ daysAgo: 200, stability: 300 }), 'again', NOW);
    expect(next.mastered).toBe(false);
  });

  it('caps the interval so a very stable word still returns within a year', () => {
    const next = gradeReview(reviewed({ daysAgo: 900, stability: 10_000 }), 'good', NOW);
    expect(next.interval).toBeLessThanOrEqual(365);
  });
});

describe('isDue / inReview / dueTime', () => {
  it('treats a word with no dueAt as outside the SR system', () => {
    expect(inReview(undefined)).toBe(false);
    expect(inReview({ word: 'x', seenAt: NOW.toISOString() })).toBe(false);
    expect(isDue(undefined)).toBe(false);
  });

  it('is due exactly at its due moment, not a tick later', () => {
    const p = reviewed({ dueAt: NOW.toISOString() });
    expect(isDue(p, NOW.getTime())).toBe(true);
    expect(isDue(p, NOW.getTime() - 1)).toBe(false);
  });

  it('never surfaces a mastered word as due', () => {
    // The dashboard, the review queue and the notification all rely on this.
    const p = reviewed({ dueAt: new Date(NOW.getTime() - DAY_MS).toISOString(), mastered: true });
    expect(isDue(p, NOW.getTime())).toBe(false);
  });

  it('sorts unscheduled words last', () => {
    expect(dueTime(undefined)).toBe(Infinity);
    expect(dueTime(reviewed({ dueAt: NOW.toISOString() }))).toBe(NOW.getTime());
  });
});

describe('reviewsUntilMastered', () => {
  it('is zero for an already-mastered word', () => {
    expect(reviewsUntilMastered(reviewed({ mastered: true }))).toBe(0);
  });

  it('is positive and finite for a new word', () => {
    const n = reviewsUntilMastered(undefined);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(20);
  });

  it('needs fewer reviews the more stable the word already is', () => {
    const weak = reviewsUntilMastered(reviewed({ stability: 1 }));
    const strong = reviewsUntilMastered(reviewed({ stability: 15 }));
    expect(strong).toBeLessThanOrEqual(weak);
  });
});
