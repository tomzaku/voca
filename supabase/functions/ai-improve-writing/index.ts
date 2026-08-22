// Pro-only: rewrites `text` per a template's `instructions`. The instructions
// come from either a built-in template or one a user wrote themselves (see
// the `writing-templates` resource) — either way they're free-form, so unlike
// every other `ai-*` function they can't be validated for shape. They travel
// as user-role *content*, never as `system`: the system prompt stays fixed
// and server-owned, so the client still can't set what the model is told to
// be, only what it's asked to do.
//
//   POST /ai-improve-writing { instructions, text, categories? } → { text }   Pro
//
// `categories` (subset of grammar/vocabulary/rephrase, default: all) trims
// which correction categories the model is asked for. `text` in the response
// is a JSON string: { options: [{ text, corrections: WritingCorrection[] }, …] }
// — corrections are scoped to each option, not shared, since the two options
// are meaningfully different revisions and don't necessarily change the same
// things. Parsed client-side by src/lib/improveWritingResult.ts.
//
// Deploy: `supabase functions deploy ai-improve-writing`

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

/** The correction taxonomy — matches the "learnings" categories English Practice already uses. */
const CORRECTION_CATEGORIES = ['grammar', 'vocabulary', 'rephrase'] as const;
type CorrectionCategory = typeof CORRECTION_CATEGORIES[number];
const CORRECTION_CATEGORY_PROMPT: Record<CorrectionCategory, string> = {
  grammar: 'Wrong grammar (subject-verb agreement, tense, wrong word form) as "grammar".',
  vocabulary: 'A better word or phrase choice as "vocabulary".',
  rephrase: 'A restructured or reworded passage for clarity/flow as "rephrase".',
};

function build(p: Record<string, unknown>): BuiltRequest {
  const instructions = reqStr(p, 'instructions', 2000);
  const text = reqStr(p, 'text', 6000);
  const categories = Array.isArray(p.categories)
    ? CORRECTION_CATEGORIES.filter((c) => (p.categories as unknown[]).includes(c))
    : CORRECTION_CATEGORIES;

  // `categories` only trims the prompt, so the model doesn't spend output on a
  // category the user has hidden; it isn't a second gate — the client still
  // filters `corrections` before rendering, in case the model includes one anyway.
  const correctionsSpec = categories.length > 0
    ? `Each option's "corrections" lists each substantive fix worth learning from IN THAT OPTION SPECIFICALLY — compare it against the ORIGINAL text, not against the other option — but ONLY in these categories — ${categories.map((c) => `"${c}"`).join(', ')}: ${categories.map((c) => CORRECTION_CATEGORY_PROMPT[c]).join(' ')} Do not include any category other than ${categories.map((c) => `"${c}"`).join(', ')}. Skip purely mechanical fixes (capitalization, stray spacing, a missing period) — nothing to learn from there. Keep "original" and "corrected" to the specific phrase that changed, not the whole sentence, and "explanation" to one short line. Return an empty "corrections" array if that option genuinely has nothing worth flagging, and don't list the same fix twice within one option.`
    : `The caller only wants the two revised options, not a corrections breakdown — always return each option's "corrections" as an empty array.`;

  return {
    system: `You are a professional writing assistant embedded in a language-learning app. Follow the user's instructions exactly when revising their text.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "options": [
    {
      "text": "first full revised version of the text",
      "corrections": [
        { "category": "grammar" | "vocabulary" | "rephrase", "original": "the original wording", "corrected": "the fixed wording", "explanation": "one short sentence: what was wrong and why the fix is correct" }
      ]
    },
    {
      "text": "second full revised version of the text",
      "corrections": [ /* same shape, describing only what THIS option changed */ ]
    }
  ]
}

"options" must contain exactly two complete, independently usable revisions of the whole text, both following the instructions above — make them meaningfully different from each other in phrasing or structure, not near-duplicates. Since the two options genuinely differ, their "corrections" lists will usually differ too — never copy one option's corrections onto the other; each must reflect only the edits actually present in its own "text".

${correctionsSpec}`,
    messages: [{
      role: 'user',
      content: `Instructions for revising the text below:\n${instructions}\n\nText to revise:\n"""\n${text}\n"""`,
    }],
    maxTokens: 2500,
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
