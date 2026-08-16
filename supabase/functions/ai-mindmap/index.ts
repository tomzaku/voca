// Pro-only: generates an interactive mind map — a jsMind-style "node_tree"
// JSON document — that groups the caller's saved words into themed branches.
// The generated `mindmap` resource (supabase/functions/mindmap/) caches the
// result so revisiting the same word set doesn't call this twice.
//
//   POST /ai-mindmap { words: string[], motherLang } → { text }   Pro
//
// The AI only groups words into themes and picks emoji — per-word
// definitions are NOT generated here; `enrichMindmapLeaves` injects them from
// `word_cache.short_definition` after the call (populated by the `word`
// function and the backfill script), which keeps this generation small.
//
// SECURITY: params are validated below; the system prompt is fixed here and
// never reaches the client. A signed-in user is required and rate-limited.
//
// Deploy: `supabase functions deploy ai-mindmap`

import {
  BadRequest,
  type BuiltRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  proGateError,
  requireUser,
  serviceClient,
  stripFences,
  underRateLimit,
} from '../_shared/ai.ts';

function build(p: Record<string, unknown>): BuiltRequest {
  if (!Array.isArray(p.words)) throw new BadRequest('"words" must be an array.');
  // `motherLang` only reaches the enrichment step below, never the prompt.
  const words = p.words
    .filter((w): w is string => typeof w === 'string')
    .slice(0, 40)
    .map((w) => w.trim().slice(0, 60))
    .filter(Boolean);
  if (words.length < 2) throw new BadRequest('"words" needs at least 2 entries.');
  const list = words.map((w) => `"${w}"`).join(', ');

  const prompt = `Organize these English vocabulary words into a mind map that helps a learner memorize them: ${list}.

Group the words into ${Math.min(Math.max(Math.ceil(words.length / 5), 2), 8)} (or so) themed branches with short, memorable names (e.g. "Emotions & Attitudes", "Actions & Behavior"). Every input word must appear exactly once, as a leaf node under exactly one branch, spelled EXACTLY as given above.

Return ONLY this JSON (jsMind node_tree format), no markdown, no extra text:
{
  "meta": { "name": "vocabulary-mindmap", "version": "1.0" },
  "format": "node_tree",
  "data": {
    "id": "root",
    "topic": "a short catchy title for the whole map (2-4 words)",
    "emoji": "one emoji for the map",
    "children": [
      {
        "id": "branch-1",
        "topic": "theme name",
        "emoji": "one emoji hinting at the theme",
        "children": [
          {
            "id": "word-<the word>",
            "topic": "<the word exactly as given>",
            "emoji": "one emoji hinting at the word's meaning",
            "children": []
          }
        ]
      }
    ]
  }
}

Do NOT include definitions — they are added separately.`;

  return {
    system: 'You design vocabulary mind maps for language learners. Return ONLY valid JSON matching the requested schema — no markdown fences, no commentary.',
    messages: [{ role: 'user', content: prompt }],
    // Each leaf is a pretty-printed node with a verbose id ("word-self-conscious")
    // and an emoji that can cost 2-3 tokens, so ~60 tokens/word with headroom —
    // 35 clipped larger sets mid-stream.
    maxTokens: Math.min(600 + words.length * 60, 3500),
  };
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use AI features.' });

  if (!await underRateLimit(auth.supabase)) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  const denied = await proGateError(auth.supabase, auth.user.id);
  if (denied) return denied;

  let params: Record<string, unknown>;
  try {
    params = (await req.json() ?? {}) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  let built: BuiltRequest;
  try {
    built = build(params);
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  try {
    let text = await callProvider(built.system, built.messages, built.maxTokens);
    const motherLang = typeof params.motherLang === 'string' ? params.motherLang.slice(0, 40) : '';
    text = await enrichMindmapLeaves(text, motherLang);
    return jsonResponse(200, { text });
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
}

if (import.meta.main) Deno.serve(handler);

/** Accents the mind map will show IPA for, best first. */
const IPA_LOCALES = ['en-US', 'en-GB'];

/** One mind-map leaf, as it comes back from the model and goes out to the client. */
interface Leaf {
  topic?: unknown;
  definition?: unknown;
  translation?: string;
  phonetic?: string;
  example?: string;
}

/**
 * Fill each leaf of a freshly generated mind map from word_cache — definition,
 * mother-tongue translation, IPA and one example — so the client can show any
 * of them without a second round trip.
 *
 * The prompt deliberately asks for NONE of this: the cache is the source of
 * truth (populated by the word function and the backfill scripts), and leaving
 * it out keeps the generation small and stops the model inventing phonetics.
 * A definition the model volunteers anyway is kept and synced back to rows
 * that exist. Best-effort throughout — on any parse or DB hiccup the original
 * text goes back unchanged, and a word the cache has never seen simply renders
 * with fewer lines.
 */
async function enrichMindmapLeaves(text: string, motherLang: string): Promise<string> {
  const svc = serviceClient();
  if (!svc) return text;
  try {
    const parsed = JSON.parse(stripFences(text)) as Record<string, unknown>;
    const root = (parsed?.data ?? parsed) as { children?: unknown } | null;
    const branches = Array.isArray(root?.children) ? root.children : [];
    const leaves: Leaf[] = branches.flatMap((b) =>
      Array.isArray((b as { children?: unknown })?.children) ? (b as { children: [] }).children : [],
    );
    if (leaves.length === 0) return text;

    const keys = [...new Set(
      leaves.map((l) => String(l.topic ?? '').trim().toLowerCase()).filter(Boolean),
    )];
    const { data: rows, error: readErr } = await svc
      .from('word_cache')
      .select('word, short_definition, translations, phonetics, examples')
      .in('word', keys);
    if (readErr) {
      console.warn(`[ai-mindmap] word_cache read error: ${readErr.message}`);
      return text;
    }
    interface Row {
      word: string;
      short_definition: string | null;
      translations: Record<string, string> | null;
      phonetics: Record<string, string> | null;
      examples: string[] | null;
    }
    const cached = new Map(((rows ?? []) as Row[]).map((r) => [r.word, r]));

    const motherKey = motherLang.toLowerCase();
    let filled = 0;
    const bare: string[] = [];
    const updates = new Map<string, string>();
    const counts = { translation: 0, phonetic: 0, example: 0 };

    for (const leaf of leaves) {
      const key = String(leaf.topic ?? '').trim().toLowerCase();
      if (!key) continue;
      const row = cached.get(key);

      const fresh = typeof leaf.definition === 'string' ? leaf.definition.trim().slice(0, 200) : '';
      if (fresh) {
        // Only rows that exist get the update (same policy as doodles).
        if (row && row.short_definition !== fresh) updates.set(key, fresh);
      } else if (row?.short_definition) {
        leaf.definition = row.short_definition;
        filled += 1;
      } else {
        bare.push(key); // no definition anywhere — renders as word + emoji only
      }

      if (!row) continue;
      // Translations are keyed by mother tongue; a word never looked up in this
      // language just has no entry, and no call is made to create one — the map
      // is one generation, not forty.
      const translation = motherKey ? row.translations?.[motherKey] : undefined;
      if (translation) {
        leaf.translation = translation.slice(0, 120);
        counts.translation += 1;
      }
      const ipa = IPA_LOCALES.map((l) => row.phonetics?.[l]).find(Boolean);
      if (ipa) {
        leaf.phonetic = ipa.slice(0, 60);
        counts.phonetic += 1;
      }
      const example = row.examples?.find((e) => typeof e === 'string' && e.trim());
      if (example) {
        leaf.example = example.trim().slice(0, 200);
        counts.example += 1;
      }
    }

    await Promise.all(
      [...updates].map(([word, def]) =>
        svc.from('word_cache').update({ short_definition: def }).eq('word', word),
      ),
    );
    const enriched = filled + counts.translation + counts.phonetic + counts.example;
    console.log(
      `[ai-mindmap] enrich: words=${keys.length} definitions=${filled} translations(${motherKey || 'none'})=${counts.translation} phonetics=${counts.phonetic} examples=${counts.example} syncedToCache=${updates.size}` +
      (bare.length ? ` MISSING_DEF=[${bare.join(', ')}] — run scripts/backfill-short-definitions.mjs` : ''),
    );
    return enriched > 0 ? JSON.stringify(parsed) : text;
  } catch (err) {
    console.warn(`[ai-mindmap] enrich skipped: ${(err as Error).message}`);
    return text;
  }
}
