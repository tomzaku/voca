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
  | 'word_data'
  | 'cloze'
  | 'word_dialogues'
  | 'translate_word'
  | 'tutor_start'
  | 'tutor_reply'
  | 'chat_start'
  | 'chat_reply'
  | 'chat_summary';

export async function callAiAction(
  action: AiAction,
  params: Record<string, unknown>,
  opts: { signal?: AbortSignal } = {},
): Promise<string> {
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
    signal: opts.signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error || `AI request failed (${response.status}).`);
  }

  const data = await response.json();
  return data.text || 'No response received.';
}
