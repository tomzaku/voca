// The `mindmap` resource — a server-side cache of previously generated mind
// maps, so revisiting the same word set doesn't spend another `ai` call, and
// a picker can list a user's past maps to reopen without regenerating.
//
//   GET  /mindmap ?motherLang=…                → { mindmaps }
//   GET  /mindmap/lookup ?words=…&motherLang=…  → { tree }
//   POST /mindmap { words, motherLang, tree }   → { id, tree }
//
// `words` is normalized (trimmed, lowercased, sorted) before it's used as
// the lookup/upsert key — the stored `tree` still carries the real word
// text in its leaf topics, so the list route reads word labels back out of
// the tree rather than the normalized key. `owner_id` comes from the
// session, never the body. No DELETE: this is a cache the UI never manages
// directly.
//
// Deploy: `supabase functions deploy mindmap`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';

const MAX_WORDS = 40;
const MAX_WORD_LEN = 100;
const MAX_LANG_LEN = 20;
const MAX_LIST = 30;

function normalizeWords(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_WORDS) return null;
  const words = input.map((w) => (typeof w === 'string' ? w.trim().toLowerCase().slice(0, MAX_WORD_LEN) : ''));
  if (words.some((w) => !w)) return null;
  return [...words].sort();
}

/** The word text behind each leaf of a generated tree, in its original casing. */
function collectWords(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out;
  const { topic, children } = node as { topic?: unknown; children?: unknown };
  const kids = Array.isArray(children) ? children : [];
  if (kids.length === 0) {
    if (typeof topic === 'string') out.push(topic);
    return out;
  }
  for (const child of kids) collectWords(child, out);
  return out;
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts[parts.lastIndexOf('mindmap') + 1];
  if (sub !== undefined && sub !== 'lookup') return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;

  try {
    if (sub === 'lookup' && req.method === 'GET') {
      const motherLang = (url.searchParams.get('motherLang') ?? '').slice(0, MAX_LANG_LEN);
      const words = normalizeWords((url.searchParams.get('words') ?? '').split(',').filter(Boolean));
      if (!words) return jsonResponse(400, { error: 'Missing or invalid "words".' });

      const { data, error } = await db
        .from('mindmaps')
        .select('tree')
        .eq('mother_lang', motherLang)
        .eq('words', words)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return jsonResponse(200, { tree: data?.tree ?? null });
    }

    if (sub === undefined && req.method === 'GET') {
      const motherLang = (url.searchParams.get('motherLang') ?? '').slice(0, MAX_LANG_LEN);
      if (!motherLang) return jsonResponse(400, { error: 'Missing "motherLang".' });

      const { data, error } = await db
        .from('mindmaps')
        .select('id, tree, created_at, updated_at')
        .eq('mother_lang', motherLang)
        .order('updated_at', { ascending: false })
        .limit(MAX_LIST);
      if (error) throw new Error(error.message);
      const mindmaps = (data ?? []).map((r) => ({
        id: r.id as string,
        words: collectWords(r.tree),
        tree: r.tree,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }));
      return jsonResponse(200, { mindmaps });
    }

    if (sub === undefined && req.method === 'POST') {
      let b: Record<string, unknown>;
      try {
        b = (await req.json() ?? {}) as Record<string, unknown>;
      } catch {
        return jsonResponse(400, { error: 'Invalid JSON body.' });
      }
      const motherLang = typeof b.motherLang === 'string' ? b.motherLang.slice(0, MAX_LANG_LEN) : '';
      const words = normalizeWords(b.words);
      if (!words) return jsonResponse(400, { error: 'Missing or invalid "words".' });
      if (!b.tree || typeof b.tree !== 'object') return jsonResponse(400, { error: 'Missing "tree".' });

      const { data, error } = await db
        .from('mindmaps')
        .upsert(
          {
            owner_id: auth.user.id,
            mother_lang: motherLang,
            words,
            tree: b.tree,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'owner_id,mother_lang,words' },
        )
        .select('id, tree')
        .single();
      if (error) throw new Error(error.message);
      return jsonResponse(200, { id: data.id, tree: data.tree });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    console.error('[mindmap]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
