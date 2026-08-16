// Client for the `ielts-submissions` resource — a user's own history of
// scored IELTS Writing attempts.
//
//   GET  /ielts-submissions ?after=&limit=  → { submissions, hasMore, cursor }
//   POST /ielts-submissions                 → { submission }
//
// Reading is quiet (an empty history reads the same as "couldn't load one" —
// there's a local fallback of just not showing history). Saving a submission
// throws: if it fails, the score the user just got would otherwise silently
// vanish, which is worse than a toast.

import { request } from './api';

export interface IeltsSubmission {
  id: string;
  questionId: string;
  essay: string;
  wordCount: number;
  bandOverall: number;
  bandTask: number;
  bandCoherence: number;
  bandLexical: number;
  bandGrammar: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  createdAt: string;
}

export interface IeltsSubmissionPage {
  submissions: IeltsSubmission[];
  hasMore: boolean;
  cursor: string | null;
}

export async function listIeltsSubmissions(after?: string, limit?: number): Promise<IeltsSubmissionPage> {
  const res = await request.get<IeltsSubmissionPage>('/ielts-submissions', {
    params: { after, limit },
    quiet: true,
  });
  return res ?? { submissions: [], hasMore: false, cursor: null };
}

export interface SaveIeltsSubmissionInput {
  questionId: string;
  essay: string;
  bandOverall: number;
  bandTask: number;
  bandCoherence: number;
  bandLexical: number;
  bandGrammar: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export async function saveIeltsSubmission(input: SaveIeltsSubmissionInput): Promise<IeltsSubmission> {
  const res = await request.post<{ submission: IeltsSubmission }>('/ielts-submissions', input);
  return res.submission;
}
