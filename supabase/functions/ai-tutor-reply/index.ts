// The next turn of a one-word tutoring exchange opened by `ai-tutor-start`:
// feedback on the student's answer, plus a follow-up question (or a closing
// summary on the last turn).
//
//   POST /ai-tutor-reply { word, definition, history, isLast } → { text }
//
// SECURITY: params are validated below; the system prompt is fixed here and
// never reaches the client — `history` only supplies prior turns' *content*,
// which becomes user/assistant messages, never the system prompt. A signed-in
// user is required and rate-limited.
//
// Deploy: `supabase functions deploy ai-tutor-reply`

import {
  BadRequest,
  type BuiltRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  reqStr,
  requireUser,
  sanitizeHistory,
  underRateLimit,
} from '../_shared/ai.ts';

function build(p: Record<string, unknown>): BuiltRequest {
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
