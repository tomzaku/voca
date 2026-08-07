// The `push` resource — this browser's Web Push subscription, so the reminder
// job knows where to send a notification.
//
//   POST   /push  { endpoint, p256dh, auth } → { ok }   register this device
//   DELETE /push  ?endpoint=…                → { ok }   forget this device
//
// One row per (user, endpoint): a person with a laptop and a phone has two.
// The endpoint is the browser's own push URL and is what identifies a device,
// so DELETE takes it as a parameter rather than deleting everything the user
// has registered — signing out of one device shouldn't silence the others.
//
// `user_id` comes from the session, never the body.
//
// Deploy: `supabase functions deploy push`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';

const MAX_LEN = 2000;

const str = (v: unknown): string =>
  typeof v === 'string' ? v.trim().slice(0, MAX_LEN) : '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;

  try {
    if (req.method === 'POST') {
      let body: Record<string, unknown>;
      try {
        body = (await req.json() ?? {}) as Record<string, unknown>;
      } catch {
        return jsonResponse(400, { error: 'Invalid JSON body.' });
      }

      const endpoint = str(body.endpoint);
      const p256dh = str(body.p256dh);
      const authKey = str(body.auth);
      if (!endpoint || !p256dh || !authKey) {
        return jsonResponse(400, { error: 'A subscription needs an endpoint and its keys.' });
      }

      // Re-registering the same browser updates its keys rather than piling up
      // rows — a subscription's keys can be rotated by the browser.
      const { error } = await db.from('push_subscriptions').upsert(
        { user_id: auth.user.id, endpoint, p256dh, auth: authKey },
        { onConflict: 'user_id,endpoint' },
      );
      if (error) throw new Error(error.message);
      return jsonResponse(200, { ok: true });
    }

    if (req.method === 'DELETE') {
      const endpoint = new URL(req.url).searchParams.get('endpoint');
      if (!endpoint) return jsonResponse(400, { error: 'Missing endpoint.' });
      const { error } = await db
        .from('push_subscriptions')
        .delete()
        .eq('user_id', auth.user.id)
        .eq('endpoint', endpoint);
      if (error) throw new Error(error.message);
      // Idempotent: a device that was never registered is already forgotten.
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    console.error('[push]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
});
