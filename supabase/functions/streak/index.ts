// The learning streak — consecutive calendar days with at least one graded
// answer, counted in the learner's own timezone.
//
//   GET  /streak          → { streak }
//   POST /streak { day }  → { streak }   counts that day, once
//
// Its own resource rather than part of `settings`: a streak is earned, not
// chosen. Settings are preferences a user edits; this is activity data the
// server owns and the client can only ever ask to advance. Sharing a resource
// with preferences meant a read-only carve-out and a verb hanging off a noun.
//
// The columns happen to live on `user_settings` — that's storage, and it stays
// behind this boundary.
//
// There is no way to *set* the streak. POST records a day of study through
// record_learning_day, which enforces "one day counts once" in SQL; counting
// the same day twice is a no-op. A client that could write the number could
// write anything.
//
// Deploy: `supabase functions deploy streak`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** The caller's streak, zeroed when they've never studied. */
async function read(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('user_settings')
    .select('streak_count, longest_streak, last_active_day')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    count: (data?.streak_count as number | null) ?? 0,
    longest: (data?.longest_streak as number | null) ?? 0,
    lastActiveDay: (data?.last_active_day as string | null) ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('streak') + 1).join('/');
  if (sub !== '' || !['GET', 'POST'].includes(req.method)) {
    return jsonResponse(404, { error: 'Not found' });
  }

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;

  try {
    if (req.method === 'GET') return jsonResponse(200, { streak: await read(db, auth.user.id) });

    let body: Record<string, unknown>;
    try {
      body = (await req.json() ?? {}) as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body.' });
    }

    // The caller's LOCAL day, so the streak follows the learner's calendar
    // rather than UTC's — someone studying at 11pm in Da Nang gets today.
    const day = body.day;
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return jsonResponse(400, { error: '"day" must be a YYYY-MM-DD date.' });
    }

    const { error } = await db.rpc('record_learning_day', { p_local_date: day });
    if (error) throw new Error(error.message);
    // Read back through the same mapping, so a streak looks identical however
    // the client came by it.
    return jsonResponse(200, { streak: await read(db, auth.user.id) });
  } catch (err) {
    console.error('[streak]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
});
