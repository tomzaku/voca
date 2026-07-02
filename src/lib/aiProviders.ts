// AI client — requests are proxied through our Supabase Edge Function (`ai`),
// which holds the provider API key server-side. The browser only sends the
// signed-in user's Supabase JWT; no AI key ever touches the client.

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface CallOptions {
  system: string;
  messages: { role: string; content: string }[];
  maxTokens: number;
  signal?: AbortSignal;
}

export async function callAI(opts: CallOptions): Promise<string> {
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
    body: JSON.stringify({
      system: opts.system,
      messages: opts.messages,
      maxTokens: opts.maxTokens,
    }),
    signal: opts.signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error || `AI request failed (${response.status}).`);
  }

  const data = await response.json();
  return data.text || 'No response received.';
}
