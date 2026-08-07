// Client for the `pick` edge function — server-side word selection against the
// authoritative synced progress (so switching devices picks from up-to-date
// state, not stale localStorage). Returns null on any failure so callers can
// fall back to running the same algorithm locally.

import { request } from './api';

const TIMEOUT_MS = 4000; // a slow pick must not block the next word — fall back

/** Which pools quiz sampling draws from — checked boxes on the quiz settings. */
export interface QuizSources {
  random: boolean;   // any word in the collection
  unseen: boolean;   // never answered
  mistakes: boolean; // >30% of answers wrong
  /** Exclusive: pick like the Learn page (difficult/new mix + due reviews)
   *  instead of drawing from the pools above. Omitted = off. */
  smart?: boolean;
}

export interface PickParams {
  words: string[];
  exclude?: string[];
  count?: number;
  mode: 'learn' | 'quiz';
  /** Quiz mode only. Omitted = all pools (server default). */
  sources?: QuizSources;
}

export async function fetchPickedWords(params: PickParams): Promise<string[] | null> {
  // quiet: offline / timeout / server trouble come back as null, and the caller
  // then runs the same algorithm over local state.
  // allowAnon: a visitor has no progress rows, so the server picks exactly what
  // the local fallback would — but from the same list, without a wasted 401.
  const data = await request.post<{ words?: unknown }>('/pick', params, {
    quiet: true,
    timeout: TIMEOUT_MS,
    allowAnon: true,
  });
  if (!Array.isArray(data?.words)) return null;
  const picks = data.words.filter((w): w is string => typeof w === 'string');
  return picks.length ? picks : null;
}
