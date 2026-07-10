// Spaced repetition — FSRS-5, the algorithm behind modern Anki, reduced to
// this app's three outcomes: 'good' (solved cleanly), 'hard' (solved with
// mistakes), 'again' (gave up / failed).
//
// Each word carries two memory variables:
//   stability S  — days until recall probability decays to 90%
//   difficulty D — 1..10, how hard this word is for this learner
// The next review lands when recall probability hits DESIRED_RETENTION, so
// interval = S. Crucially the *actual elapsed time* since the last answer
// (lastReviewedAt) feeds retrievability R: answering correctly long after the
// due date grows stability extra, failing early shrinks it more — incorrect
// words are rescheduled from their real memory state instead of a fixed reset.
// Once the interval crosses MASTER_INTERVAL the word graduates out of rotation.

import type { WordProgress } from '../types';

// FSRS-5 default parameters (as shipped by ts-fsrs / py-fsrs).
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

const DECAY = -0.5;
const FACTOR = 19 / 81;            // chosen so R(t = S) = 0.9
const DESIRED_RETENTION = 0.9;     // review when recall probability drops to 90%
export const MASTER_INTERVAL = 21; // days — reach this and the word graduates
const AGAIN_MS = 10 * 60_000;      // failed words come back in ~10 minutes
const DAY_MS = 86_400_000;
const MAX_INTERVAL = 365;
export const DEFAULT_EASE = 2.5;   // legacy SM-2 field, kept so old data round-trips

export type ReviewOutcome = 'good' | 'hard' | 'again';

// FSRS grades: 1 = Again, 2 = Hard, 3 = Good (4 = Easy — unused by this app).
const GRADE: Record<ReviewOutcome, number> = { again: 1, hard: 2, good: 3 };

export interface SrsFields {
  reps: number;
  lapses: number;
  interval: number;
  stability: number;
  difficulty: number;
  ease: number;
  dueAt: string;
  lastReviewedAt: string;
  mastered: boolean;
}

const clampD = (d: number) => Math.min(10, Math.max(1, d));

function initStability(g: number): number {
  return Math.max(0.1, W[g - 1]);
}

function initDifficulty(g: number): number {
  return clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);
}

/** Recall probability after `elapsedDays` for a word with stability `s`. */
export function retrievability(elapsedDays: number, s: number): number {
  return Math.pow(1 + FACTOR * (Math.max(0, elapsedDays) / s), DECAY);
}

function nextDifficulty(d: number, g: number): number {
  const damped = d + -W[6] * (g - 3) * ((10 - d) / 9);
  // Mean reversion toward the initial difficulty of an "easy" answer.
  return clampD(W[7] * initDifficulty(4) + (1 - W[7]) * damped);
}

function stabilityOnSuccess(d: number, s: number, r: number, g: number): number {
  const hardPenalty = g === 2 ? W[15] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hardPenalty);
}

function stabilityOnFailure(d: number, s: number, r: number): number {
  const sf = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(sf, s); // forgetting can't leave the word more stable than before
}

/** Same-day re-review (e.g. the 10-minute relearn step) — short-term memory update. */
function stabilityShortTerm(s: number, g: number): number {
  return s * Math.exp(W[17] * (g - 3 + W[18]));
}

/** Days until recall probability decays to DESIRED_RETENTION. */
function intervalFor(s: number): number {
  const days = (s / FACTOR) * (Math.pow(DESIRED_RETENTION, 1 / DECAY) - 1);
  return Math.min(MAX_INTERVAL, Math.max(1, Math.round(days)));
}

/** Memory state for progress written by the old SM-2 scheme (no stability yet).
 *  Interval ≈ stability at 90% retention, so the old interval carries over. */
function legacyStability(prev: WordProgress | undefined): number | null {
  if (!prev?.dueAt) return null; // never reviewed
  if (prev.stability != null) return prev.stability;
  if (prev.interval && prev.interval > 0) return prev.interval;
  return initStability(1); // was mid-relearn under the old scheme
}

/** Compute updated SR fields for a review outcome. */
export function gradeReview(prev: WordProgress | undefined, outcome: ReviewOutcome, now = new Date()): SrsFields {
  const g = GRADE[outcome];
  const t = now.getTime();

  let s: number;
  let d: number;
  const prevS = legacyStability(prev);
  if (prevS == null) {
    // First-ever answer seeds the memory state straight from the grade.
    s = initStability(g);
    d = initDifficulty(g);
  } else {
    d = prev?.difficulty ?? initDifficulty(3);
    const elapsedDays = prev?.lastReviewedAt
      ? (t - new Date(prev.lastReviewedAt).getTime()) / DAY_MS
      : 0;
    if (elapsedDays < 1) {
      s = stabilityShortTerm(prevS, g);
    } else {
      const r = retrievability(elapsedDays, prevS);
      s = g === 1 ? stabilityOnFailure(d, prevS, r) : stabilityOnSuccess(d, prevS, r, g);
    }
    d = nextDifficulty(d, g);
  }
  s = Math.max(0.1, s);

  const interval = outcome === 'again' ? 0 : intervalFor(s);
  return {
    reps: outcome === 'again' ? 0 : (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (outcome === 'again' ? 1 : 0),
    interval,
    stability: s,
    difficulty: d,
    ease: prev?.ease ?? DEFAULT_EASE,
    dueAt: new Date(outcome === 'again' ? t + AGAIN_MS : t + interval * DAY_MS).toISOString(),
    lastReviewedAt: now.toISOString(),
    mastered: outcome !== 'again' && interval >= MASTER_INTERVAL,
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

/** Approximate number of on-time correct reviews still needed to graduate. */
export function reviewsUntilMastered(p: WordProgress | undefined): number {
  if (p?.mastered) return 0;
  let s = legacyStability(p) ?? 0;
  let d = p?.difficulty ?? initDifficulty(3);
  let steps = 0;
  while (steps < 20) {
    if (s <= 0) {
      s = initStability(3);
      d = initDifficulty(3);
    } else {
      // Reviewing exactly on time means R = DESIRED_RETENTION.
      s = stabilityOnSuccess(d, s, DESIRED_RETENTION, 3);
      d = nextDifficulty(d, 3);
    }
    steps++;
    if (intervalFor(s) >= MASTER_INTERVAL) return steps;
  }
  return steps;
}
