// Client for the `pick` edge function — server-side word selection against the
// authoritative synced progress (so switching devices picks from up-to-date
// state, not stale localStorage). Returns null on any failure so callers can
// fall back to running the same algorithm locally.

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const TIMEOUT_MS = 4000; // a slow pick must not block the next word — fall back

export interface PickParams {
  words: string[];
  exclude?: string[];
  count?: number;
  mode: 'learn' | 'quiz';
}

export async function fetchPickedWords(params: PickParams): Promise<string[] | null> {
  try {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const { words } = await response.json() as { words?: unknown };
    if (!Array.isArray(words)) return null;
    const picks = words.filter((w): w is string => typeof w === 'string');
    return picks.length ? picks : null;
  } catch {
    return null; // offline / timeout / server trouble — caller uses local state
  }
}
