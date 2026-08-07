// Shared pieces of the `progress` REST resource: CORS, replies, the row
// mapping, and the filter vocabulary.
//
// Routing lives in progress/index.ts — this file holds only what a route
// handler needs, so each handler stays a few lines long.
//
// Two things are fixed across every route:
//
//   • Failures are always `{ error: string }` with a status — never a 200
//     carrying an error, and never a bare string.
//   • A key's name implies its type. `progress` is always WordProgress[];
//     `words` is always string[]. Never the same name for both.

import { requireUser } from './ai.ts';

/** GET/POST/DELETE, unlike the POST-only AI functions. */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Fail a request with a specific status from anywhere inside a handler. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export { requireUser };

// ─── Filters ────────────────────────────────────────────────────────

/** Filter names. The bucket ones are literally the `bucket` column's values. */
export const BUCKET_TABS = ['not-started', 'struggling', 'learning', 'mastered', 'skipped'] as const;
export const FILTERS = ['recent', 'saved', ...BUCKET_TABS] as const;
export type BucketTab = typeof BUCKET_TABS[number];
export type Filter = typeof FILTERS[number];

export const isFilter = (s: unknown): s is Filter =>
  typeof s === 'string' && (FILTERS as readonly string[]).includes(s);

export const isBucketTab = (s: unknown): s is BucketTab =>
  typeof s === 'string' && (BUCKET_TABS as readonly string[]).includes(s);

/** `?filters=struggling,saved` → the ones we recognise. */
export const filtersFrom = (params: URLSearchParams): Filter[] =>
  (params.get('filters') ?? '').split(',').map((s) => s.trim()).filter(isFilter);

/**
 * The PostgREST predicate for a set of filters, or null for "no predicate".
 *
 * No filters at all means everything — the whole-account sync passes none, and
 * `recent` is the superset anyway. (A caller that wants *nothing* doesn't ask.)
 * Otherwise filters are a union: Saved + Struggling returns both lists merged.
 */
export function orFilter(filters: Filter[]): string | null {
  if (!filters.length || filters.includes('recent')) return null;
  const parts: string[] = [];
  if (filters.includes('saved')) parts.push('bookmarked.eq.true');
  const tabs = filters.filter((f) => f !== 'recent' && f !== 'saved');
  if (tabs.length) parts.push(`bucket.in.(${tabs.join(',')})`);
  return parts.length ? parts.join(',') : null;
}

// ─── Rows ───────────────────────────────────────────────────────────

/** Every column except review_log — that one has its own route. */
export const COLUMNS =
  'word, status, bookmarked, learned_at, reps, lapses, srs_interval, stability, difficulty, ease, due_at, last_reviewed_at, mastered, views, correct_count, wrong_count';

export const MAX_LIMIT = 1000;

/** Clamp a caller-supplied size — an unbounded limit is a free full scan. */
export function limitOf(v: string | number | null | undefined, fallback: number, max = MAX_LIMIT): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), max) : fallback;
}

/** Row → the client's WordProgress. Nulls become undefined (absent). */
export function toWordProgress(r: Record<string, unknown>) {
  const opt = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v as T);
  return {
    word: r.word as string,
    status: opt(r.status as string | null),
    bookmarked: Boolean(r.bookmarked),
    seenAt: r.learned_at as string,
    reps: opt(r.reps as number | null),
    lapses: opt(r.lapses as number | null),
    interval: opt(r.srs_interval as number | null),
    stability: opt(r.stability as number | null),
    difficulty: opt(r.difficulty as number | null),
    ease: opt(r.ease as number | null),
    dueAt: opt(r.due_at as string | null),
    lastReviewedAt: opt(r.last_reviewed_at as string | null),
    mastered: opt(r.mastered as boolean | null),
    views: opt(r.views as number | null),
    correct: opt(r.correct_count as number | null),
    wrong: opt(r.wrong_count as number | null),
    // `history` is deliberately absent — undefined means "not loaded".
  };
}

/**
 * The client's WordProgress → a table row, the inverse of toWordProgress.
 *
 * Defaults match the columns' own (`ease` 2.5, counters 0), so a partial entry
 * from an older client still writes a valid row. `user_id` is added by the
 * caller from the session — never from the request body. `review_log` is
 * deliberately absent: an upsert only writes the columns it names, so the
 * stored log survives untouched and the answer event extends it instead.
 */
export function fromWordProgress(e: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  const num = (v: unknown, fallback: number | null) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return {
    word: e.word as string,
    status: str(e.status),
    bookmarked: Boolean(e.bookmarked),
    learned_at: str(e.seenAt) ?? new Date().toISOString(),
    reps: num(e.reps, 0),
    lapses: num(e.lapses, 0),
    srs_interval: num(e.interval, 0),
    stability: num(e.stability, null),
    difficulty: num(e.difficulty, null),
    ease: num(e.ease, 2.5),
    due_at: str(e.dueAt),
    last_reviewed_at: str(e.lastReviewedAt),
    mastered: Boolean(e.mastered),
    views: num(e.views, 0),
    correct_count: num(e.correct, 0),
    wrong_count: num(e.wrong, 0),
  };
}

/** One recorded answer, as it arrives from a client. */
export function readEvent(v: unknown): { at: string; ok: boolean; via?: string } | null {
  if (!v || typeof v !== 'object') return null;
  const e = v as Record<string, unknown>;
  if (typeof e.at !== 'string' || typeof e.ok !== 'boolean') return null;
  return { at: e.at, ok: e.ok, ...(typeof e.via === 'string' ? { via: e.via } : {}) };
}
