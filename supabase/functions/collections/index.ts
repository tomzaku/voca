// The `collections` resource — word lists a user owns, and the ones they've
// joined from a shared link.
//
//   GET    /collections            → { mine, joined }
//   POST   /collections            → { collection }   { name, words }
//   GET    /collections/:id        → { collection }   a shared link's target
//   PATCH  /collections/:id        → { collection }   { name?, words?, isPublic? }
//   DELETE /collections/:id        → { ok }
//   POST   /collections/:id/join   → { ok }           counts you as a learner
//   GET    /collections/:id/members → { members }     avatars + per-member progress
//
// Ids are UUIDs, so they sit in the path — unlike a `word`, they can't contain
// a slash or a space.
//
// Everything runs on the caller's RLS-scoped client: the policies on
// `collections` and `collection_members` decide who may see or change what,
// exactly as they did when the browser queried the tables. `owner_id` is taken
// from the session, never the body, so a caller can't create a list owned by
// someone else.
//
// Deploy: `supabase functions deploy collections`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_NAME = 80;
const MAX_WORDS = 2000;

/** Row → the client's shape. Column names stop here. */
function toCollection(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    words: (r.words as string[]) ?? [],
    isPublic: Boolean(r.is_public),
    memberCount: (r.member_count as number | null) ?? 0,
  };
}

/** A word list from a request body: strings only, trimmed, bounded. */
function readWords(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((w): w is string => typeof w === 'string')
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, MAX_WORDS);
}

function readName(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error('"name" is required.');
  return v.trim().slice(0, MAX_NAME);
}

/** Everything the caller can see: what they own, and what they've joined. */
async function list(db: SupabaseClient, userId: string) {
  const [owned, memberships] = await Promise.all([
    db.from('collections').select('*').eq('owner_id', userId).order('created_at', { ascending: true }),
    // Memberships are the durable record of what this user joined (RLS lets a
    // user read only their own rows). The collections themselves come along so
    // they render after a refresh, or on a new device.
    db.from('collection_members').select('collection_id, collections(*)').eq('user_id', userId),
  ]);
  if (owned.error) throw new Error(owned.error.message);
  if (memberships.error) throw new Error(memberships.error.message);

  const joined: ReturnType<typeof toCollection>[] = [];
  for (const row of memberships.data ?? []) {
    // supabase-js types embedded relations loosely (array), but a to-one FK
    // returns an object at runtime — normalize both shapes defensively.
    const raw = (row as Record<string, unknown>).collections;
    const col = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null;
    if (col) joined.push(toCollection(col));
  }
  return { mine: (owned.data ?? []).map(toCollection), joined };
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const path = parts.slice(parts.lastIndexOf('collections') + 1);
  const [id, sub] = path;
  if (id !== undefined && !UUID.test(id)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;
  const userId = auth.user.id;

  const body = async () => {
    try {
      return (await req.json() ?? {}) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid JSON body.');
    }
  };

  try {
    // ── /collections ────────────────────────────────────────────────
    if (id === undefined) {
      if (req.method === 'GET') return jsonResponse(200, await list(db, userId));

      if (req.method === 'POST') {
        const b = await body();
        const { data, error } = await db
          .from('collections')
          .insert({ owner_id: userId, name: readName(b.name), words: readWords(b.words) })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return jsonResponse(200, { collection: toCollection(data) });
      }
      return jsonResponse(404, { error: 'Not found' });
    }

    // ── /collections/:id/join ───────────────────────────────────────
    if (sub === 'join') {
      if (req.method !== 'POST') return jsonResponse(404, { error: 'Not found' });
      // Idempotent server-side: studying a list twice doesn't join it twice.
      const { error } = await db.rpc('join_collection', { cid: id });
      if (error) throw new Error(error.message);
      return jsonResponse(200, { ok: true });
    }

    // ── /collections/:id/members ────────────────────────────────────
    if (sub === 'members') {
      if (req.method !== 'GET') return jsonResponse(404, { error: 'Not found' });
      const { data, error } = await db.rpc('collection_members_progress', { cid: id });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Record<string, unknown>[];
      return jsonResponse(200, {
        members: rows.map((m) => ({
          userId: m.user_id as string,
          displayName: (m.display_name as string | null) ?? null,
          avatarUrl: (m.avatar_url as string | null) ?? null,
          done: (m.done as number | null) ?? 0,
          total: (m.total as number | null) ?? 0,
        })),
      });
    }

    if (sub !== undefined) return jsonResponse(404, { error: 'Not found' });

    // ── /collections/:id ────────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await db.from('collections').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      // Not found and not-allowed-to-see are the same answer on purpose: a
      // private list must not be discoverable by probing ids.
      if (!data) return jsonResponse(404, { error: 'Collection not found.' });
      return jsonResponse(200, { collection: toCollection(data) });
    }

    if (req.method === 'PATCH') {
      const b = await body();
      // Only what was sent, so renaming can't blank the word list.
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ('name' in b) patch.name = readName(b.name);
      if ('words' in b) patch.words = readWords(b.words);
      if ('isPublic' in b) patch.is_public = b.isPublic === true;
      const { data, error } = await db
        .from('collections')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return jsonResponse(404, { error: 'Collection not found.' });
      return jsonResponse(200, { collection: toCollection(data) });
    }

    if (req.method === 'DELETE') {
      const { error } = await db.from('collections').delete().eq('id', id);
      if (error) throw new Error(error.message);
      // Idempotent: deleting a list that's already gone is a success.
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    const message = (err as Error).message ?? '';
    // The validators above throw plain messages meant for the user.
    if (message.startsWith('"') || message === 'Invalid JSON body.') {
      return jsonResponse(400, { error: message });
    }
    console.error('[collections]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
