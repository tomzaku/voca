// The `friends` resource — asking someone to be your friend, their answer, and
// the list. A friendship needs both: one asks, the other accepts.
//
//   GET    /friends                     → { friends, incoming, outgoing }
//          friends:  { userId, name, avatarUrl, since, unread }[]   unread = their messages you haven't read
//          incoming: { userId, name, avatarUrl, at }[]              asked you
//          outgoing: { userId, name, avatarUrl, at }[]              you asked
//   GET    /friends/status ?ids=a,b,…   → { statuses: { [id]: 'none' | 'friends' | 'sent' | 'received' | 'you' } }
//          for the "Add friend" buttons on a list of people (at most 100 ids)
//   POST   /friends        { userId }   → { status }  ask — or, if they'd already asked you, accept
//   POST   /friends/accept { userId }   → { status }  accept their request
//   DELETE /friends ?userId=            → { ok }      unfriend, decline, or take back a request; idempotent
//
// The tables carry no row-level policies (see the friends migration): this
// function holds the service role, and the caller is always taken from the
// session — never the body.
//
// Deploy: `npm run deploy:friends`

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, requireUser, serviceClient } from '../_shared/ai.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Friends and open requests together — a bound on a list, not a social rule. */
const MAX_CONNECTIONS = 300;
const MAX_STATUS_IDS = 100;

type Status = 'none' | 'friends' | 'sent' | 'received' | 'you';

interface Row {
  user_a: string;
  user_b: string;
  requested_by: string;
  status: 'pending' | 'accepted';
  created_at: string;
  accepted_at: string | null;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** The pair's row key, in order. */
const pair = (x: string, y: string) => (x < y ? { user_a: x, user_b: y } : { user_a: y, user_b: x });
const other = (r: Row, me: string) => (r.user_a === me ? r.user_b : r.user_a);

function statusOf(r: Row | undefined, me: string): Status {
  if (!r) return 'none';
  if (r.status === 'accepted') return 'friends';
  return r.requested_by === me ? 'sent' : 'received';
}

async function profiles(db: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, { name: string; avatarUrl: string | null }>();
  const { data, error } = await db.rpc('user_profiles', { ids });
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as { user_id: string; display_name: string | null; avatar_url: string | null }[])
    .map((p) => [p.user_id, { name: p.display_name ?? 'Learner', avatarUrl: p.avatar_url }]));
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('friends') + 1).join('/');

  const db = serviceClient();
  if (!db) return jsonResponse(500, { error: 'The server is missing its service key.' });
  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to add friends.' });
  const me = auth.user.id;

  const body = async (): Promise<Record<string, unknown>> => {
    try {
      const b = await req.json();
      if (b && typeof b === 'object' && !Array.isArray(b)) return b as Record<string, unknown>;
    } catch { /* fall through */ }
    throw new HttpError(400, 'Invalid JSON body.');
  };

  /** Someone else's id from the request — checked to be a real person. */
  const someone = async (v: unknown): Promise<string> => {
    const id = typeof v === 'string' ? v : '';
    if (!UUID.test(id)) throw new HttpError(400, '"userId" is required.');
    if (id === me) throw new HttpError(400, 'That’s you.');
    if (!(await profiles(db, [id])).has(id)) throw new HttpError(404, 'No such learner.');
    return id;
  };

  const rowWith = async (them: string): Promise<Row | undefined> => {
    const k = pair(me, them);
    const { data, error } = await db.from('friendships').select('*').eq('user_a', k.user_a).eq('user_b', k.user_b).maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? undefined) as Row | undefined;
  };

  const mine = async (): Promise<Row[]> => {
    const { data, error } = await db
      .from('friendships')
      .select('*')
      .or(`user_a.eq.${me},user_b.eq.${me}`)
      .limit(MAX_CONNECTIONS + 50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  };

  const accept = async (them: string) => {
    const k = pair(me, them);
    const { error } = await db.from('friendships')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('user_a', k.user_a).eq('user_b', k.user_b);
    if (error) throw new Error(error.message);
  };

  try {
    const route = `${req.method} ${sub}`.trim();
    switch (route) {
      case 'GET': {
        const rows = await mine();
        const ids = rows.map((r) => other(r, me));
        const [names, unread] = await Promise.all([
          profiles(db, ids),
          db.from('friend_messages').select('sender').eq('recipient', me).is('read_at', null).limit(2000),
        ]);
        if (unread.error) throw new Error(unread.error.message);
        const unreadBy = new Map<string, number>();
        for (const m of unread.data ?? []) unreadBy.set(m.sender as string, (unreadBy.get(m.sender as string) ?? 0) + 1);
        const person = (id: string) => ({ userId: id, name: names.get(id)?.name ?? 'Learner', avatarUrl: names.get(id)?.avatarUrl ?? null });
        const friends = rows.filter((r) => r.status === 'accepted')
          .map((r) => ({ ...person(other(r, me)), since: r.accepted_at ?? r.created_at, unread: unreadBy.get(other(r, me)) ?? 0 }))
          .sort((a, b) => b.unread - a.unread || a.name.localeCompare(b.name));
        const pending = rows.filter((r) => r.status === 'pending');
        return jsonResponse(200, {
          friends,
          incoming: pending.filter((r) => r.requested_by !== me).map((r) => ({ ...person(other(r, me)), at: r.created_at })),
          outgoing: pending.filter((r) => r.requested_by === me).map((r) => ({ ...person(other(r, me)), at: r.created_at })),
        });
      }

      case 'GET status': {
        const ids = [...new Set((url.searchParams.get('ids') ?? '').split(',').filter((x) => UUID.test(x)))].slice(0, MAX_STATUS_IDS);
        const rows = await mine();
        const byOther = new Map(rows.map((r) => [other(r, me), r]));
        const statuses: Record<string, Status> = {};
        for (const id of ids) statuses[id] = id === me ? 'you' : statusOf(byOther.get(id), me);
        return jsonResponse(200, { statuses });
      }

      case 'POST': {
        const them = await someone((await body()).userId);
        const row = await rowWith(them);
        if (row?.status === 'accepted') return jsonResponse(200, { status: 'friends' });
        if (row && row.requested_by === them) {
          // They'd already asked: asking back is saying yes.
          await accept(them);
          return jsonResponse(200, { status: 'friends' });
        }
        if (row) return jsonResponse(200, { status: 'sent' });
        if ((await mine()).length >= MAX_CONNECTIONS) {
          return jsonResponse(400, { error: `You can have up to ${MAX_CONNECTIONS} friends and requests.` });
        }
        const { error } = await db.from('friendships').insert({ ...pair(me, them), requested_by: me });
        // Two people asking each other at the same instant: the other insert won.
        if (error && error.code !== '23505') throw new Error(error.message);
        return jsonResponse(200, { status: statusOf(await rowWith(them), me) });
      }

      case 'POST accept': {
        const them = await someone((await body()).userId);
        const row = await rowWith(them);
        if (row?.status === 'accepted') return jsonResponse(200, { status: 'friends' });
        if (!row || row.requested_by !== them) return jsonResponse(404, { error: 'There’s no request from them to accept.' });
        await accept(them);
        return jsonResponse(200, { status: 'friends' });
      }

      case 'DELETE': {
        const id = url.searchParams.get('userId') ?? '';
        if (!UUID.test(id)) return jsonResponse(400, { error: '"userId" is required.' });
        const k = pair(me, id);
        const { error } = await db.from('friendships').delete().eq('user_a', k.user_a).eq('user_b', k.user_b);
        if (error) throw new Error(error.message);
        return jsonResponse(200, { ok: true });
      }

      default:
        return jsonResponse(404, { error: 'Not found' });
    }
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse(err.status, { error: err.message });
    console.error('[friends]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
