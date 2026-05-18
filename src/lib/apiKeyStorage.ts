import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import type { ProviderId } from './aiProviders';

export type ApiKeyStorageMode = 'local' | 'supabase';

const STORAGE_MODE_KEY = 'voca-api-key-storage';
const LOCAL_KEY_PREFIX = 'voca-api-key';
const PROVIDER_KEY = 'voca-ai-provider';
const MODEL_KEY = 'voca-ai-model';

// Blob stored in Supabase includes both API keys and provider/model preferences
interface StoredBlob {
  keys: Partial<Record<ProviderId, string>>;
  provider?: string;
  model?: string;
}

// In-memory cache — keeps getApiKeyForProvider() synchronous
let keyCache: Partial<Record<ProviderId, string>> = {};
let _userId: string | null = null;

// ─── Mode preference ─────────────────────────────────────────────────

export function getApiKeyStorageMode(): ApiKeyStorageMode {
  return (localStorage.getItem(STORAGE_MODE_KEY) as ApiKeyStorageMode) || 'local';
}

// ─── Crypto helpers (AES-GCM, key derived via PBKDF2 from userId) ─────

const ENC = new TextEncoder();
const DEC = new TextDecoder();
const PBKDF2_SALT = ENC.encode('voca-api-keys-v1');
const PBKDF2_ITER = 100_000;

async function deriveKey(userId: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', ENC.encode(userId), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: PBKDF2_SALT, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptBlob(blob: StoredBlob, userId: string): Promise<string> {
  const ck = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, ck, ENC.encode(JSON.stringify(blob)));
  const buf = new Uint8Array(12 + ct.byteLength);
  buf.set(iv);
  buf.set(new Uint8Array(ct), 12);
  return btoa(String.fromCharCode(...buf));
}

async function decryptBlob(encoded: string, userId: string): Promise<StoredBlob> {
  const ck = await deriveKey(userId);
  const buf = new Uint8Array(atob(encoded).split('').map((c) => c.charCodeAt(0)));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, ck, buf.slice(12));
  const parsed = JSON.parse(DEC.decode(pt));
  // Support old format (plain keys object) and new format (StoredBlob)
  if (parsed && typeof parsed.keys === 'object') return parsed as StoredBlob;
  return { keys: parsed };
}

// ─── Supabase helpers ────────────────────────────────────────────────

async function fetchFromSupabase(userId: string): Promise<StoredBlob> {
  if (!supabase) return { keys: {} };
  const { data, error } = await supabase
    .from('user_settings')
    .select('api_keys_encrypted')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.api_keys_encrypted) return { keys: {} };
  try {
    return await decryptBlob(data.api_keys_encrypted, userId);
  } catch {
    return { keys: {} };
  }
}

function buildBlob(): StoredBlob {
  return {
    keys: { ...keyCache },
    provider: localStorage.getItem(PROVIDER_KEY) ?? undefined,
    model: localStorage.getItem(MODEL_KEY) ?? undefined,
  };
}

async function saveToSupabase(userId: string): Promise<void> {
  if (!supabase) return;
  const encrypted = await encryptBlob(buildBlob(), userId);
  await supabase.from('user_settings').upsert(
    { user_id: userId, api_keys_encrypted: encrypted, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

// ─── Local helpers ───────────────────────────────────────────────────

function loadFromLocal(): Record<string, string> {
  const result: Record<string, string> = {};
  const providers: ProviderId[] = ['anthropic', 'openai', 'perplexity', 'google'];
  for (const id of providers) {
    const v = localStorage.getItem(`${LOCAL_KEY_PREFIX}-${id}`);
    if (v) result[id] = v;
  }
  return result;
}

function saveToLocal(keys: Record<string, string>): void {
  const providers: ProviderId[] = ['anthropic', 'openai', 'perplexity', 'google'];
  for (const id of providers) {
    if (keys[id]) localStorage.setItem(`${LOCAL_KEY_PREFIX}-${id}`, keys[id]);
    else localStorage.removeItem(`${LOCAL_KEY_PREFIX}-${id}`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Call on auth state change. Loads keys (and provider/model prefs) from the
 * active storage into the in-memory cache so getApiKeyForProvider() stays synchronous.
 */
export async function initApiKeyStorage(user: User | null): Promise<void> {
  _userId = user?.id ?? null;
  const mode = getApiKeyStorageMode();
  if (mode === 'supabase' && user) {
    const blob = await fetchFromSupabase(user.id);
    keyCache = blob.keys;
    // Restore provider/model to localStorage so the rest of the app picks them up
    if (blob.provider) localStorage.setItem(PROVIDER_KEY, blob.provider);
    if (blob.model) localStorage.setItem(MODEL_KEY, blob.model);
  } else {
    keyCache = loadFromLocal();
  }
}

/** Synchronous read from in-memory cache. */
export function getApiKeyForProvider(id: ProviderId): string {
  return keyCache[id] || '';
}

/**
 * Re-save provider/model preferences to Supabase (call after changing them
 * so the blob stays in sync). No-op in local mode.
 */
export async function syncPreferencesToSupabase(): Promise<void> {
  if (getApiKeyStorageMode() === 'supabase' && _userId) {
    await saveToSupabase(_userId);
  }
}

/** Write key to cache + active storage. */
export async function setApiKeyForProvider(id: ProviderId, key: string): Promise<void> {
  keyCache = { ...keyCache, [id]: key };
  const mode = getApiKeyStorageMode();
  if (mode === 'supabase' && _userId) {
    await saveToSupabase(_userId);
  } else {
    localStorage.setItem(`${LOCAL_KEY_PREFIX}-${id}`, key);
  }
}

/**
 * Switch storage mode and migrate existing keys to the new storage.
 * Returns false if switching to 'supabase' without a logged-in user.
 */
export async function setApiKeyStorageMode(
  mode: ApiKeyStorageMode,
  user: User | null,
): Promise<boolean> {
  if (mode === 'supabase' && !user) return false;

  const current = getApiKeyStorageMode();
  if (current === mode) return true;

  // Migrate keys from current storage to new storage
  const keys = { ...keyCache } as Record<string, string>;

  localStorage.setItem(STORAGE_MODE_KEY, mode);

  if (mode === 'supabase' && user) {
    await saveToSupabase(user.id);
    saveToLocal({});
  } else {
    saveToLocal(keys);
  }

  return true;
}
