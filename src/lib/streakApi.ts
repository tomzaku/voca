// Client for the `streak` resource — consecutive days of study.
//
//   GET  /streak          → { streak }
//   POST /streak { day }  → { streak }   counts that day, once
//
// Separate from `settings` because a streak is earned, not chosen: the server
// owns the number and the client can only ask to advance it. There is no way
// to set it.
//
// Quiet: the store keeps the last known value, and a failed call leaves the
// displayed streak alone rather than resetting it to zero.

import { request } from './api';

export interface Streak {
  count: number;
  longest: number;
  /** YYYY-MM-DD in the learner's own timezone, or null if never studied. */
  lastActiveDay: string | null;
}

/** The user's streak, or null if it can't be reached. */
export async function fetchStreak(): Promise<Streak | null> {
  const res = await request.get<{ streak: Streak }>('/streak', { quiet: true });
  return res?.streak ?? null;
}

/**
 * Count a day of study towards the streak, and get the result back. `day` is
 * the caller's LOCAL date (YYYY-MM-DD) so the streak follows the learner's
 * calendar, not UTC's. Counting the same day twice is a no-op server-side.
 */
export async function recordLearningDay(day: string): Promise<Streak | null> {
  const res = await request.post<{ streak: Streak }>('/streak', { day }, { quiet: true });
  return res?.streak ?? null;
}
