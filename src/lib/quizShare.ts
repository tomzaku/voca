// Shared quizzes: a teacher saves a quiz, students take it via a link, and each
// attempt is recorded for the teacher to track. Talks to the `quizzes` resource
// (supabase/functions/quizzes) — never to the tables.
//
// Two calls pass `allowAnon`: opening a quiz and filing an attempt. A student
// following a share link may not have an account, which is the whole point of
// the link, and the row-level policies decide what an anonymous visitor may do.

import { request } from './api';
import { generateWordData } from './wordService';
import type { QuizConfig } from './quizConfig';

/** The slice of a word's data a quiz needs to build its questions. Snapshotted
 *  into the quiz so students (even anonymous ones) never call the word service. */
export interface MiniWordData {
  definition: string;
  examples: string[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface SharedQuiz {
  id: string;
  ownerId: string;
  title: string | null;
  config: QuizConfig;
  wordData: Record<string, MiniWordData>;
  requireAuth: boolean;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string | null;
  studentName: string;
  score: number;
  total: number;
  answers: unknown[]; // stored QuizRunner Answer[] — cast where rendered
  durationSec: number;
  createdAt: string;
}

/** No studentId: the server takes it from the session, or files it anonymously. */
export interface AttemptInput {
  quizId: string;
  studentName: string;
  score: number;
  total: number;
  answers: unknown[];
  durationSec: number;
}

/** The shareable student link for a quiz id, honouring the app's base path. */
export function quizLink(id: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${window.location.origin}${base}/quiz/${id}`;
}

/**
 * Save a quiz owned by the current user. Requires sign-in.
 *
 * The word data is snapshotted here, while the teacher is signed in, so a
 * student never needs an auth-gated word-service call to take the quiz.
 */
export async function createSharedQuiz(
  config: QuizConfig,
  title: string | null,
  requireAuth: boolean,
): Promise<SharedQuiz> {
  const wordData: Record<string, MiniWordData> = {};
  await Promise.all(
    config.words.map(async (w) => {
      try {
        const d = await generateWordData(w);
        wordData[w] = { definition: d.definition, examples: d.examples ?? [], synonyms: d.synonyms, antonyms: d.antonyms };
      } catch { /* skip words that fail to resolve */ }
    }),
  );
  // Only keep words we actually captured data for.
  const words = config.words.filter((w) => wordData[w]);
  if (words.length < 2) throw new Error('Could not prepare enough words for this quiz.');

  const { quiz } = await request.post<{ quiz: SharedQuiz }>('/quizzes', {
    title,
    config: { ...config, words },
    wordData,
    requireAuth,
  });
  return quiz;
}

/** Fetch a quiz by id — readable by anyone with the link, signed in or not. */
export async function fetchSharedQuiz(id: string): Promise<SharedQuiz | null> {
  const res = await request.get<{ quiz: SharedQuiz }>(`/quizzes/${id}`, {
    allowAnon: true,
    quiet: true,
  });
  return res?.quiz ?? null;
}

/** Quizzes owned by the current user, newest first. */
export async function fetchMyQuizzes(): Promise<SharedQuiz[]> {
  const { quizzes } = await request.get<{ quizzes: SharedQuiz[] }>('/quizzes');
  return quizzes ?? [];
}

/**
 * Record a completed attempt. Throws, so a student sees that their score
 * didn't save rather than assuming it did.
 *
 * `studentId` isn't sent: the server takes it from the session, or files the
 * attempt anonymously. Which quizzes accept an anonymous attempt is a policy
 * decision, not the client's.
 */
export async function recordAttempt(a: AttemptInput): Promise<void> {
  await request.post(`/quizzes/${a.quizId}/attempts`, {
    studentName: a.studentName,
    score: a.score,
    total: a.total,
    answers: a.answers,
    durationSec: a.durationSec,
  }, { allowAnon: true });
}

/** All attempts for a quiz (owner only, per the policies), newest first. */
export async function fetchAttempts(quizId: string): Promise<QuizAttempt[]> {
  const { attempts } = await request.get<{ attempts: QuizAttempt[] }>(`/quizzes/${quizId}/attempts`);
  return attempts ?? [];
}
