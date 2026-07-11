// AI client — requests are proxied through our Supabase Edge Function (`ai`),
// which holds the provider API key server-side. The browser only sends the
// signed-in user's Supabase JWT; no AI key ever touches the client.
//
// This is an ACTION API: the client picks a named action and passes small
// params. It cannot supply the system prompt, the model, or a token budget —
// those live in the edge function so the endpoint can't be used as a generic
// LLM. See supabase/functions/ai/index.ts for the allowed actions.

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export type AiAction =
  | 'cloze'
  | 'word_dialogues'
  | 'translate_word'
  | 'tutor_start'
  | 'tutor_reply'
  | 'chat_start'
  | 'chat_reply'
  | 'chat_summary'
  | 'mindmap';

async function postAi(
  action: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to use AI features.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, params }),
    signal,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `AI request failed (${response.status}).`);
  }
  return data ?? {};
}

export async function callAiAction(
  action: AiAction,
  params: Record<string, unknown>,
  opts: { signal?: AbortSignal } = {},
): Promise<string> {
  const data = await postAi(action, params, opts.signal);
  return (data.text as string) || 'No response received.';
}

/** Pro mind map: one small hand-drawn doodle for a word, as a base64 `data:`
 *  URI (the caller keys out the background + caches it). With `cachedOnly`
 *  the server only checks its shared cache — it never generates (never
 *  costs), and a miss resolves to null instead of throwing. */
export async function callAiDoodle(
  word: string,
  definition?: string,
  opts: { signal?: AbortSignal; cachedOnly?: boolean } = {},
): Promise<string | null> {
  const data = await postAi(
    'mindmap_doodle',
    { word, definition, cachedOnly: opts.cachedOnly === true },
    opts.signal,
  );
  const image = data.image as string | null | undefined;
  if (typeof image === 'string' && image.startsWith('data:image/')) return image;
  if (opts.cachedOnly) return null;
  throw new Error('No doodle image received.');
}
