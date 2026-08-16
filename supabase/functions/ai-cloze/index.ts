// Story Gaps: one AI-written paragraph that uses every one of the caller's
// words exactly once, wrapped in `[[ ]]` for the client to turn into blanks.
//
//   POST /ai-cloze { words: string[], learnLang } → { text }   Pro
//
// A fresh generative call every round, so it's Pro-gated like `ai-mindmap`
// and `ai-improve-writing` — the client UI also hides the button, but this is
// the real enforcement.
//
// SECURITY: params are validated below; the system prompt is fixed here and
// never reaches the client. A signed-in user is required and rate-limited.
//
// Deploy: `supabase functions deploy ai-cloze`

import {
  BadRequest,
  type BuiltRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  proGateError,
  reqStr,
  requireUser,
  underRateLimit,
} from '../_shared/ai.ts';

function build(p: Record<string, unknown>): BuiltRequest {
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
    const text = await callProvider(built.system, built.messages, built.maxTokens);
    return jsonResponse(200, { text });
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
}

if (import.meta.main) Deno.serve(handler);
