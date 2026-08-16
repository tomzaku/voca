// Three short example dialogues that use a given word — the "see it in
// context" panel on a flash card.
//
//   POST /ai-word-dialogues { word } → { text }
//
// SECURITY: params are validated below; the system prompt is fixed here and
// never reaches the client. A signed-in user is required and rate-limited.
//
// Deploy: `supabase functions deploy ai-word-dialogues`

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
