// Server-side AI proxy for the always-generative features (tutor, dialogues,
// story-gaps, mind maps, translation). Word data lives in its own cache-first
// `word` function — see supabase/functions/word/index.ts.
//
//   POST /ai/cloze          { … }  → { text }   Pro
//   POST /ai/word_dialogues { … }  → { text }
//   POST /ai/translate_word { … }  → { text }
//   POST /ai/tutor_start    { … }  → { text }
//   POST /ai/tutor_reply    { … }  → { text }
//   POST /ai/mindmap        { … }  → { text }   Pro
//   POST /ai/improve_writing { instructions, text } → { text }   Pro
//
// SECURITY: a fixed set of named operations, not a raw prompt passthrough. The
// client may only invoke the routes above with small, validated params — it
// can NOT supply the system prompt or arbitrary conversation. Every system
// prompt and template lives here, server-side. A signed-in user is required,
// and each user is rate-limited.
//
// Configure via `supabase secrets set`:
//   AI_PROVIDER  anthropic | openai | perplexity | google   (default: google)
//   AI_MODEL     optional model override
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / PERPLEXITY_API_KEY / GOOGLE_API_KEY
//   AI_RATE_LIMIT (default 60), AI_RATE_WINDOW_SECONDS (default 60)
//
// Doodle images live in their own `doodles` function — see
// supabase/functions/doodles/index.ts. English conversation practice lives in
// the `chat` function — see supabase/functions/chat/index.ts.
//
// Deploy: `supabase functions deploy ai`

import {
  BadRequest,
  callProvider,
  type ChatMessage,
  corsHeaders,
  jsonResponse,
  proGateError,
  reqStr,
  requireUser,
  sanitizeHistory,
  serviceClient,
  stripFences,
  underRateLimit,
} from '../_shared/ai.ts';

/** What each action builder produces — everything the provider call needs. */
interface BuiltRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
}

// ─── Action registry ────────────────────────────────────────────────
// Each builder validates its own params and returns the exact request. Adding a
// capability means adding one entry here — never widening the client contract.

// Actions in this set additionally require a row in `pro_users` (granted
// manually — see the pro_users migration). Checked in the request handler.
// `cloze` (Story Gaps) writes a fresh AI story on every round, so it's Pro-only
// just like the mind-map actions — the client UI also gates it, but this is the
// real enforcement. (The `chat` function is Pro-only in its entirety.)
// `improve_writing` is a fresh generative call every time too, same reasoning.
const PRO_ACTIONS = new Set(['mindmap', 'cloze', 'improve_writing']);

const ACTIONS: Record<string, (p: Record<string, unknown>) => BuiltRequest> = {
  cloze(p) {
    if (!Array.isArray(p.words)) throw new BadRequest('"words" must be an array.');
    const words = p.words
      .filter((w): w is string => typeof w === 'string')
      .slice(0, 30)
      .map((w) => w.trim().slice(0, 60))
      .filter(Boolean);
    if (words.length < 2) throw new BadRequest('"words" needs at least 2 entries.');
    const learnLang = reqStr(p, 'learnLang', 40);
    const isEnglish = learnLang.toLowerCase() === 'english';
    const list = words.map((w) => `"${w}"`).join(', ');

    const prompt = `Write ONE coherent, engaging paragraph (about ${Math.min(
      Math.max(words.length * 22, 70),
      170,
    )} words) suitable for a language learner.${
      isEnglish ? '' : ` Write the paragraph in ${learnLang}.`
    }

You MUST use each of these vocabulary words exactly once, in a natural context: ${list}.

${
      isEnglish
        ? 'Wrap each of those target words in double square brackets, e.g. she felt [[anxious]] about it.'
        : `For each English word above, use its most natural ${learnLang} equivalent and wrap THAT ${learnLang} word in double square brackets, e.g. [[word]].`
    } Only wrap the ${words.length} target words — nothing else. Do not wrap the same word more than once.

Return this exact JSON (no markdown, no extra text):
{ "paragraph": "the paragraph text with each target word wrapped in [[ ]]" }`;

    return {
      system: 'You write short, engaging vocabulary-practice paragraphs. Return ONLY valid JSON, no markdown, no explanation.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 600,
    };
  },

  word_dialogues(p) {
    const word = reqStr(p, 'word', 100);
    return {
      system: 'You generate short example dialogues for vocabulary learning. Return ONLY the dialogues, no extra text.',
      messages: [{
        role: 'user',
        content: `Create 3 short, natural dialogues (2 lines each) that naturally use the word "${word}".

Format exactly like this:
A: sentence using the word
B: response

A: another use
B: response

A: third use
B: response`,
      }],
      maxTokens: 300,
    };
  },

  translate_word(p) {
    const word = reqStr(p, 'word', 100);
    const targetLang = reqStr(p, 'targetLang', 40);
    return {
      system: 'You are a bilingual vocabulary tutor. Be concise and practical.',
      messages: [{
        role: 'user',
        content: `Translate and explain the English word "${word}" for a ${targetLang} speaker.

Provide:
1. **${targetLang} equivalent** — the most natural translation
2. **Example** — one English sentence with ${targetLang} translation below it
3. **Note** — one brief usage tip in ${targetLang}

Keep it short and practical.`,
      }],
      maxTokens: 250,
    };
  },

  tutor_start(p) {
    const word = reqStr(p, 'word', 100);
    const definition = reqStr(p, 'definition', 1000);
    return {
      system: `You are a friendly vocabulary tutor testing the student on the word "${word}". Definition: ${definition}. Keep replies brief (1-3 sentences). Be warm and encouraging.`,
      messages: [{ role: 'user', content: `Ask the student one engaging question to test their understanding of "${word}". Options: use it in a sentence, describe a situation, or explain it in their own words.` }],
      maxTokens: 150,
    };
  },

  tutor_reply(p) {
    const word = reqStr(p, 'word', 100);
    const definition = reqStr(p, 'definition', 1000);
    const isLast = p.isLast === true;
    const history = sanitizeHistory(p.history, 40, 4000);
    return {
      system: `You are a friendly vocabulary tutor. Word: "${word}". Definition: ${definition}. Be brief (1-3 sentences). ${isLast ? 'This is the final turn — give a warm closing summary.' : ''}`,
      messages: [
        ...history,
        { role: 'user', content: isLast ? 'Give brief closing feedback and summarize what they learned.' : 'Give brief feedback on their answer, then ask one follow-up question.' },
      ],
      maxTokens: 180,
    };
  },

  // Pro-only: interactive mind map of the user's saved words. Returns a
  // jsMind-style "node_tree" JSON document that the WordMindMap component
  // renders. The AI only groups words into themes and picks emoji — per-word
  // definitions are NOT generated here; syncMindmapDefinitions injects them
  // from word_cache.short_definition after the call (populated by the word
  // function and the backfill script), which keeps this generation small.
  mindmap(p) {
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
  },

  // Pro-only: rewrites `text` per a template's `instructions`. The instructions
  // come from either a built-in template or one a user wrote themselves (see
  // the `writing-templates` resource) — either way they're free-form, so unlike
  // every other action here they can't be validated for shape. They travel as
  // user-role *content*, never as `system`: the system prompt stays fixed and
  // server-owned, so the client still can't set what the model is told to be,
  // only what it's asked to do — the same contract every other action keeps.
  improve_writing(p) {
    const instructions = reqStr(p, 'instructions', 2000);
    const text = reqStr(p, 'text', 6000);
    return {
      system: 'You are a professional writing assistant embedded in a language-learning app. Follow the user\'s instructions exactly when revising their text. Reply with the result only — no preamble like "Here\'s the revised version", no restating the request, no "Revised Text" header unless the instructions ask for multiple distinct versions that need labeling. Then, on its own line below a blank line, list each substantive correction — wrong grammar (e.g. subject-verb agreement, tense, wrong word form), wrong word choice, or unclear phrasing — as a Markdown bullet (one bullet per correction, starting with "- "), naming the fix and why, e.g. "- \'are\' → \'am\': subject-verb agreement with \'I\'." That\'s the point of this app, so don\'t skip it. Skip the bullet list only when every fix was purely mechanical — capitalization, stray spacing, a missing period — with nothing to learn from. Keep each bullet to one short line. Format your response in Markdown only where it genuinely helps (e.g. separating multiple requested versions), not as decoration.',
      messages: [{
        role: 'user',
        content: `Instructions for revising the text below:\n${instructions}\n\nText to revise:\n"""\n${text}\n"""`,
      }],
      maxTokens: 1500,
    };
  },
};

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  // The operation is the path — POST /ai/cloze — not a field in the body.
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const action = parts[parts.lastIndexOf('ai') + 1] ?? '';
  if (!(action in ACTIONS)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use AI features.' });

  if (!await underRateLimit(auth.supabase)) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  let params: Record<string, unknown>;
  try {
    params = (await req.json() ?? {}) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  if (PRO_ACTIONS.has(action)) {
    const denied = await proGateError(auth.supabase, auth.user.id);
    if (denied) return denied;
  }

  let built: BuiltRequest;
  try {
    built = ACTIONS[action](params);
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  try {
    let text = await callProvider(built.system, built.messages, built.maxTokens);
    if (action === 'mindmap') {
      const motherLang = typeof params.motherLang === 'string' ? params.motherLang.slice(0, 40) : '';
      text = await enrichMindmapLeaves(text, motherLang);
    }
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
      console.warn(`[mindmap] word_cache read error: ${readErr.message}`);
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
      `[mindmap] enrich: words=${keys.length} definitions=${filled} translations(${motherKey || 'none'})=${counts.translation} phonetics=${counts.phonetic} examples=${counts.example} syncedToCache=${updates.size}` +
      (bare.length ? ` MISSING_DEF=[${bare.join(', ')}] — run scripts/backfill-short-definitions.mjs` : ''),
    );
    return enriched > 0 ? JSON.stringify(parsed) : text;
  } catch (err) {
    console.warn(`[mindmap] enrich skipped: ${(err as Error).message}`);
    return text;
  }
}
