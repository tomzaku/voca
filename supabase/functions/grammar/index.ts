// The `grammar` resource — a learner's progress through the Grammar course.
// The lessons are static content in the app (src/data/grammar.ts); this only
// records how each practice round went.
//
//   GET    /grammar        ?after=&limit=                 → { progress, hasMore, cursor }
//   POST   /grammar        { lessonId, correct, total }   → { record }
//
// POST takes the raw count, not a score or a "passed" flag: the server works
// out the score, keeps the best one, and decides whether the lesson is
// complete, so a client can't mark a lesson done without answering it.
//
// Paging is keyset on lesson_id (the course is a few dozen rows per user, but
// one paging mode for every list — see CLAUDE.md).
//
// Every query runs on the caller's RLS-scoped client; user_id comes from the
// session.
//
// Deploy: `supabase functions deploy grammar`

import { BadRequest, corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';
import { isLessonId, PASS_SCORE, readAttempt, SELECT, toGrammarProgress } from '../_shared/grammar.ts';

const DEFAULT_PAGE = 200;
const MAX_PAGE = 500;

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('grammar') + 1).join('/');
  const route = `${req.method} /${sub}`;
  if (!['GET /', 'POST /'].includes(route)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;

  try {
    if (route === 'GET /') {
      const after = url.searchParams.get('after');
      if (after && !isLessonId(after)) throw new BadRequest('"after" must be a lesson slug.');
      const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_PAGE);
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_PAGE) : DEFAULT_PAGE;

      let query = db.from('grammar_progress').select(SELECT).order('lesson_id').limit(limit + 1);
      if (after) query = query.gt('lesson_id', after);
      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as Record<string, unknown>[];
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit).map(toGrammarProgress);
      return jsonResponse(200, {
        progress: page,
        hasMore,
        cursor: hasMore ? page[page.length - 1].lessonId : null,
      });
    }

    // POST /
    let body: Record<string, unknown>;
    try {
      body = (await req.json() ?? {}) as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body.' });
    }
    const { lessonId, score } = readAttempt(body);

    const { data: prev, error: readErr } = await db
      .from('grammar_progress')
      .select(SELECT)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const now = new Date().toISOString();
    const { data, error } = await db
      .from('grammar_progress')
      .upsert({
        user_id: auth.user.id,
        lesson_id: lessonId,
        best_score: Math.max(score, (prev?.best_score as number | undefined) ?? 0),
        last_score: score,
        attempts: ((prev?.attempts as number | undefined) ?? 0) + 1,
        // Once passed, always passed — a worse retry doesn't take the
        // tick away.
        completed_at: (prev?.completed_at as string | null | undefined) ?? (score >= PASS_SCORE ? now : null),
        updated_at: now,
      }, { onConflict: 'user_id,lesson_id' })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return jsonResponse(200, { record: toGrammarProgress(data as Record<string, unknown>) });
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    console.error('[grammar]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
