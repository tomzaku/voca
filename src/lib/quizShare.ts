// Persistence for shared quizzes: a teacher saves a quiz, students take it via
// a link, and each attempt is recorded for the teacher to track. Talks to the
// `quizzes` / `quiz_attempts` tables (see the quizzes migration) via RLS.

import { supabase } from './supabase';
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

export interface AttemptInput {
  quizId: string;
  studentId: string | null;
  studentName: string;
  score: number;
  total: number;
  answers: unknown[];
  durationSec: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToQuiz(r: any): SharedQuiz {
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title ?? null,
    config: r.config as QuizConfig,
    wordData: (r.words_data ?? {}) as Record<string, MiniWordData>,
    requireAuth: Boolean(r.require_auth),
    createdAt: r.created_at,
  };
}

function rowToAttempt(r: any): QuizAttempt {
  return {
    id: r.id,
    quizId: r.quiz_id,
    studentId: r.student_id ?? null,
    studentName: r.student_name,
    score: r.score ?? 0,
    total: r.total ?? 0,
    answers: Array.isArray(r.answers) ? r.answers : [],
    durationSec: r.duration_sec ?? 0,
    createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The shareable student link for a quiz id, honouring the app's base path. */
export function quizLink(id: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${window.location.origin}${base}/quiz/${id}`;
}

/** Save a quiz owned by the current user. Requires sign-in. */
export async function createSharedQuiz(
  config: QuizConfig,
  title: string | null,
  requireAuth: boolean,
): Promise<SharedQuiz> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to share a quiz.');

  // Snapshot word data now (teacher is signed in) so students take the quiz
  // without any further auth-gated word-service calls.
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

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      owner_id: user.id,
      title: title || null,
      config: { ...config, words },
      words_data: wordData,
      require_auth: requireAuth,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToQuiz(data);
}

/** Fetch a quiz by id (readable by anyone with the link). */
export async function fetchSharedQuiz(id: string): Promise<SharedQuiz | null> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('quizzes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToQuiz(data) : null;
}

/** Quizzes owned by the current user, newest first. */
export async function fetchMyQuizzes(): Promise<SharedQuiz[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToQuiz);
}

/** Record a completed attempt. RLS enforces who may insert what. */
export async function recordAttempt(a: AttemptInput): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('quiz_attempts').insert({
    quiz_id: a.quizId,
    student_id: a.studentId,
    student_name: a.studentName,
    score: a.score,
    total: a.total,
    answers: a.answers,
    duration_sec: a.durationSec,
  });
  if (error) throw error;
}

/** All attempts for a quiz (owner only, per RLS), newest first. */
export async function fetchAttempts(quizId: string): Promise<QuizAttempt[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToAttempt);
}
