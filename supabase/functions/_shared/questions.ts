// The pure half of the `questions` function: making a "which word means…"
// question from a word's stored definition, and the sealed token that carries
// its answer — so the answer never reaches the player's device until they've
// chosen. No imports beyond Web Crypto: the function and vitest both load it.

export interface Question {
  /** Opaque: the answer, sealed. Hand it back to /questions/check with the choice. */
  token: string;
  /** The definition, with the word itself blanked if it appears in it. */
  prompt: string;
  /** Four words, the answer among them, shuffled. */
  options: string[];
}

export interface Sealed {
  /** The answer. */
  a: string;
  /** Whose question it is ('' for a visitor) — someone else's token is refused. */
  u: string;
  /** Expires (epoch ms). */
  e: number;
}

/** How long a question may be answered for. */
export const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The definition as a prompt: the word, and the obvious forms of it, blanked —
 * "a person who travels" mustn't ask for "travel".
 */
export function promptFor(word: string, definition: string): string {
  const w = word.trim();
  if (!w) return definition;
  const stem = w.length > 4 ? w.replace(/(e|es|s|ed|ing)$/i, '') : w;
  const re = new RegExp(`\\b(${escapeRe(w)}|${escapeRe(stem)}\\w*)\\b`, 'gi');
  return definition.replace(re, '___');
}

/**
 * Three wrong options for `word`: other words from `pool`, those of a similar
 * length first so the answer doesn't stand out by size — as the flash cards
 * choose theirs (src/lib/learnRules.ts choiceOptions).
 */
export function distractors(word: string, pool: string[], rand: () => number = Math.random): string[] {
  const answer = word.toLowerCase();
  const seen = new Set([answer]);
  const others = shuffle(pool.filter((w) => w.toLowerCase() !== answer), rand)
    .sort((a, b) => Math.abs(a.length - word.length) - Math.abs(b.length - word.length));
  const out: string[] = [];
  for (const w of others) {
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
    if (out.length === 3) break;
  }
  return out;
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── The sealed answer ──────────────────────────────────────────────────────
// AES-GCM under a key derived from a server secret: the player can carry the
// token but can neither read the answer in it nor forge one.

const enc = new TextEncoder();
const dec = new TextDecoder();

async function keyFrom(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`voca-questions:${secret}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function seal(data: Sealed, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(secret), enc.encode(JSON.stringify(data))));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv); out.set(ct, iv.length);
  return b64(out);
}

/** The sealed answer, or null if the token is forged, mangled or for someone else, or has expired. */
export async function open(token: string, secret: string, userId: string, now: number): Promise<Sealed | null> {
  try {
    const bytes = unb64(token);
    if (bytes.length < 13 + 16) return null;
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await keyFrom(secret), bytes.slice(12));
    const data = JSON.parse(dec.decode(plain)) as Sealed;
    if (typeof data.a !== 'string' || data.u !== userId || !(data.e > now)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Whether a choice is the answer — case and stray spaces don't matter. */
export const matches = (choice: string, answer: string) => choice.trim().toLowerCase() === answer.trim().toLowerCase();
