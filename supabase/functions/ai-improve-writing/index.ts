// Pro-only: rewrites `text` per a template's `instructions`. The instructions
// come from either a built-in template or one a user wrote themselves (see
// the `writing-templates` resource) — either way they're free-form, so unlike
// every other `ai-*` function they can't be validated for shape. They travel
// as user-role *content*, never as `system`: the system prompt stays fixed
// and server-owned, so the client still can't set what the model is told to
// be, only what it's asked to do.
//
//   POST /ai-improve-writing { instructions, text, categories?, optionCount? }
//     → { options: [{ text, corrections: WritingCorrection[] }, …] }   Pro
//
// `categories` (subset of grammar/vocabulary/rephrase, default: all) trims
// which correction categories the model is asked for. `optionCount` (1 or 2,
// default 2) skips generating a second revision entirely when the caller
// doesn't want one — half the output, half the cost.
//
// Unlike its `ai-*` siblings (ai-cloze, ai-mindmap, ai-word-dialogues, …),
// this one does NOT hand back `{ text: "<raw provider string>" }` for the
// client to JSON.parse itself — the shape here is rich and worth real
// response typing, so the model's JSON is parsed and validated HERE and the
// route returns actual structured JSON. A malformed/unparseable reply still
// degrades to a single plain-text option rather than a 502, same fallback
// the client used to do on its own.
//
// Each option's "corrections" is scoped to that option (they're independent
// revisions and don't necessarily change the same things) — compared against
// the ORIGINAL text, not the other option. Where each correction applies
// *inside* "text" is a client-side diff against the original (see
// src/lib/textDiff.ts), not something the model marks up itself: an earlier
// version had it wrap each changed span inline ({{N}}…{{/}}), but that came
// back malformed often enough in practice (missing closing tags, a
// correction whose "original" and "corrected" were identical, markers left
// unclosed around whole sentences) that the raw syntax leaked into the UI.
// A diff computed here can't come out malformed the way model-generated
// syntax can, so "text" is just the plain revised prose.
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
  stripFences,
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

interface WritingCorrection {
  category: CorrectionCategory;
  original: string;
  corrected: string;
  explanation: string;
}

interface WritingOption {
  text: string;
  corrections: WritingCorrection[];
}

function parseCorrections(v: unknown): WritingCorrection[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({
      category: c.category as CorrectionCategory,
      original: typeof c.original === 'string' ? c.original.trim() : '',
      corrected: typeof c.corrected === 'string' ? c.corrected.trim() : '',
      explanation: typeof c.explanation === 'string' ? c.explanation.trim() : '',
    }))
    // A correction whose "original" and "corrected" are identical has no
    // wording change for the client's diff to highlight — the prompt already
    // tells the model not to list these (usually a punctuation-only edit
    // reported against the wrong field), but drop any that slip through
    // rather than showing a "changed" span that reads the same before/after.
    .filter((c) => (CORRECTION_CATEGORIES as readonly string[]).includes(c.category) && c.corrected && c.corrected !== c.original);
}

/**
 * Validate the model's raw reply into real `WritingOption[]` — never throws;
 * a reply that isn't the JSON we asked for degrades to a single plain-text
 * option with no corrections (the same "at least show *something*" fallback
 * the client used to apply itself), so a caller here never has to handle a
 * "the AI said something weird" case beyond an empty corrections list.
 */
function parseModelReply(raw: string, maxOptions: number): WritingOption[] {
  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as { options?: unknown };
    if (!Array.isArray(parsed.options) || parsed.options.length === 0) throw new Error('no options');

    const options = parsed.options
      .map((o): WritingOption | null => {
        if (!o || typeof o !== 'object') return null;
        const text = typeof (o as Record<string, unknown>).text === 'string'
          ? (o as Record<string, unknown>).text as string
          : '';
        if (!text.trim()) return null;
        return { text, corrections: parseCorrections((o as Record<string, unknown>).corrections) };
      })
      .filter((o): o is WritingOption => o !== null)
      .slice(0, maxOptions);
    if (options.length === 0) throw new Error('no usable options');

    return options;
  } catch {
    return [{ text: cleaned, corrections: [] }];
  }
}

function build(p: Record<string, unknown>): BuiltRequest {
  const instructions = reqStr(p, 'instructions', 2000);
  const text = reqStr(p, 'text', 6000);
  const categories = Array.isArray(p.categories)
    ? CORRECTION_CATEGORIES.filter((c) => (p.categories as unknown[]).includes(c))
    : CORRECTION_CATEGORIES;
  const optionCount = p.optionCount === 1 ? 1 : 2;

  // `categories` only trims the prompt, so the model doesn't spend output on a
  // category the user has hidden; it isn't a second gate — the client still
  // filters `corrections` before rendering, in case the model includes one anyway.
  const correctionsSpec = categories.length > 0
    ? `Each option's "corrections" lists each substantive fix worth learning from IN THAT OPTION SPECIFICALLY — compare it against the ORIGINAL text, not against the other option — but ONLY in these categories — ${categories.map((c) => `"${c}"`).join(', ')}: ${categories.map((c) => CORRECTION_CATEGORY_PROMPT[c]).join(' ')} Do not include any category other than ${categories.map((c) => `"${c}"`).join(', ')}. Skip purely mechanical fixes (capitalization, stray spacing, a missing period) — nothing to learn from there. "original" and "corrected" must each be an exact, verbatim substring — "original" copied character-for-character from the text being revised, "corrected" copied character-for-character from this option's own "text" — not a paraphrase or summary of the change, and never identical to each other (if nothing about the wording itself changed, it isn't a correction to list). Keep both to the specific phrase that changed, not the whole sentence, and "explanation" to one short line. Return an empty "corrections" array if that option genuinely has nothing worth flagging, and don't list the same fix twice within one option.`
    : `The caller only wants the revised option${optionCount > 1 ? 's' : ''}, not a corrections breakdown — always return each option's "corrections" as an empty array.`;

  const optionShape = `{
      "text": "the full revised text, plain prose, no markup",
      "corrections": [
        { "category": "grammar" | "vocabulary" | "rephrase", "original": "the original wording", "corrected": "the fixed wording", "explanation": "one short sentence: what was wrong and why the fix is correct" }
      ]
    }`;

  const optionsSpec = optionCount === 1
    ? `"options" must contain exactly one complete, independently usable revision of the whole text, following the instructions above.`
    : `"options" must contain exactly two complete, independently usable revisions of the whole text, both following the instructions above — make them meaningfully different from each other in phrasing or structure, not near-duplicates. Since the two options genuinely differ, their "corrections" lists will usually differ too — never copy one option's corrections onto the other; each must reflect only the edits actually present in its own "text".`;

  return {
    system: `You are a professional writing assistant embedded in a language-learning app. Follow the user's instructions exactly when revising their text.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "options": [${optionCount === 1 ? optionShape : `\n    ${optionShape},\n    ${optionShape}\n  `}]
}

${optionsSpec}

${correctionsSpec}`,
    messages: [{
      role: 'user',
      content: `Instructions for revising the text below:\n${instructions}\n\nText to revise:\n"""\n${text}\n"""`,
    }],
    maxTokens: optionCount === 1 ? 1400 : 2500,
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

  // Same check `build` used for the prompt — kept in sync by being this
  // simple, rather than threading it back out through `BuiltRequest` (shared
  // by every `ai-*` function's `build`, which otherwise doesn't need it).
  const maxOptions = params.optionCount === 1 ? 1 : 2;

  try {
    const raw = await callProvider(built.system, built.messages, built.maxTokens);
    return jsonResponse(200, { options: parseModelReply(raw, maxOptions) });
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
}

if (import.meta.main) Deno.serve(handler);
