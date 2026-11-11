// Shared pieces of the `grammar` resource: row mapping, input validation, and
// the pass mark. Routing lives in grammar/index.ts.

import { BadRequest } from './ai.ts';

/** A score at or above this completes a lesson (its tick and "Up next" moving on).
 *  Mirrored as PASS_SCORE in src/lib/grammarApi.ts, which grades a round
 *  offline before the server has seen it — change both. */
export const PASS_SCORE = 70;

/** Out of 100 is the largest: the client replays an offline best score as
 *  `{ correct: best, total: 100 }` (useGrammarProgress.sync). */
const MAX_TOTAL = 100;

const LESSON_ID = /^[a-z0-9-]{1,60}$/;

export const SELECT = 'lesson_id, best_score, last_score, attempts, completed_at, updated_at';

/** A row in the client's shape. */
export function toGrammarProgress(r: Record<string, unknown>) {
  return {
    lessonId: r.lesson_id as string,
    bestScore: r.best_score as number,
    lastScore: r.last_score as number,
    attempts: r.attempts as number,
    completedAt: (r.completed_at as string | null) ?? null,
    updatedAt: r.updated_at as string,
  };
}

export function isLessonId(v: unknown): v is string {
  return typeof v === 'string' && LESSON_ID.test(v);
}

/** `{ lessonId, correct, total }` → a validated attempt with its 0–100 score. */
export function readAttempt(body: Record<string, unknown>): { lessonId: string; score: number } {
  const { lessonId, correct, total } = body;
  if (!isLessonId(lessonId)) throw new BadRequest('"lessonId" must be a lesson slug.');
  if (!Number.isInteger(total) || (total as number) < 1 || (total as number) > MAX_TOTAL) {
    throw new BadRequest(`"total" must be a whole number from 1 to ${MAX_TOTAL}.`);
  }
  if (!Number.isInteger(correct) || (correct as number) < 0 || (correct as number) > (total as number)) {
    throw new BadRequest('"correct" must be a whole number from 0 to "total".');
  }
  return { lessonId, score: Math.round(((correct as number) / (total as number)) * 100) };
}
