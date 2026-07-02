// Server-side AI proxy (Option A: app-owned key).
//
// The browser calls this function with the current user's Supabase JWT; the
// function holds the real provider API key as a secret and makes the upstream
// call. No AI key ever reaches the client.
//
// Configure via `supabase secrets set`:
//   AI_PROVIDER        anthropic | openai | perplexity | google   (default: google)
//   AI_MODEL           optional model override
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / PERPLEXITY_API_KEY / GOOGLE_API_KEY
// (SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.)
//
// Deploy: `supabase functions deploy ai`

import { createClient } from 'jsr:@supabase/supabase-js@2';

type Provider = 'anthropic' | 'openai' | 'perplexity' | 'google';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROVIDER = (Deno.env.get('AI_PROVIDER') ?? 'google') as Provider;

const KEY_ENV: Record<Provider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  google: 'GOOGLE_API_KEY',
};

const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o',
  perplexity: 'sonar',
  google: 'gemini-2.5-flash',
};

interface ChatMessage {
  role: string;
  content: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  // Require a real signed-in user (rejects the bare anon key / no token).
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return jsonResponse(401, { error: 'Please sign in to use AI features.' });

  let payload: { system?: string; messages?: ChatMessage[]; maxTokens?: number };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const { system, messages, maxTokens } = payload;
  if (!system || !Array.isArray(messages)) {
    return jsonResponse(400, { error: 'Missing "system" or "messages".' });
  }

  const apiKey = Deno.env.get(KEY_ENV[PROVIDER]) ?? '';
  if (!apiKey) return jsonResponse(500, { error: `Server is missing the ${PROVIDER} API key.` });

  const model = Deno.env.get('AI_MODEL') || DEFAULT_MODEL[PROVIDER];
  const max = Math.min(Number(maxTokens) || 700, 4000);

  try {
    const text = PROVIDER === 'anthropic'
      ? await callAnthropic(apiKey, model, system, messages, max)
      : await callOpenAICompatible(PROVIDER, apiKey, model, system, messages, max);
    return jsonResponse(200, { text });
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
});

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || `API error: ${res.status}`);
  }
  const data = await res.json();
  // Skip any leading `thinking` block; grab the first text block.
  const text = (data.content as { type: string; text?: string }[] | undefined)
    ?.find((b) => b.type === 'text')?.text;
  return text || 'No response received.';
}

function endpointFor(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'perplexity':
      return 'https://api.perplexity.ai/chat/completions';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callOpenAICompatible(
  provider: Provider,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch(endpointFor(provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.message || `API error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response received.';
}
