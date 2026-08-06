// Client for the English Practice conversations — proxied through the `chat`
// Supabase Edge Function, which holds the provider API key server-side. The
// browser only sends the signed-in user's Supabase JWT.
//
// Separate from `aiProviders.ts` (the `ai` function) on purpose: practice chat
// is the chattiest AI feature we have, so it gets its own function to deploy
// and scale. Like `ai`, it's an ACTION API — the client picks a named action
// and passes small params, never a prompt. Practising requires Pro; the
// function enforces it. See supabase/functions/chat/index.ts.

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export type ChatAction = 'start' | 'reply' | 'summary';

export async function callChatAction(
  action: ChatAction,
  params: Record<string, unknown>,
  opts: { signal?: AbortSignal } = {},
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to use AI features.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, params }),
    signal: opts.signal,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Practice request failed (${response.status}).`);
  }
  return (data?.text as string) || 'No response received.';
}
