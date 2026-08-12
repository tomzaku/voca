// The `progress` resource — every read and write of user_word_progress.
// Nothing in src/ touches the table (see CLAUDE.md).
//
//   GET    /progress                 ?filters=&after=&limit=   → { progress, hasMore, cursor }
//   POST   /progress                 { progress, event? }      → { ok }
//   DELETE /progress                 ?word=                    → { ok }
//   GET    /progress/count                                     → { counts }
//   GET    /progress/words           ?filters=&limit=          → { words }
//   GET    /progress/peers           ?bucket=&exclude=&limit=  → { words, total }
//   GET    /progress/log             ?word=                    → { log }
//   GET    /progress/activity        ?since=&until=&limit=     → { events, hasMore }
//   POST   /progress/lookup          { words: string[] }       → { progress }
//
// Routed on HTTP method + path, not on a field in the body. Two routes take a
// POST despite reading, because their input is a word list too long for a
// query string; /lookup is named as the action it performs so that's visible.
//
// `word` travels as a query parameter rather than a path segment: words can
// contain spaces and punctuation, and %2F in a path is mangled by enough
// proxies to not be worth it.
//
// Paging is keyset everywhere: `after` is the oldest learned_at you've seen,
// and the reply's `cursor` is what to send next. Offsets drift when a word is
// answered mid-walk (its learned_at moves it to the front, and every later
// offset then skips a row), and a deep OFFSET makes Postgres scan and discard.
//
// Every query runs on the caller's RLS-scoped client, so a user can only ever
// reach their own rows.
//
// Deploy: `supabase functions deploy progress`

import {
  ApiError,
  COLUMNS,
  corsHeaders,
  filtersFrom,
  fromWordProgress,
  isBucketTab,
  json,
  limitOf,
  MAX_LIMIT,
  orFilter,
  readEvent,
  requireUser,
  toWordProgress,
} from '../_shared/progress.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_PAGE = 50;
const DEFAULT_PREVIEW = 10;
/** Bigger than any real collection; a list past this is a bug or an attack. */
const MAX_LOOKUP = 2000;
/** How many words per `in.(…)`: it travels in the query string, which is finite. */
const LOOKUP_CHUNK = 200;

// The activity feed reads whole answer logs, so both ends are capped: how many
// word rows are opened, and how many events come back. A dashboard quarter for
// a heavy learner is a few thousand events; the defaults sit above that.
const ACTIVITY_ROWS = 2000;
const DEFAULT_ACTIVITY = 5000;
const MAX_ACTIVITY = 20000;

interface Ctx {
  url: URL;
  req: Request;
  /** RLS-scoped to the caller: it can only ever read that user's own rows. */
  db: SupabaseClient;
  userId: string;
}

/** The JSON body of a write, or {} when there isn't one. */
async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json() ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

// ─── Routes ─────────────────────────────────────────────────────────

/** One page of words, newest-first, for whatever filters were asked for. */
async function list({ url, db, userId }: Ctx) {
  const limit = limitOf(url.searchParams.get('limit'), DEFAULT_PAGE);
  const after = url.searchParams.get('after');

  let q = db
    .from('user_word_progress')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('learned_at', { ascending: false })
    .limit(limit);
  const or = orFilter(filtersFrom(url.searchParams));
  if (or) q = q.or(or);
  // Inclusive: two rows can share a timestamp, and `<` would drop the ones
  // sitting exactly on a page boundary. Inclusive re-sends that boundary row
  // instead, which the client's keyed-by-word merge absorbs.
  if (after) q = q.lte('learned_at', after);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    progress: rows.map(toWordProgress),
    hasMore: rows.length === limit,
    cursor: rows.length ? rows[rows.length - 1].learned_at : null,
  };
}

/**
 * Write one word's state.
 *
 * `event` is the answer that caused the write; it's appended to the word's log
 * here rather than sent as a whole array, because the client no longer holds
 * the full log and a read-modify-write from there would truncate it — and two
 * devices answering the same word would overwrite each other's answers.
 */
async function save({ req, db, userId }: Ctx) {
  const params = await body(req);
  const entry = params.progress;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing progress.');
  const row = entry as Record<string, unknown>;
  if (typeof row.word !== 'string' || !row.word) throw new ApiError(400, 'Missing word.');

  // user_id comes from the session, never the body, so a caller can only write
  // its own row (RLS enforces the same thing underneath).
  const { error } = await db
    .from('user_word_progress')
    .upsert({ user_id: userId, ...fromWordProgress(row) });
  if (error) throw new Error(error.message);

  // After the upsert, so the row exists for the append. The 50-entry cap lives
  // in the SQL function, applied atomically.
  const event = readEvent(params.event);
  if (event) {
    const { error: logError } = await db.rpc('append_review_log', { p_word: row.word, p_entry: event });
    if (logError) throw new Error(logError.message);
  }
  return { ok: true };
}

/** Delete one word. Idempotent — removing a missing word is not an error. */
async function remove({ url, db, userId }: Ctx) {
  const word = url.searchParams.get('word');
  if (!word) throw new ApiError(400, 'Missing word.');

  const { error } = await db
    .from('user_word_progress')
    .delete()
    .eq('user_id', userId)
    .eq('word', word);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** How many words are in each bucket, counted by the database. */
async function count({ db, userId }: Ctx) {
  const { data, error } = await db
    .from('user_progress_bucket_counts')
    .select('bucket, n, saved_n')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  // Seeded with zeros: the view only emits buckets that have rows, and a
  // missing key would read as "unknown" rather than "none".
  const counts: Record<string, number> = {
    recent: 0, saved: 0, 'not-started': 0, struggling: 0, learning: 0, mastered: 0, skipped: 0,
  };
  for (const row of (data ?? []) as { bucket: string; n: number; saved_n: number }[]) {
    counts[row.bucket] = Number(row.n);
    counts.recent += Number(row.n);
    counts.saved += Number(row.saved_n);
  }
  return { counts };
}

/** Matching words only — for handing a filtered list to the quiz, where a
 *  thousand full rows would be ~380KB of columns it never reads. */
async function words({ url, db, userId }: Ctx) {
  let q = db
    .from('user_word_progress')
    .select('word')
    .eq('user_id', userId)
    .order('learned_at', { ascending: false })
    .limit(limitOf(url.searchParams.get('limit'), MAX_LIMIT));
  const or = orFilter(filtersFrom(url.searchParams));
  if (or) q = q.or(or);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { words: ((data ?? []) as { word: string }[]).map((r) => r.word) };
}

/** The other words in one bucket, plus how many there are altogether — so
 *  "10 of 342" is honest even though only ten words came back. */
async function peers({ url, db, userId }: Ctx) {
  const bucket = url.searchParams.get('bucket');
  if (!isBucketTab(bucket)) throw new ApiError(400, 'Unknown bucket.');
  const exclude = url.searchParams.get('exclude');

  // `count: exact` rides along on the same request — the total comes back in
  // the Content-Range header, so the words and their count are one trip.
  let q = db
    .from('user_word_progress')
    .select('word', { count: 'exact' })
    .eq('user_id', userId)
    .eq('bucket', bucket)
    .order('learned_at', { ascending: false })
    .limit(limitOf(url.searchParams.get('limit'), DEFAULT_PREVIEW, 200));
  // The word being looked at is not one of its own peers.
  if (exclude) q = q.neq('word', exclude);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { word: string }[];
  return { words: rows.map((r) => r.word), total: count ?? rows.length };
}

/** One word's answer log — its own route because it's ~75% of a row's bytes
 *  and only the open card reads it. */
async function log({ url, db, userId }: Ctx) {
  const word = url.searchParams.get('word');
  if (!word) throw new ApiError(400, 'Missing word.');

  const { data, error } = await db
    .from('user_word_progress')
    .select('review_log')
    .eq('user_id', userId)
    .eq('word', word)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // No row, or one from before the log existed — both mean "nothing to show".
  return { log: data?.review_log ?? [] };
}

/**
 * Every answer in a date range, across all the caller's words.
 *
 * The dashboard's chart and calendar are built from this. They used to read the
 * answer log out of the vocabulary store, which worked while the whole log was
 * synced down at sign-in; it isn't any more (it's ~75% of a row's bytes and
 * `/log` fetches it per word on demand), so there was nothing left in the store
 * to count and both drew empty.
 *
 * Flattened here rather than in the client because the log is a jsonb array per
 * word: answering "what happened on the 3rd" from the client would mean pulling
 * every word's entire log down to throw nearly all of it away.
 *
 * Days are the caller's, not the server's — `since`/`until` are instants, and
 * the client sends the ones bounding its own local range. Nothing here has an
 * opinion about where a day starts.
 */
async function activity({ url, db, userId }: Ctx) {
  const since = url.searchParams.get('since');
  if (!since) throw new ApiError(400, 'Missing since.');
  const sinceMs = Date.parse(since);
  if (!Number.isFinite(sinceMs)) throw new ApiError(400, '"since" must be an ISO date.');

  const untilRaw = url.searchParams.get('until');
  const untilMs = untilRaw ? Date.parse(untilRaw) : Date.now();
  if (!Number.isFinite(untilMs)) throw new ApiError(400, '"until" must be an ISO date.');

  const limit = limitOf(url.searchParams.get('limit'), DEFAULT_ACTIVITY, MAX_ACTIVITY);

  // Newest-reviewed first, so when the row cap bites it keeps the words the
  // range is most likely to be about. No upper bound on last_reviewed_at: a
  // word answered again yesterday still holds the answers it got last month.
  const { data, error } = await db
    .from('user_word_progress')
    .select('word, review_log')
    .eq('user_id', userId)
    .gte('last_reviewed_at', new Date(sinceMs).toISOString())
    .order('last_reviewed_at', { ascending: false })
    .limit(ACTIVITY_ROWS);
  if (error) throw new Error(error.message);

  const events: { word: string; ok: boolean; at: string }[] = [];
  for (const row of (data ?? []) as { word: string; review_log: unknown }[]) {
    const log = Array.isArray(row.review_log) ? row.review_log : [];
    for (const ev of log as { at?: unknown; ok?: unknown }[]) {
      if (typeof ev?.at !== 'string') continue;
      const t = Date.parse(ev.at);
      if (!Number.isFinite(t) || t < sinceMs || t > untilMs) continue;
      events.push({ word: row.word, ok: Boolean(ev.ok), at: ev.at });
    }
  }

  // Newest first, so the cap drops the oldest — the far end of the range, which
  // is the part a dashboard is least likely to be looking at.
  events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return { events: events.slice(0, limit), hasMore: events.length > limit };
}

/**
 * Progress for one named set of words — a collection's stats panel.
 *
 * Rows, not counts: the panel draws a per-word table (what the scheduler shows
 * next, and when) as well as the bucket totals, and two endpoints for one panel
 * could disagree. Words with no row are absent, which reads as "not started".
 */
async function lookup({ req, db, userId }: Ctx) {
  const params = await body(req);
  const raw = Array.isArray(params.words) ? params.words : [];
  const wanted = raw
    .filter((w): w is string => typeof w === 'string' && w.length > 0)
    .slice(0, MAX_LOOKUP);
  if (!wanted.length) return { progress: [] };

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < wanted.length; i += LOOKUP_CHUNK) {
    const { data, error } = await db
      .from('user_word_progress')
      .select(COLUMNS)
      .eq('user_id', userId)
      .in('word', wanted.slice(i, i + LOOKUP_CHUNK));
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Record<string, unknown>[]));
  }
  return { progress: rows.map(toWordProgress) };
}

const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': list,
  'POST /': save,
  'DELETE /': remove,
  'GET /count': count,
  'GET /words': words,
  'GET /peers': peers,
  'GET /log': log,
  'GET /activity': activity,
  'POST /lookup': lookup,
};

/**
 * The path under the function's own name, so both the deployed URL
 * (/functions/v1/progress/count) and a bare /progress/count resolve the same.
 */
function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('progress');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}

/**
 * Exported (rather than only passed to Deno.serve) so a local dev server can
 * import and run this handler directly, unmodified — see
 * supabase/functions/_local/serve.ts. import.meta.main is false when this
 * module is imported that way, so the deployed entrypoint behaviour below is
 * unchanged.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const route = ROUTES[`${req.method} ${subPath(url)}`];
  if (!route) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Please sign in to use this feature.' });

  try {
    return json(200, await route({ url, req, db: auth.supabase, userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[progress]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
