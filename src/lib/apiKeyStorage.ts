import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import type { ProviderId } from './aiProviders';

export type ApiKeyStorageMode = 'local' | 'supabase';

const STORAGE_MODE_KEY = 'voca-api-key-storage';
const LOCAL_KEY_PREFIX = 'voca-api-key';

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

async function encryptKeys(keys: Record<string, string>, userId: string): Promise<string> {
  const ck = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, ck, ENC.encode(JSON.stringify(keys)));
  const buf = new Uint8Array(12 + ct.byteLength);
  buf.set(iv);
  buf.set(new Uint8Array(ct), 12);
  return btoa(String.fromCharCode(...buf));
}

async function decryptKeys(encoded: string, userId: string): Promise<Record<string, string>> {
  const ck = await deriveKey(userId);
  const buf = new Uint8Array(atob(encoded).split('').map((c) => c.charCodeAt(0)));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, ck, buf.slice(12));
  return JSON.parse(DEC.decode(pt));
}

// ─── Supabase helpers ────────────────────────────────────────────────

async function fetchFromSupabase(userId: string): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('user_settings')
    .select('api_keys_encrypted')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.api_keys_encrypted) return {};
  try {
    return await decryptKeys(data.api_keys_encrypted, userId);
  } catch {
    return {};
  }
}

async function saveToSupabase(keys: Record<string, string>, userId: string): Promise<void> {
  if (!supabase) return;
  const encrypted = await encryptKeys(keys, userId);
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
 * Call on auth state change. Loads keys from the active storage into the
 * in-memory cache so that getApiKeyForProvider() stays synchronous.
 */
export async function initApiKeyStorage(user: User | null): Promise<void> {
  _userId = user?.id ?? null;
  const mode = getApiKeyStorageMode();
  if (mode === 'supabase' && user) {
    keyCache = await fetchFromSupabase(user.id);
  } else {
    keyCache = loadFromLocal();
  }
}

/** Synchronous read from in-memory cache. */
export function getApiKeyForProvider(id: ProviderId): string {
  return keyCache[id] || '';
}

/** Write key to cache + active storage. */
export async function setApiKeyForProvider(id: ProviderId, key: string): Promise<void> {
  keyCache = { ...keyCache, [id]: key };
  const mode = getApiKeyStorageMode();
  if (mode === 'supabase' && _userId) {
    await saveToSupabase(keyCache as Record<string, string>, _userId);
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
    await saveToSupabase(keys, user.id);
    // Remove from localStorage after successful migration
    saveToLocal({});
  } else {
    saveToLocal(keys);
    // Optionally leave Supabase copy in place for future sync
  }

  return true;
}
