// The `messages` resource — private messages between players in the world.
//
//   POST /messages             { to, text } → { message: { to, text, sentAt, kept } }
//   GET  /messages ?with=&after= → { messages, hasMore, cursor }  a conversation with a friend,
//                                  newest first; `after` is the cursor of the page before
//   POST /messages/read         { with }     → { ok }  their messages to you, marked read
//
// Delivered: the server broadcasts to the recipient's private Realtime
// channel, `inbox:<to>`, which only they can listen on (see the
// world_private_messages migration). Between friends it's also KEPT
// (friend_messages), so a friend who wasn't in the world reads it next time;
// to anyone else, if they aren't here right now, it's gone — the same as
// saying something in the open chat. `kept` says which.
//
// Why a function rather than the client sending to the channel itself: the
// sender is stamped here from the session. A client broadcasting directly could
// put anyone's id in `from`; and there's no INSERT policy on inboxes at all, so
// this is the only way in.
//
// Deploy: `npm run deploy:messages`

import { corsHeaders, jsonResponse, requireUser, serviceClient } from '../_shared/ai.ts';

/** A page of a conversation. */
const PAGE = 30;

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

/** Whether two people are friends — and so whether their messages are kept. */
async function friends(db: NonNullable<ReturnType<typeof serviceClient>>, x: string, y: string): Promise<boolean> {
  const [a, b] = x < y ? [x, y] : [y, x];
  const { data, error } = await db.from('friendships').select('status').eq('user_a', a).eq('user_b', b).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.status === 'accepted';
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const route = `${req.method} ${subPath(url)}`;
  if (!['POST /', 'GET /', 'POST /read'].includes(route)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to send messages.' });
  const me = auth.user.id;
  const db = serviceClient();

  // A conversation with a friend, newest first, paged by id.
  if (route === 'GET /') {
    if (!db) return jsonResponse(500, { error: 'Messages are unavailable right now.' });
    const other = url.searchParams.get('with') ?? '';
    if (!UUID.test(other)) return jsonResponse(400, { error: '"with" is required.' });
    const after = Number(url.searchParams.get('after') ?? '');
    let q = db.from('friend_messages')
      .select('id, sender, recipient, text, sent_at')
      .or(`and(sender.eq.${me},recipient.eq.${other}),and(sender.eq.${other},recipient.eq.${me})`)
      .order('id', { ascending: false })
      .limit(PAGE + 1);
    if (Number.isFinite(after) && after > 0) q = q.lt('id', after);
    const { data, error } = await q;
    if (error) {
      console.error('[messages] history', error.message);
      return jsonResponse(500, { error: 'Could not load the conversation.' });
    }
    const rows = (data ?? []) as { id: number; sender: string; recipient: string; text: string; sent_at: string }[];
    const page = rows.slice(0, PAGE);
    return jsonResponse(200, {
      messages: page.map((m) => ({ from: m.sender, to: m.recipient, text: m.text, sentAt: m.sent_at })),
      hasMore: rows.length > PAGE,
      cursor: page.length ? String(page[page.length - 1].id) : null,
    });
  }

  let body: { to?: unknown; text?: unknown; with?: unknown };
  try { body = await req.json(); } catch { return jsonResponse(400, { error: 'Expected a JSON body.' }); }

  if (route === 'POST /read') {
    if (!db) return jsonResponse(500, { error: 'Messages are unavailable right now.' });
    const other = typeof body.with === 'string' ? body.with : '';
    if (!UUID.test(other)) return jsonResponse(400, { error: '"with" is required.' });
    const { error } = await db.from('friend_messages').update({ read_at: new Date().toISOString() })
      .eq('recipient', me).eq('sender', other).is('read_at', null);
    if (error) return jsonResponse(500, { error: 'Could not mark them read.' });
    return jsonResponse(200, { ok: true });
  }

  const to = typeof body.to === 'string' ? body.to : '';
  const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '';
  if (!UUID.test(to)) return jsonResponse(400, { error: 'Who is this message for?' });
  if (to === me) return jsonResponse(400, { error: "That's you." });
  if (!text) return jsonResponse(400, { error: 'The message is empty.' });
  if (flooding(me)) return jsonResponse(429, { error: 'Slow down a little.' });

  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key || !db) {
    console.error('[messages] SUPABASE_SERVICE_ROLE_KEY is not set');
    return jsonResponse(500, { error: 'Messages are unavailable right now.' });
  }

  // Between friends, keep it first: once it's stored it has been sent, even
  // if they're not online for the broadcast.
  let kept = false;
  if (await friends(db, me, to)) {
    const { error } = await db.from('friend_messages').insert({ sender: me, recipient: to, text });
    if (error) {
      console.error('[messages] store', error.message);
      return jsonResponse(500, { error: 'Could not send your message.' });
    }
    kept = true;
  }

  const sentAt = new Date().toISOString();
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ topic: `inbox:${to}`, event: 'dm', private: true, payload: { from: me, text, sentAt } }],
    }),
  });
  if (!res.ok) {
    console.error('[messages] broadcast failed', res.status, await res.text().catch(() => ''));
    if (!kept) return jsonResponse(500, { error: 'Could not send your message.' });
  }
  return jsonResponse(200, { message: { to, text, sentAt, kept } });
}

if (import.meta.main) Deno.serve(handler);
