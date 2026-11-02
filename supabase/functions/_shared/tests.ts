// The rules of a collection test — the pure half of the `tests` function,
// kept here so vitest can pin them without a database (see tests.test.ts).
//
// A test is a set of questions; a member answers all of them once and
// submits. Grading is the hunt's own (`isCorrect`), so a question means the
// same thing in a hunt and in a test.
//
// Imports only the hunt rules, which import nothing: vitest and the edge
// function both load this file.

import { givenText, isCorrect, normalize, type StoredQuestion } from './hunts.ts';

export const MAX_TITLE = 80;
/** A due date further out than this is a typo, not a plan. */
export const MAX_DUE_DAYS = 365;
/** Longest single typed answer kept; a matching board's words are each capped. */
export const MAX_GIVEN = 80;

export class Invalid extends Error {}

/** Whether answers are still taken. */
export function isOpen(dueAt: string, now: number): boolean {
  return Date.parse(dueAt) > now;
}

/** A due date from the client: a real moment, in the future, within a year. */
export function cleanDue(v: unknown, now: number): string {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isFinite(t)) throw new Invalid('Pick a due date.');
  if (t <= now) throw new Invalid('The due date has already passed.');
  if (t > now + MAX_DUE_DAYS * 86_400_000) throw new Invalid('Pick a due date within a year.');
  return new Date(t).toISOString();
}

/** One answer as the student sent it, or '' for none — never trusted for its shape. */
export function cleanGiven(v: unknown): string | string[] {
  if (typeof v === 'string') return v.slice(0, MAX_GIVEN);
  if (Array.isArray(v)) return v.slice(0, 12).map((x) => (typeof x === 'string' ? x.slice(0, MAX_GIVEN) : ''));
  return '';
}

export interface Graded {
  questionId: string;
  given: string;
  correct: boolean;
}

/**
 * Every question of the test, graded against what was sent for it. A question
 * left out is a wrong answer with nothing given, so the total is always the
 * test's length, and skipping can't raise a score.
 */
export function grade(questions: StoredQuestion[], answers: unknown): { graded: Graded[]; score: number; total: number } {
  const sent = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers as Record<string, unknown> : {};
  const graded = questions.map((q) => {
    const given = cleanGiven(sent[q.id!]);
    const text = givenText(given);
    return { questionId: q.id!, given: text, correct: text.trim() !== '' && isCorrect(q, given) };
  });
  return { graded, score: graded.filter((g) => g.correct).length, total: questions.length };
}

/** How the class answered one question: right, wrong, and the wrong answers given most. */
export interface Tally {
  right: number;
  wrong: number;
  /** Most common first, at most three. Blank answers count as wrong but aren't listed. */
  commonWrong: { given: string; count: number }[];
}

export function tally(answers: { given: string; correct: boolean }[]): Tally {
  const counts = new Map<string, { given: string; count: number }>();
  let right = 0;
  for (const a of answers) {
    if (a.correct) { right++; continue; }
    const key = normalize(a.given);
    if (!key) continue;
    const c = counts.get(key) ?? { given: a.given.trim(), count: 0 };
    c.count++;
    counts.set(key, c);
  }
  const commonWrong = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  return { right, wrong: answers.length - right, commonWrong };
}

/**
 * Best hand-in first: the higher score, then the quicker, then the earlier.
 * A hand-in with no time (from before the clock existed) is slower than any
 * timed one, so a tie never goes to the student we can't time.
 */
export function rank(
  a: { score: number; duration_ms: number | null; submitted_at: string },
  b: { score: number; duration_ms: number | null; submitted_at: string },
): number {
  return b.score - a.score ||
    (a.duration_ms ?? Infinity) - (b.duration_ms ?? Infinity) ||
    a.submitted_at.localeCompare(b.submitted_at);
}

/** The looks a test can have — the names only; src/lib/testThemes.ts draws them. Mirrors the migration's check. */
export const THEMES = ['classic', 'ocean', 'space', 'jungle', 'candy', 'castle', 'arctic', 'beach', 'sports', 'music', 'farm', 'lunar'] as const;
export type Theme = (typeof THEMES)[number];

export function cleanTheme(v: unknown): Theme {
  if (typeof v === 'string' && (THEMES as readonly string[]).includes(v)) return v as Theme;
  throw new Invalid('Pick a theme.');
}
