// The `messages` resource — private messages between players in the world.
//
//   POST /messages  { to, text } → { message: { to, text, sentAt } }
//
// Delivered, not stored: the server broadcasts to the recipient's private
// Realtime channel, `inbox:<to>`, which only they can listen on (see the
// world_private_messages migration). If they aren't in the world right now,
// it's gone — the same as saying something in the open chat.
//
// Why a function rather than the client sending to the channel itself: the
// sender is stamped here from the session. A client broadcasting directly could
// put anyone's id in `from`; and there's no INSERT policy on inboxes at all, so
// this is the only way in.
//
// Deploy: `npm run deploy:messages`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';

// The same as the open chat (MAX_CHAT in src/lib/worldLive.ts).
const MAX_TEXT = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A per-instance flood guard: enough for a lively conversation, not for a
// script hammering someone's inbox. Instances are short-lived and many, so
// this is a speed bump, not a quota.
const PER_MINUTE = 30;
const recent = new Map<string, number[]>();
function flooding(userId: string): boolean {
  const now = Date.now();
  const sent = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  sent.push(now);
  recent.set(userId, sent);
  return sent.length > PER_MINUTE;
}

/** The path after `/messages`, deployed (/functions/v1/messages/…) or local. */
function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('messages');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' || subPath(new URL(req.url)) !== '/') return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to send messages.' });

  let body: { to?: unknown; text?: unknown };
  try { body = await req.json(); } catch { return jsonResponse(400, { error: 'Expected a JSON body.' }); }
  const to = typeof body.to === 'string' ? body.to : '';
  const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '';
  if (!UUID.test(to)) return jsonResponse(400, { error: 'Who is this message for?' });
  if (to === auth.user.id) return jsonResponse(400, { error: "That's you." });
  if (!text) return jsonResponse(400, { error: 'The message is empty.' });
  if (flooding(auth.user.id)) return jsonResponse(429, { error: 'Slow down a little.' });

  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) {
    console.error('[messages] SUPABASE_SERVICE_ROLE_KEY is not set');
    return jsonResponse(500, { error: 'Messages are unavailable right now.' });
  }

  const sentAt = new Date().toISOString();
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ topic: `inbox:${to}`, event: 'dm', private: true, payload: { from: auth.user.id, text, sentAt } }],
    }),
  });
  if (!res.ok) {
    console.error('[messages] broadcast failed', res.status, await res.text().catch(() => ''));
    return jsonResponse(500, { error: 'Could not send your message.' });
  }
  return jsonResponse(200, { message: { to, text, sentAt } });
}

if (import.meta.main) Deno.serve(handler);
