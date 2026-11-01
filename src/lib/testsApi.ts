// Client for the `tests` resource — a test a collection's owner sends its
// members (supabase/functions/tests). Routes only.
//
// Nothing here is quiet: a test is graded on the server and there's no local
// copy to fall back on, so a failure is shown.

import { request } from './api';
import type { PublicQuestion } from './huntsApi';

export interface TestSummary {
  id: string;
  collectionId: string;
  /** The caller sent it: they see results, not the questions to answer. */
  isOwner: boolean;
  title: string;
  dueAt: string;
  questionCount: number;
  createdAt: string;
  submittedCount: number;
  memberCount: number;
  /** The caller's own submission, once they've handed it in. */
  myResult: { score: number; total: number; submittedAt: string } | null;
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

export interface TestResults {
  test: TestSummary;
  students: { userId: string; name: string; score: number; total: number; submittedAt: string }[];
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

export type Answers = Record<string, string | string[]>;

export async function listTests(collectionId: string): Promise<TestSummary[]> {
  return (await request.get<{ tests: TestSummary[] }>('/tests', { params: { collection: collectionId } })).tests;
}

export async function fetchTest(id: string): Promise<{ test: TestSummary; questions: TestQuestion[]; review: ReviewItem[] | null }> {
  return request.get(`/tests/${id}`);
}

export async function createTest(fields: { collectionId: string; setId: string; title: string; dueAt: string }): Promise<TestSummary> {
  return (await request.post<{ test: TestSummary }>('/tests', fields)).test;
}

export async function updateTest(id: string, fields: { title?: string; dueAt?: string }): Promise<TestSummary> {
  return (await request.patch<{ test: TestSummary }>(`/tests/${id}`, fields)).test;
}

export async function deleteTest(id: string): Promise<void> {
  await request.delete(`/tests/${id}`);
}

export async function submitTest(id: string, answers: Answers): Promise<{ test: TestSummary; review: ReviewItem[] }> {
  return request.post(`/tests/${id}/submit`, { answers });
}

export async function fetchTestResults(id: string): Promise<TestResults> {
  return (await request.get<{ results: TestResults }>(`/tests/${id}/results`)).results;
}

export async function fetchTestImage(id: string, key: string): Promise<string> {
  return (await request.get<{ image: string }>(`/tests/${id}/image`, { params: { key } })).image;
}
