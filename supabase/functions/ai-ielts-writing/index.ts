// Pro-only: scores an IELTS Writing essay against a prompt from the static
// question bank (src/data/ieltsWriting.ts), the way an examiner would — one
// band (0-9, half steps) per official criterion, plus an overall band and
// brief feedback.
//
//   POST /ai-ielts-writing { task, prompt, dataDescription?, essay } → { text }   Pro
//
// The prompt and (for Task 1) its data description are supplied by the
// caller rather than looked up server-side — the question bank is client-side
// content (the same as IELTS Speaking/Dialogue/Podcast), so there's no table
// to look it up from. This stays a stateless scorer with no DB read of its
// own, same shape as `ai-mindmap` taking `words` directly rather than a
// saved-map id.
//
// `text` in the response is a JSON string the client parses into band scores
// + feedback (see src/lib/ieltsScoreResult.ts) and, if the caller chooses to
// keep it, saves via POST /ielts-submissions — this function itself never
// writes to the database.
//
// Deploy: `supabase functions deploy ai-ielts-writing`

import {
  BadRequest,
  type BuiltRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  optLine,
  proGateError,
  reqStr,
  requireUser,
  underRateLimit,
} from '../_shared/ai.ts';

const MAX_ESSAY = 8000;
const MIN_ESSAY_WORDS = 20;

const TASK_LABEL: Record<1 | 2, string> = {
  1: 'Task Achievement',
  2: 'Task Response',
};

function readTask(v: unknown): 1 | 2 {
  if (v === 1 || v === 2) return v;
  throw new BadRequest('"task" must be 1 or 2.');
}

function build(p: Record<string, unknown>): BuiltRequest {
  const task = readTask(p.task);
  const prompt = reqStr(p, 'prompt', 1000);
  const dataDescription = optLine(p, 'dataDescription', 1000);
  const essay = reqStr(p, 'essay', MAX_ESSAY);
  const wordCount = essay.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_ESSAY_WORDS) {
    throw new BadRequest(`Write at least ${MIN_ESSAY_WORDS} words before asking for a score.`);
  }

  const taskLabel = TASK_LABEL[task];
  const context = task === 1
    ? `This is IELTS Writing Task 1 (a report). The prompt refers to data described below (there is no chart image — the description stands in for it).\n\nPrompt: ${prompt}${dataDescription ? `\n\nData described: ${dataDescription}` : ''}`
    : `This is IELTS Writing Task 2 (an essay).\n\nPrompt: ${prompt}`;

  const prompt_ = `${context}

The candidate's response (${wordCount} words):
"""
${essay}
"""

Score this response the way a certified IELTS examiner would, against the four official criteria: ${taskLabel}, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Give each a band from 0 to 9 in half-band steps, then an overall band (also 0-9, half-band steps) following the standard rule of averaging the four and rounding to the nearest half band. Be realistic and specific, the way a real examiner report reads — don't default to a flattering score.

Return ONLY this JSON (no markdown fences, no commentary):
{
  "bandOverall": 6.5,
  "bandTask": 6,
  "bandCoherence": 7,
  "bandLexical": 6,
  "bandGrammar": 6.5,
  "summary": "2-3 sentences summarizing the response's overall band and the main reason for it",
  "strengths": ["short, specific strength", "..."],
  "improvements": ["short, specific, actionable thing to fix", "..."]
}

"strengths" and "improvements" should have 2-4 items each, every item one short sentence pointing at something concrete in THIS response (a phrase, a missing linking device, a grammar slip) rather than generic advice.`;

  return {
    system: `You are a certified IELTS examiner scoring Writing ${task === 1 ? 'Task 1' : 'Task 2'} responses. Score strictly against the official band descriptors for ${taskLabel}, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Return ONLY valid JSON matching the requested schema — no markdown fences, no commentary.`,
    messages: [{ role: 'user', content: prompt_ }],
    maxTokens: 1200,
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
