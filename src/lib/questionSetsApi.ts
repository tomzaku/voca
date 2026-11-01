// Client for the `question-sets` resource — a teacher's reusable sets of
// questions (supabase/functions/question-sets). Routes only.
//
// Nothing here is quiet: a set is something the teacher is actively saving or
// opening, so a failure should be seen, not swallowed.

import { request } from './api';
import type { DraftQuestion, EditableQuestion } from './hunt';

export interface SetSummary {
  id: string;
  title: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSet extends SetSummary {
  /** In her order, each with its row id. */
  questions: EditableQuestion[];
}

export async function listSets(): Promise<SetSummary[]> {
  return (await request.get<{ sets: SetSummary[] }>('/question-sets')).sets;
}

export async function fetchSet(id: string): Promise<QuestionSet> {
  return (await request.get<{ set: QuestionSet }>(`/question-sets/${id}`)).set;
}

export async function createSet(title: string, questions: DraftQuestion[]): Promise<QuestionSet> {
  return (await request.post<{ set: QuestionSet }>('/question-sets', { title, questions })).set;
}

/** Replaces the set's title and every question with these. */
export async function saveSet(id: string, title: string, questions: DraftQuestion[]): Promise<QuestionSet> {
  return (await request.put<{ set: QuestionSet }>(`/question-sets/${id}`, { title, questions })).set;
}

export async function deleteSet(id: string): Promise<void> {
  await request.delete(`/question-sets/${id}`);
}
