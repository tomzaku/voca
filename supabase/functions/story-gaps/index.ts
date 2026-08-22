// The `story-gaps` resource — AI-written paragraphs built from a user's own
// vocabulary words, each target word wrapped in [[ ]] for the client to turn
// into a drag-and-drop blank. Pro-only to create (every round is a fresh
// generative call, like `speaking`); free to list/replay, since a stored
// paragraph costs nothing more to read.
//
//   GET    /story-gaps          → { storyGaps }          newest first, capped
//   POST   /story-gaps { words, learnLang } → { storyGap }   Pro
//   DELETE /story-gaps/:id                   → { ok }
//
// Rows are per-user (RLS-scoped, not a shared cache) because the content
// depends on which words this user chose. Written only through the caller's
// own client — user_id comes from the session, never the request body —
// same as `progress` and `speaking`.
//
// Deploy: `supabase functions deploy story-gaps`

import {
  BadRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  proGateError,
  requireUser,
  stripFences,
  underRateLimit,
} from '../_shared/ai.ts';

const MAX_WORDS = 30;
const MAX_LIST = 40;
const UUID = /^[0-9a-f-]{36}$/i;

interface StoryGapRow {
  id: string;
  paragraph: string;
  words: string[];
  learn_lang: string;
  created_at: string;
}

function toStoryGap(r: StoryGapRow) {
  return {
    id: r.id,
    paragraph: r.paragraph,
    words: r.words ?? [],
    learnLang: r.learn_lang,
    createdAt: r.created_at,
  };
}

/** Trimmed, capped word list — same validation as the old `ai-cloze`. */
function normalizeWords(input: unknown): string[] {
  if (!Array.isArray(input)) throw new BadRequest('"words" must be an array.');
  const words = input
    .filter((w): w is string => typeof w === 'string')
    .slice(0, MAX_WORDS)
    .map((w) => w.trim().slice(0, 60))
    .filter(Boolean);
  if (words.length < 2) throw new BadRequest('"words" needs at least 2 entries.');
  return words;
}

function buildPrompt(words: string[], learnLang: string): { system: string; prompt: string; maxTokens: number } {
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
    prompt,
    maxTokens: 600,
  };
}

/** Best-effort parse. Null on anything unusable (too few gaps included), so the caller can retry. */
function parseParagraph(text: string, wordCount: number): string | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    return null;
  }
  const paragraph = typeof parsed.paragraph === 'string' ? parsed.paragraph.trim() : '';
  if (!paragraph) return null;
  const gaps = paragraph.match(/\[\[.+?\]\]/g)?.length ?? 0;
  // Need at least two gaps for a meaningful round — a model that missed most
  // of the target words isn't worth storing.
  if (gaps < Math.min(2, wordCount)) return null;
  return paragraph;
}

/** One retry on a malformed response — the round trip is already paid for. */
async function generate(words: string[], learnLang: string): Promise<string> {
  const built = buildPrompt(words, learnLang);
  let lastText = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    lastText = await callProvider(built.system, [{ role: 'user', content: built.prompt }], built.maxTokens);
    const paragraph = parseParagraph(lastText, words.length);
    if (paragraph) return paragraph;
  }
  console.warn(`[story-gaps] unusable response after retry: ${lastText.slice(0, 200)}`);
  throw new Error('Could not write a story — please try again.');
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const [id] = parts.slice(parts.lastIndexOf('story-gaps') + 1);
  if (id !== undefined && !UUID.test(id)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;

  try {
    if (id === undefined && req.method === 'GET') {
      const { data, error } = await db
        .from('story_gaps')
        .select('id, paragraph, words, learn_lang, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_LIST);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { storyGaps: (data ?? []).map(toStoryGap) });
    }

    if (id === undefined && req.method === 'POST') {
      if (!await underRateLimit(db)) {
        return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
      }
      const denied = await proGateError(db, auth.user.id);
      if (denied) return denied;

      let body: Record<string, unknown>;
      try {
        body = (await req.json() ?? {}) as Record<string, unknown>;
      } catch {
        return jsonResponse(400, { error: 'Invalid JSON body.' });
      }
      const words = normalizeWords(body.words);
      const learnLang = typeof body.learnLang === 'string' && body.learnLang.trim()
        ? body.learnLang.trim().slice(0, 40)
        : 'English';

      let paragraph: string;
      try {
        paragraph = await generate(words, learnLang);
      } catch (err) {
        return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
      }

      const { data, error } = await db
        .from('story_gaps')
        .insert({ user_id: auth.user.id, paragraph, words, learn_lang: learnLang })
        .select('id, paragraph, words, learn_lang, created_at')
        .single();
      if (error) throw new Error(error.message);
      return jsonResponse(200, { storyGap: toStoryGap(data) });
    }

    if (id !== undefined && req.method === 'DELETE') {
      // The delete policy allows only your own rows; a stranger's id simply
      // matches no row, which is the same answer as one that never existed.
      const { error } = await db.from('story_gaps').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    console.error('[story-gaps]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
