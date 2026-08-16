// Opens a one-word tutoring exchange: one engaging question that tests the
// student's understanding of a word. The next turn is `ai-tutor-reply`.
//
//   POST /ai-tutor-start { word, definition } → { text }
//
// SECURITY: params are validated below; the system prompt is fixed here and
// never reaches the client. A signed-in user is required and rate-limited.
//
// Deploy: `supabase functions deploy ai-tutor-start`

import {
  BadRequest,
  type BuiltRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  reqStr,
  requireUser,
  underRateLimit,
} from '../_shared/ai.ts';

function build(p: Record<string, unknown>): BuiltRequest {
  const word = reqStr(p, 'word', 100);
  const definition = reqStr(p, 'definition', 1000);
  return {
    system: `You are a friendly vocabulary tutor testing the student on the word "${word}". Definition: ${definition}. Keep replies brief (1-3 sentences). Be warm and encouraging.`,
    messages: [{ role: 'user', content: `Ask the student one engaging question to test their understanding of "${word}". Options: use it in a sentence, describe a situation, or explain it in their own words.` }],
    maxTokens: 150,
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
