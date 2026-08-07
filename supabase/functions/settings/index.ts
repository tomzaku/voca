// The `settings` resource — one row per user, holding everything the app
// remembers about them that isn't word progress: onboarding choices, companion,
// reminder preferences, and the learning streak.
//
//   GET   /settings                    → { settings }
//   PATCH /settings         { … }      → { settings }   only the keys you send
//   POST  /settings/streak  { day }    → { settings }   counts today, once
//
// Six client modules used to read and upsert this row directly, each with its
// own idea of which columns it owned. Two of them saving at once could undo
// each other, because an upsert writes every column in its payload. PATCH here
// writes only the keys the caller actually sent, so companion and reminders
// can be saved in the same second without a fight.
//
// The streak is not patchable: it moves through record_learning_day, which
// enforces "one day counts once" in SQL. A client that could set streak_count
// could set it to anything.
//
// Deploy: `supabase functions deploy settings`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';
import { fromSettings, SELECT, toSettings } from '../_shared/settings.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** The caller's row, or nulls when they've never saved anything. */
async function read(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('user_settings')
    .select(SELECT)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return toSettings(data as Record<string, unknown> | null);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('settings') + 1).join('/');
  const route = `${req.method} /${sub}`;
  if (!['GET /', 'PATCH /', 'POST /streak'].includes(route)) {
    return jsonResponse(404, { error: 'Not found' });
  }

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;
  const userId = auth.user.id;

  try {
    if (route === 'GET /') return jsonResponse(200, { settings: await read(db, userId) });

    let body: Record<string, unknown>;
    try {
      body = (await req.json() ?? {}) as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body.' });
    }

    if (route === 'PATCH /') {
      const patch = fromSettings(body);
      // Nothing recognised — a no-op, not an error, so an older client sending
      // only fields this deploy doesn't know still gets its settings back.
      if (Object.keys(patch).length) {
        const { error } = await db
          .from('user_settings')
          .upsert(
            { user_id: userId, ...patch, updated_at: new Date().toISOString() },
            // Merge onto the existing row instead of replacing it: the columns
            // this patch doesn't name — including api_keys_encrypted, which the
            // client can't even see — must survive untouched.
            { onConflict: 'user_id' },
          );
        if (error) throw new Error(error.message);
      }
      return jsonResponse(200, { settings: await read(db, userId) });
    }

    // POST /streak — "I studied today". The date is the caller's local day, so
    // the streak follows the learner's calendar rather than UTC's.
    const day = body.day;
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return jsonResponse(400, { error: '"day" must be a YYYY-MM-DD date.' });
    }
    const { error } = await db.rpc('record_learning_day', { p_local_date: day });
    if (error) throw new Error(error.message);
    // The function's own return is read back through the same mapping, so a
    // streak looks identical however the client obtained it.
    return jsonResponse(200, { settings: await read(db, userId) });
  } catch (err) {
    console.error('[settings]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
});
