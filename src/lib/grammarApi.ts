// Client for the `grammar` resource — progress through the Grammar course.
//
//   GET    /grammar     ?after=&limit=                 → { progress, hasMore, cursor }
//   POST   /grammar     { lessonId, correct, total }   → { record }
//
// Quiet throughout: the device keeps its own copy (useGrammarProgress), so a
// failed call — offline, signed out — just means the server catches up later.

import { request } from './api';

/** Mirrors PASS_SCORE in supabase/functions/_shared/grammar.ts, so a round
 *  can be graded before (or without) the server — change both. */
export const PASS_SCORE = 70;

export interface GrammarProgress {
  lessonId: string;
  bestScore: number;
  lastScore: number;
  attempts: number;
  /** ISO time the lesson was first passed; null until then. */
  completedAt: string | null;
  updatedAt: string;
}

interface Page {
  progress: GrammarProgress[];
  hasMore: boolean;
  cursor: string | null;
}

/** Every lesson this user has practised, or null when the server can't be reached. */
export async function fetchGrammarProgress(): Promise<GrammarProgress[] | null> {
  const all: GrammarProgress[] = [];
  let after: string | undefined;
  // The course is a few dozen lessons, so this is one page in practice; the
  // cap only stops a misbehaving cursor from looping forever.
  for (let i = 0; i < 20; i++) {
    const page = await request.get<Page>('/grammar', { params: { after }, quiet: true });
    if (!page) return null;
    all.push(...page.progress);
    if (!page.hasMore || !page.cursor) return all;
    after = page.cursor;
  }
  return all;
}

/** Record one practice round. The server scores it and decides completion. */
export async function saveGrammarAttempt(lessonId: string, correct: number, total: number): Promise<GrammarProgress | null> {
  const res = await request.post<{ record: GrammarProgress }>('/grammar', { lessonId, correct, total }, { quiet: true });
  return res?.record ?? null;
}
