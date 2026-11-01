// Client for the `tests` resource — a test a collection's owner sends its
// members (supabase/functions/tests). Routes only.
//
// Nothing here is quiet: a test is graded on the server and there's no local
// copy to fall back on, so a failure is shown.

import { request } from './api';
import type { PublicQuestion } from './huntsApi';
import type { TestTheme } from './testThemes';

export interface TestSummary {
  id: string;
  collectionId: string;
  /** The caller sent it: they see results, not the questions to answer. */
  isOwner: boolean;
  title: string;
  dueAt: string;
  /** Students see the top three on the test page. */
  showLeaderboard: boolean;
  /** How the student's screen looks. */
  theme: TestTheme;
  /** Each answer is marked (and locked) the moment it's given. */
  instantFeedback: boolean;
  questionCount: number;
  createdAt: string;
  submittedCount: number;
  memberCount: number;
  /** The caller's own submission, once they've handed it in. */
  myResult: { score: number; total: number; durationMs: number | null; submittedAt: string } | null;
  /** When the caller pressed Start — their clock — or null. */
  startedAt: string | null;
}

export interface TestQuestion extends PublicQuestion {
  id: string;
}

export interface ReviewItem {
  questionId: string;
  given: string;
  correct: boolean;
  /** The right answer — null until the due date passes. */
  answer: string | null;
}

/** An answer marked on the spot, in an instant-feedback test. Locked once given. */
export interface Check {
  questionId: string;
  given: string;
  correct: boolean;
  answer: string;
}

export interface TestResults {
  test: TestSummary;
  /** Best first: score, then time taken, then hand-in time. */
  students: { userId: string; name: string; score: number; total: number; durationMs: number | null; submittedAt: string }[];
  /** Members who haven't handed it in. */
  waiting: { userId: string; name: string }[];
  questions: {
    id: string;
    type: PublicQuestion['type'];
    prompt: string;
    answer: string;
    right: number;
    wrong: number;
    commonWrong: { given: string; count: number }[];
  }[];
}

/** One of the top three hand-ins. `isMe` marks the caller's own. */
export interface Leader {
  name: string;
  score: number;
  total: number;
  /** Time from Start to hand-in; the tie-break. Null for an untimed hand-in. */
  durationMs: number | null;
  isMe: boolean;
}

export type Answers = Record<string, string | string[]>;

export async function listTests(collectionId: string): Promise<TestSummary[]> {
  return (await request.get<{ tests: TestSummary[] }>('/tests', { params: { collection: collectionId } })).tests;
}

/**
 * Starts the caller's clock (the first time only) and hands back the
 * questions, which a student doesn't get before this.
 */
export async function startTest(id: string): Promise<{ test: TestSummary; questions: TestQuestion[]; checked: Check[] }> {
  return request.post(`/tests/${id}/start`);
}

/** "3:07", or "1:02:45" past an hour. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export async function fetchTest(id: string): Promise<{ test: TestSummary; questions: TestQuestion[]; checked: Check[]; review: ReviewItem[] | null; leaderboard: Leader[] }> {
  return request.get(`/tests/${id}`);
}

export async function createTest(fields: {
  collectionId: string;
  setId: string;
  title: string;
  dueAt: string;
  showLeaderboard: boolean;
  theme: TestTheme;
  instantFeedback: boolean;
}): Promise<TestSummary> {
  return (await request.post<{ test: TestSummary }>('/tests', fields)).test;
}

export async function updateTest(id: string, fields: { title?: string; dueAt?: string; showLeaderboard?: boolean; theme?: TestTheme; instantFeedback?: boolean }): Promise<TestSummary> {
  return (await request.patch<{ test: TestSummary }>(`/tests/${id}`, fields)).test;
}

export async function deleteTest(id: string): Promise<void> {
  await request.delete(`/tests/${id}`);
}

/** Marks one answer now and locks it (instant-feedback tests). Asking again returns the first answer. */
export async function checkAnswer(id: string, questionId: string, answer: string | string[]): Promise<Check> {
  return (await request.post<{ check: Check }>(`/tests/${id}/check`, { questionId, answer })).check;
}

export async function submitTest(id: string, answers: Answers): Promise<{ test: TestSummary; review: ReviewItem[]; leaderboard: Leader[] }> {
  return request.post(`/tests/${id}/submit`, { answers });
}

export async function fetchTestResults(id: string): Promise<TestResults> {
  return (await request.get<{ results: TestResults }>(`/tests/${id}/results`)).results;
}

export async function fetchTestImage(id: string, key: string): Promise<string> {
  return (await request.get<{ image: string }>(`/tests/${id}/image`, { params: { key } })).image;
}
