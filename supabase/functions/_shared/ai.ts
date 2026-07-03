// Shared infrastructure for the AI-backed edge functions (`ai`, `word`):
// provider config + calls, auth, per-user rate limit, and input validation.
// Prompts and per-function logic live in each function's own index.ts.

import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';

export type Provider = 'anthropic' | 'openai' | 'perplexity' | 'google';

export interface ChatMessage {
  role: string;
  content: string;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

// ─── Auth / clients ─────────────────────────────────────────────────

/** Verify the caller is a signed-in user. Returns the user + a scoped client, or null. */
export async function requireUser(req: Request): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

/** Service-role client for cache tables (bypasses RLS so clients can't touch them). Null if unset. */
export function serviceClient(): SupabaseClient | null {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return key
    ? createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false } })
    : null;
}

/** Per-user fixed-window rate limit. True if allowed (fails open on infra error). */
export async function underRateLimit(supabase: SupabaseClient): Promise<boolean> {
  const limit = Number(Deno.env.get('AI_RATE_LIMIT')) || 60;
  const win = Number(Deno.env.get('AI_RATE_WINDOW_SECONDS')) || 60;
  const { data: allowed, error } = await supabase.rpc('check_ai_rate_limit', {
    p_limit: limit,
    p_window_seconds: win,
  });
  return !(allowed === false && !error);
}

// ─── Provider call ──────────────────────────────────────────────────

/** Call the configured AI provider. Throws on missing key or provider error. */
export async function callProvider(system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const apiKey = Deno.env.get(KEY_ENV[PROVIDER]) ?? '';
  if (!apiKey) throw new Error(`Server is missing the ${PROVIDER} API key.`);
  const model = Deno.env.get('AI_MODEL') || DEFAULT_MODEL[PROVIDER];
  const max = Math.min(maxTokens, 4000);
  return PROVIDER === 'anthropic'
    ? callAnthropic(apiKey, model, system, messages, max)
    : callOpenAICompatible(PROVIDER, apiKey, model, system, messages, max);
}

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

// ─── Input validation ───────────────────────────────────────────────
// Thrown BadRequests become 400s. Caps keep any single request small.

export class BadRequest extends Error {}

export function reqStr(params: Record<string, unknown>, key: string, maxLen: number): string {
  const v = params[key];
  if (typeof v !== 'string') throw new BadRequest(`Missing or invalid "${key}".`);
  const trimmed = v.trim();
  if (!trimmed) throw new BadRequest(`"${key}" must not be empty.`);
  return trimmed.slice(0, maxLen);
}

export function oneOf<T extends string>(
  params: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  fallback?: T,
): T {
  const v = params[key];
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
  if (fallback !== undefined) return fallback;
  throw new BadRequest(`"${key}" must be one of: ${allowed.join(', ')}.`);
}

/** Sanitize a client-supplied conversation: known roles, capped count & length. */
export function sanitizeHistory(v: unknown, maxCount: number, maxLen: number): ChatMessage[] {
  if (!Array.isArray(v)) throw new BadRequest('history must be an array.');
  return v.slice(-maxCount).map((m) => {
    const content = typeof m?.content === 'string' ? m.content.slice(0, maxLen) : '';
    const role = m?.role === 'assistant' ? 'assistant' : 'user';
    return { role, content };
  }).filter((m) => m.content);
}

/** Strip ```json fences the model sometimes wraps JSON in. */
export function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}
