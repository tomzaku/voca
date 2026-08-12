// The `quizzes` resource — a teacher saves a quiz, students take it via a
// link, and every attempt is recorded for the teacher to review.
//
//   GET  /quizzes                → { quizzes }   the caller's own, newest first
//   POST /quizzes                → { quiz }      { title, config, wordData, requireAuth }
//   GET  /quizzes/:id            → { quiz }      anyone with the link
//   GET  /quizzes/:id/attempts   → { attempts }  the quiz's owner only
//   POST /quizzes/:id/attempts   → { ok }        a finished attempt
//
// TWO ROUTES ARE OPEN TO STRANGERS: reading a quiz, and recording an attempt.
// That's the point of a share link, and the row-level policies already say so
// ("read quizzes" is `using (true)`; an anonymous attempt is allowed only when
// the quiz has require_auth = false). So this function does NOT demand a user
// on those two — it forwards whatever Authorization it was given and lets the
// policies decide. The other three take the caller's id from their session.
//
// `student_id` is never read from the body: signed in, an attempt is yours;
// signed out, it's anonymous. A client can't file an attempt under someone else.
//
// Deploy: `supabase functions deploy quizzes`

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_TITLE = 120;
const MAX_NAME = 80;

/**
 * A client carrying the caller's credentials, whoever they are. With no
 * Authorization header the policies see an anonymous visitor — which is
 * exactly what a student following a link is.
 */
function callerClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    },
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toQuiz(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    title: (r.title as string | null) ?? null,
    config: r.config,
    wordData: r.words_data ?? {},
    requireAuth: Boolean(r.require_auth),
    createdAt: r.created_at as string,
  };
}

function toAttempt(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    quizId: r.quiz_id as string,
    studentId: (r.student_id as string | null) ?? null,
    studentName: r.student_name as string,
    score: (r.score as number | null) ?? 0,
    total: (r.total as number | null) ?? 0,
    answers: Array.isArray(r.answers) ? r.answers : [],
    durationSec: (r.duration_sec as number | null) ?? 0,
    createdAt: r.created_at as string,
  };
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0);

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const path = parts.slice(parts.lastIndexOf('quizzes') + 1);
  const [id, sub] = path;
  if (id !== undefined && !UUID.test(id)) return jsonResponse(404, { error: 'Not found' });

  const body = async () => {
    try {
      return (await req.json() ?? {}) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  try {
    // ── Open to strangers: read one quiz, file one attempt ──────────
    if (id && sub === undefined && req.method === 'GET') {
      const { data, error } = await callerClient(req)
        .from('quizzes').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return jsonResponse(404, { error: 'Quiz not found.' });
      return jsonResponse(200, { quiz: toQuiz(data) });
    }

    if (id && sub === 'attempts' && req.method === 'POST') {
      const b = await body();
      if (!b) return jsonResponse(400, { error: 'Invalid JSON body.' });
      // Signed in, the attempt is yours; signed out, it's anonymous — and the
      // insert policy only permits that when the quiz allows it.
      const auth = await requireUser(req);
      const name = typeof b.studentName === 'string' && b.studentName.trim()
        ? b.studentName.trim().slice(0, MAX_NAME)
        : 'Anonymous';
      const { error } = await callerClient(req).from('quiz_attempts').insert({
        quiz_id: id,
        student_id: auth?.user.id ?? null,
        student_name: name,
        score: num(b.score),
        total: num(b.total),
        answers: Array.isArray(b.answers) ? b.answers : [],
        duration_sec: num(b.durationSec),
      });
      if (error) throw new Error(error.message);
      return jsonResponse(200, { ok: true });
    }

    // ── Everything else needs a signed-in caller ────────────────────
    const auth = await requireUser(req);
    if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
    const db = auth.supabase;

    if (id === undefined && req.method === 'GET') {
      const { data, error } = await db
        .from('quizzes')
        .select('*')
        .eq('owner_id', auth.user.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return jsonResponse(200, { quizzes: (data ?? []).map(toQuiz) });
    }

    if (id === undefined && req.method === 'POST') {
      const b = await body();
      if (!b) return jsonResponse(400, { error: 'Invalid JSON body.' });
      if (!b.config || typeof b.config !== 'object') {
        return jsonResponse(400, { error: '"config" is required.' });
      }
      const title = typeof b.title === 'string' && b.title.trim()
        ? b.title.trim().slice(0, MAX_TITLE)
        : null;
      const { data, error } = await db
        .from('quizzes')
        .insert({
          owner_id: auth.user.id,
          title,
          config: b.config,
          words_data: b.wordData ?? {},
          require_auth: b.requireAuth === true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return jsonResponse(200, { quiz: toQuiz(data) });
    }

    // Owner only — the read policy on quiz_attempts sees to that.
    if (id && sub === 'attempts' && req.method === 'GET') {
      const { data, error } = await db
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return jsonResponse(200, { attempts: (data ?? []).map(toAttempt) });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    console.error('[quizzes]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
