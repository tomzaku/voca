// The `word-notes` resource — the notes and comments under a word, shared with
// everyone unless the writer marks one private.
//
//   GET    /word-notes ?word=…                        → { notes }
//   POST   /word-notes { word, content, isPrivate? }  → { note }
//   DELETE /word-notes/:id                            → { ok }
//
// `word` is a query parameter (words contain spaces); a note id is a UUID, so
// it sits in the path.
//
// Who may see what is decided by the row-level policy — public notes plus your
// own — so this reads by word alone. The browser used to add the same
// condition itself, with the user's id interpolated into a filter string; the
// policy was doing the real work either way.
//
// `user_id` and the display name come from the session, never the body: a note
// can't be posted under someone else's name.
//
// Deploy: `supabase functions deploy word-notes`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';
import type { User } from 'jsr:@supabase/supabase-js@2';

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_CONTENT = 2000;
const MAX_NOTES = 50;

function toNote(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    word: r.word as string,
    userId: r.user_id as string,
    userName: r.user_name as string,
    content: r.content as string,
    createdAt: r.created_at as string,
    isPrivate: Boolean(r.is_private),
  };
}

/** What to sign a note with: the profile name, else the email's local part. */
function displayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | null;
  const full = typeof meta?.full_name === 'string' ? meta.full_name : '';
  return full || user.email?.split('@')[0] || 'Anonymous';
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const [id] = parts.slice(parts.lastIndexOf('word-notes') + 1);
  if (id !== undefined && !UUID.test(id)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;

  try {
    if (id === undefined && req.method === 'GET') {
      const word = url.searchParams.get('word');
      if (!word) return jsonResponse(400, { error: 'Missing word.' });
      const { data, error } = await db
        .from('word_notes')
        .select('*')
        .eq('word', word)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTES);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { notes: (data ?? []).map(toNote) });
    }

    if (id === undefined && req.method === 'POST') {
      let b: Record<string, unknown>;
      try {
        b = (await req.json() ?? {}) as Record<string, unknown>;
      } catch {
        return jsonResponse(400, { error: 'Invalid JSON body.' });
      }
      const word = typeof b.word === 'string' ? b.word.trim() : '';
      const content = typeof b.content === 'string' ? b.content.trim().slice(0, MAX_CONTENT) : '';
      if (!word) return jsonResponse(400, { error: 'Missing word.' });
      if (!content) return jsonResponse(400, { error: 'A note needs something in it.' });

      const { data, error } = await db
        .from('word_notes')
        .insert({
          word,
          user_id: auth.user.id,
          user_name: displayName(auth.user),
          content,
          is_private: b.isPrivate === true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return jsonResponse(200, { note: toNote(data) });
    }

    if (id !== undefined && req.method === 'DELETE') {
      // The delete policy allows only your own notes; a stranger's id simply
      // matches no row, which is the same answer as one that never existed.
      const { error } = await db.from('word_notes').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    console.error('[word-notes]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
