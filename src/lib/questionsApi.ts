// Client for the `questions` resource (supabase/functions/questions): word
// questions for the world's games, made on the server from the collection
// you're studying — and sealed, so this device never holds the answer until
// you've chosen.
//
//   GET  /questions ?count=&collection=    → { questions, collection }
//   POST /questions/check { token, choice, lang } → { correct, answer, reveal }
//
// Quiet: a game without questions just goes on without them (a free bus
// ride, a foul that stands), so a failure is a null, not an error screen.

import { request } from './api';
import { useCollections } from '../hooks/useCollections';
import { getMotherLanguage } from './languages';

export interface WordQuestion {
  /** The answer, sealed — hand it back with the choice. */
  token: string;
  prompt: string;
  options: string[];
}

/** The answered word, explained — any piece not stored for it yet is ''. */
export interface WordReveal {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  /** In the learner's mother tongue. */
  translation: string;
  example: string;
  exampleTranslation: string;
}

export interface AnswerResult {
  correct: boolean;
  answer: string;
  /** Absent from a server older than this field. */
  reveal?: WordReveal;
}

/** From the collection this device is studying — named, so a switch a moment ago counts. */
export async function fetchQuestions(count: number): Promise<WordQuestion[]> {
  const collection = useCollections.getState().activeId;
  const res = await request.get<{ questions: WordQuestion[] }>('/questions', { params: { count, collection }, quiet: true, allowAnon: true });
  return res?.questions ?? [];
}

/** Whether `choice` was right, the answer, and what it means. Null if it couldn't be checked. */
export async function checkAnswer(token: string, choice: string): Promise<AnswerResult | null> {
  return request.post<AnswerResult>('/questions/check', { token, choice, lang: getMotherLanguage() }, { quiet: true, allowAnon: true });
}
