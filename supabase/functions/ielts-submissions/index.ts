// The `ielts-submissions` resource — a user's own history of scored IELTS
// Writing attempts.
//
//   GET  /ielts-submissions  ?after=&limit=                    → { submissions, hasMore, cursor }
//   POST /ielts-submissions  { questionId, essay, bandOverall,
//                              bandTask, bandCoherence, bandLexical,
//                              bandGrammar, summary, strengths?,
//                              improvements? }                  → { submission }
//
// `questionId` is an id from the static question bank (src/data/ieltsWriting.ts),
// not a foreign key — that bank is client-side content, the same as IELTS
// Speaking/Dialogue/Podcast, so there's no table for it to reference.
//
// Getting a score costs a Pro-gated AI call (ai-ielts-writing) — once a
// caller has one, saving it here is just storage, so writing isn't Pro-gated
// a second time (same reasoning as `mindmap`'s POST vs. `ai-mindmap`).
// `owner_id` and `word_count` are never taken from the body: the first comes
// from the session, the second is computed from `essay` itself so a client
// can't misreport it.
//
// Paging is keyset on `created_at`, same convention as `progress`.
//
// Deploy: `supabase functions deploy ielts-submissions`

import { BadRequest, corsHeaders, jsonResponse, reqStr, requireUser } from '../_shared/ai.ts';

const DEFAULT_PAGE = 20;
const MAX_PAGE = 50;
const MAX_QUESTION_ID = 100;
const MAX_ESSAY = 8000;
const MAX_SUMMARY = 2000;
const MAX_LIST_ITEM = 300;
const MAX_LIST_ITEMS = 10;
const BAND_MIN = 0;
const BAND_MAX = 9;

function readBand(v: unknown, key: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < BAND_MIN || v > BAND_MAX) {
    throw new BadRequest(`"${key}" must be a number between ${BAND_MIN} and ${BAND_MAX}.`);
  }
  // IELTS bands only ever land on whole or half points.
  return Math.round(v * 2) / 2;
}

function readStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .slice(0, MAX_LIST_ITEMS)
    .map((s) => s.trim().slice(0, MAX_LIST_ITEM));
}

function limitOf(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE;
  return Math.min(Math.floor(n), MAX_PAGE);
}

/** Row → the client's shape. Column names stop here. */
function toSubmission(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    questionId: r.question_id as string,
    essay: r.essay as string,
    wordCount: r.word_count as number,
    bandOverall: r.band_overall as number,
    bandTask: r.band_task as number,
    bandCoherence: r.band_coherence as number,
    bandLexical: r.band_lexical as number,
    bandGrammar: r.band_grammar as number,
    summary: r.summary as string,
    strengths: (r.strengths as string[] | null) ?? [],
    improvements: (r.improvements as string[] | null) ?? [],
    createdAt: r.created_at as string,
  };
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const limit = limitOf(url.searchParams.get('limit'));
      const after = url.searchParams.get('after');

      let q = db
        .from('ielts_submissions')
        .select('*')
        .eq('owner_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (after) q = q.lte('created_at', after);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      return jsonResponse(200, {
        submissions: rows.map(toSubmission),
        hasMore: rows.length === limit,
        cursor: rows.length ? rows[rows.length - 1].created_at : null,
      });
    }

    if (req.method === 'POST') {
      let b: Record<string, unknown>;
      try {
        b = (await req.json() ?? {}) as Record<string, unknown>;
      } catch {
        return jsonResponse(400, { error: 'Invalid JSON body.' });
      }

      const questionId = reqStr(b, 'questionId', MAX_QUESTION_ID);
      const essay = reqStr(b, 'essay', MAX_ESSAY);
      const summary = reqStr(b, 'summary', MAX_SUMMARY);
      const wordCount = essay.split(/\s+/).filter(Boolean).length;

      const { data, error } = await db
        .from('ielts_submissions')
        .insert({
          owner_id: auth.user.id,
          question_id: questionId,
          essay,
          word_count: wordCount,
          band_overall: readBand(b.bandOverall, 'bandOverall'),
          band_task: readBand(b.bandTask, 'bandTask'),
          band_coherence: readBand(b.bandCoherence, 'bandCoherence'),
          band_lexical: readBand(b.bandLexical, 'bandLexical'),
          band_grammar: readBand(b.bandGrammar, 'bandGrammar'),
          summary,
          strengths: readStringList(b.strengths),
          improvements: readStringList(b.improvements),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return jsonResponse(200, { submission: toSubmission(data) });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    console.error('[ielts-submissions]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
