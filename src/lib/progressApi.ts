// Client for the `progress` resource — the only way the app reads or writes
// `user_word_progress`. Nothing else should touch that table (see CLAUDE.md).
//
//   GET    /progress          list, paged      POST /progress         save one word
//   GET    /progress/count    bucket counts    DELETE /progress       remove one word
//   GET    /progress/words    words only       POST /progress/lookup  a given word list
//   GET    /progress/peers    a bucket's words
//   GET    /progress/log      one word's answer log
//
// Response shapes are per-route, but key names are consistent: `progress` is
// always WordProgress[], `words` is always string[]. Failures are always
// `{ error }` with a status.
//
// Every route here is `quiet: true`, so a failure — offline, timeout, signed
// out, server trouble — resolves to null instead of throwing. That's safe
// because every caller has a local fallback: the store's own copy of progress.
// A failed read degrades to "what this device already knows", never to an
// error screen.

import { request } from './api';
import type { ReviewEvent, WordProgress } from '../types';
import type { BucketTab } from './progress';

/** A History filter: the two "how you got here" lists, plus the buckets. */
export type Filter = 'recent' | 'saved' | BucketTab;

/**
 * One page of words, newest-first. No filters means everything, which is what
 * the initial sync asks for; History passes the checked ones.
 *
 * Paging is keyset: pass the previous reply's `cursor` as `after`. There are no
 * page numbers — a word answered mid-walk moves to the front of the ordering,
 * and an offset would then skip whatever slid past it.
 */
export function fetchProgressList(opts: {
  filters?: Filter[];
  after?: string | null;
  limit?: number;
} = {}): Promise<{ progress: WordProgress[]; hasMore: boolean; cursor: string | null } | null> {
  return request.get('/progress', {
    quiet: true,
    params: {
      filters: opts.filters?.length ? opts.filters.join(',') : undefined,
      after: opts.after ?? undefined,
      limit: opts.limit,
    },
  });
}

/** Words per filter — including rows this device has never downloaded. */
export function fetchProgressCounts(): Promise<{ counts: Record<Filter, number> } | null> {
  return request.get('/progress/count', { quiet: true });
}

/** Just the words matching the filters, for handing a list to the quiz. */
export function fetchFilteredWords(
  filters: Filter[],
  limit: number,
): Promise<{ words: string[] } | null> {
  return request.get('/progress/words', {
    quiet: true,
    params: { filters: filters.length ? filters.join(',') : undefined, limit },
  });
}

/** The other words in a bucket, newest-first, plus how many there are. */
export function fetchBucketPeers(
  bucket: BucketTab,
  exclude: string,
  limit: number,
): Promise<{ words: string[]; total: number } | null> {
  return request.get('/progress/peers', { quiet: true, params: { bucket, exclude, limit } });
}

/** One word's answer log (the per-answer datetimes behind the tally). */
export function fetchWordLog(word: string): Promise<{ log: ReviewEvent[] } | null> {
  return request.get('/progress/log', { quiet: true, params: { word } });
}

/**
 * Progress for one specific set of words — a collection's stats panel. A POST
 * because the word list is too long for a query string.
 */
export function fetchProgressForWords(words: string[]): Promise<{ progress: WordProgress[] } | null> {
  return request.post('/progress/lookup', { words }, { quiet: true });
}

/**
 * Write one word's state. `event` is the answer that caused the write, appended
 * to the word's log server-side (the client never holds the whole log).
 *
 * Resolves to null if the write didn't land. There's no retry queue: the local
 * store keeps the change either way, and the next write for that word carries
 * the same state, so a dropped write self-heals on the next answer.
 */
export function saveProgress(
  progress: WordProgress,
  event?: ReviewEvent,
): Promise<{ ok: true } | null> {
  return request.post('/progress', { progress, ...(event ? { event } : {}) }, { quiet: true });
}

/** Delete one word's progress. Idempotent — removing a missing word is fine. */
export function removeProgress(word: string): Promise<{ ok: true } | null> {
  return request.delete('/progress', { quiet: true, params: { word } });
}
