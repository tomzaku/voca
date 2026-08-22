// Device-local log of every call `request` (src/lib/api.ts) makes. Exists to
// answer "why did this fail on my phone" — mobile networks drop, time out, and
// wake radios up in ways a desktop dev session never reproduces, so the fix is
// to let the phone show its own log instead of guessing from a desk.
//
// Off by default. Toggling it on (Settings → Developer, or /debug/network)
// starts recording from the next request; the flag itself lives in
// localStorage so it survives a PWA cold start and catches launch-time
// failures, not just ones triggered after opening the debug page.
//
// Nothing here is sent anywhere — the only way this data leaves the device is
// the user hitting "Copy" and pasting it themselves.

import { create } from 'zustand';

const KEY = 'voca-debug-network';
const MAX_ENTRIES = 200;
// Keeps one huge AI/chat response (or a long writing submission) from blowing
// up the log or making "Copy" dump a wall of text.
const MAX_BODY_CHARS = 2000;

function load(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

export interface NetworkLogEntry {
  id: number;
  method: string;
  path: string;
  /** HTTP status, or 0 for a request that never got a response (offline/DNS/timeout/CORS). */
  status: number;
  ok: boolean;
  durationMs: number;
  /** ISO timestamp the request started. */
  startedAt: string;
  error?: string;
  /** Sent with the signed-in session token, vs. the anon key alone. */
  authenticated: boolean;
  /** JSON body sent, stringified and truncated. Never includes headers — see truncateBody. */
  requestBody?: string;
  /** JSON body received, stringified and truncated. */
  responseBody?: string;
}

/**
 * Stringify + truncate a request/response body for the log. Deliberately the
 * only thing that ever represents a call's payload here — headers (in
 * particular `Authorization`, a live session bearer token) are never
 * captured, so a copied log is safe to paste into a bug report without
 * handing out the account it was taken from.
 */
export function truncateBody(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return '(unserializable)';
  }
  if (!text || text === '{}') return undefined;
  return text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}… (truncated)` : text;
}

interface NetworkDebugState {
  enabled: boolean;
  log: NetworkLogEntry[];
  setEnabled: (on: boolean) => void;
  record: (entry: Omit<NetworkLogEntry, 'id'>) => void;
  clear: () => void;
}

let nextId = 1;

export const useNetworkDebug = create<NetworkDebugState>((set, get) => ({
  enabled: load(),
  log: [],
  setEnabled: (on) => {
    try {
      localStorage.setItem(KEY, String(on));
    } catch {
      /* ignore */
    }
    set({ enabled: on });
  },
  // Ring buffer, not an ever-growing array — a mobile session left running for
  // hours shouldn't quietly turn this into a memory leak.
  record: (entry) => {
    if (!get().enabled) return;
    set((s) => ({ log: [...s.log, { ...entry, id: nextId++ }].slice(-MAX_ENTRIES) }));
  },
  clear: () => set({ log: [] }),
}));

/** Plain-text rendering for the copy button — one block per call, newest last. */
export function formatNetworkLog(log: NetworkLogEntry[]): string {
  if (log.length === 0) return '(no requests logged)';
  return log
    .map((e) => {
      const status = e.status || 'ERR';
      const authTag = e.authenticated ? '' : '  [anon]';
      let block = `${e.startedAt}  ${e.method.padEnd(6)} ${status}  ${e.durationMs}ms${authTag}  ${e.path}`;
      if (e.error) block += `\n  error: ${e.error}`;
      if (e.requestBody) block += `\n  request: ${e.requestBody}`;
      if (e.responseBody) block += `\n  response: ${e.responseBody}`;
      return block;
    })
    .join('\n\n');
}
