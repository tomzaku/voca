// A word list for a new collection, generated from a topic — the Pro
// alternative to "Ask ChatGPT" and pasting the answer back.
//
//   POST /ai-collection-words { topic } → { words }
//
// `topic` is the user's free-text request ("family", "200 IELTS collocations"),
// so it goes in a body. The reply is cleaned into bare lower-case words here,
// so the client gets a list, not prose; it still re-parses before saving.
//
// SECURITY: Pro only, signed-in, rate-limited; the prompt is fixed here.
//
// Deploy: `supabase functions deploy ai-collection-words`

import {
  BadRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  proGateError,
  reqStr,
  requireUser,
  underRateLimit,
} from '../_shared/ai.ts';

/** Matches the collection form's cap per generation; a request for "1000 words" gets this many. */
const MAX_WORDS = 300;

function prompt(topic: string): string {
  return `List English vocabulary words or short phrases for this request: "${topic}".

Rules:
- If the request names a number, give that many (at most ${MAX_WORDS}); otherwise give about 30
- Output ONLY the words, one per line
- lowercase, no numbering, no bullets, no explanations, no duplicates`;
}

/** One line of model output → a bare word, or '' to drop it. Mirrors src/lib/wordList.ts. */
function clean(line: string): string {
  const w = line
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+(?:[-–—]|:)\s.*$/, '')
    .replace(/[:–—].*$/, '')
    .replace(/^\s*(?:[-*+•>]|\d+[.)])\s*/, '')
    .replace(/[\\*_`~"#[\]]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,!?'-]+|[\s.,!?'-]+$/g, '')
    .toLowerCase();
  return /^[a-z]+(?:[ '-][a-z]+)*$/.test(w) && w.length >= 2 ? w : '';
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

  let topic: string;
  try {
    topic = reqStr((await req.json() ?? {}) as Record<string, unknown>, 'topic', 200);
  } catch (err) {
    return jsonResponse(400, { error: err instanceof BadRequest ? err.message : 'Invalid JSON body.' });
  }

  try {
    const text = await callProvider(
      'You generate vocabulary lists for a language-learning app. Return ONLY the list.',
      [{ role: 'user', content: prompt(topic) }],
      4000,
    );
    const words = [...new Set(text.split(/[\n,;]+/).map(clean).filter(Boolean))].slice(0, MAX_WORDS);
    return jsonResponse(200, { words });
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
}

if (import.meta.main) Deno.serve(handler);
