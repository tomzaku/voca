// Client for the `questions` resource (supabase/functions/questions): word
// questions for the world's games, made on the server from the collection
// you're studying — and sealed, so this device never holds the answer until
// you've chosen.
//
//   GET  /questions ?count=                → { questions, collection }
//   POST /questions/check { token, choice } → { correct, answer }
//
// Quiet: a game without questions just goes on without them (a free bus
// ride, a foul that stands), so a failure is a null, not an error screen.

import { request } from './api';

export interface WordQuestion {
  /** The answer, sealed — hand it back with the choice. */
  token: string;
  prompt: string;
  options: string[];
}

export async function fetchQuestions(count: number): Promise<WordQuestion[]> {
  const res = await request.get<{ questions: WordQuestion[] }>('/questions', { params: { count }, quiet: true, allowAnon: true });
  return res?.questions ?? [];
}

/** Whether `choice` was right, and the answer. Null if it couldn't be checked. */
export async function checkAnswer(token: string, choice: string): Promise<{ correct: boolean; answer: string } | null> {
  return request.post<{ correct: boolean; answer: string }>('/questions/check', { token, choice }, { quiet: true, allowAnon: true });
}
