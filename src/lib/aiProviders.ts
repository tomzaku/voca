// AI Provider abstraction — supports Anthropic, OpenAI, Perplexity, Google AI

export type ProviderId = 'anthropic' | 'openai' | 'perplexity' | 'google';

export interface AIProvider {
  id: ProviderId;
  label: string;
  description: string;
  placeholder: string;
  keysUrl: string;
  keysLabel: string;
  defaultModel: string;
  models: { id: string; label: string }[];
  badge?: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude models — excellent reasoning and instruction-following.',
    placeholder: 'sk-ant-...',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    keysLabel: 'console.anthropic.com',
    defaultModel: 'claude-sonnet-5',
    models: [
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT models — widely used and versatile.',
    placeholder: 'sk-...',
    keysUrl: 'https://platform.openai.com/api-keys',
    keysLabel: 'platform.openai.com',
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    ],
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    description: 'Search-augmented AI — great for up-to-date knowledge.',
    placeholder: 'pplx-...',
    keysUrl: 'https://www.perplexity.ai/settings/api',
    keysLabel: 'perplexity.ai',
    defaultModel: 'sonar',
    models: [
      { id: 'sonar', label: 'Sonar' },
      { id: 'sonar-pro', label: 'Sonar Pro' },
      { id: 'sonar-reasoning', label: 'Sonar Reasoning' },
      { id: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
    ],
  },
  {
    id: 'google',
    label: 'Google AI',
    description: 'Gemini models — multimodal with large context.',
    badge: 'Free tier',
    placeholder: 'AIza...',
    keysUrl: 'https://aistudio.google.com/apikey',
    keysLabel: 'aistudio.google.com',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    ],
  },
];

// ─── Storage ────────────────────────────────────────────────────────

export {
  getApiKeyForProvider,
  setApiKeyForProvider,
} from './apiKeyStorage';

import { getApiKeyForProvider } from './apiKeyStorage';

const PROVIDER_KEY = 'voca-ai-provider';
const MODEL_KEY = 'voca-ai-model';

export function getProvider(): ProviderId {
  return (localStorage.getItem(PROVIDER_KEY) as ProviderId) || 'google';
}

export function setProvider(id: ProviderId): void {
  localStorage.setItem(PROVIDER_KEY, id);
}

export function getModel(): string {
  const provider = AI_PROVIDERS.find((p) => p.id === getProvider());
  const stored = localStorage.getItem(MODEL_KEY);
  // Only honor a stored model if it's still a known model for the current
  // provider. Guards against stale IDs (e.g. a retired model saved to the
  // account) that would otherwise 404 on every request.
  if (stored && provider?.models.some((m) => m.id === stored)) return stored;
  return provider?.defaultModel || 'gemini-2.5-flash';
}

export function setModel(model: string): void {
  localStorage.setItem(MODEL_KEY, model);
}

export function getCurrentApiKey(): string {
  return getApiKeyForProvider(getProvider());
}

export function getProviderConfig(): AIProvider {
  const id = getProvider();
  return AI_PROVIDERS.find((p) => p.id === id) || AI_PROVIDERS[0];
}

// ─── Unified API call ───────────────────────────────────────────────
//
// AI requests are proxied through our Supabase Edge Function (`ai`), which holds
// the provider API key server-side. The browser only sends the user's Supabase
// JWT — no AI key ever touches the client.

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
