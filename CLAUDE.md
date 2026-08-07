# Working on Voca

Project instructions for Claude Code. Keep this short — it's loaded into every session.

## Data access: go through an edge function, not the table

**Do not touch Supabase tables directly from the client.** No `supabase.from(…)` in `src/`,
for reads or writes. Both belong in an edge function under `supabase/functions/`, with a thin
typed client module in `src/lib/…Api.ts`.

Why:

- **One place to change.** Filters, pagination, and column names live server-side. Adding an
  index, renaming a column, or changing how a bucket is defined doesn't touch the UI.
- **The schema stops leaking.** Functions return the client's shape (`seenAt`, `correct`), not
  the table's (`learned_at`, `correct_count`). Components never learn the column names.
- **Aggregates stay server-side.** Counting rows this device hasn't downloaded is impossible
  from the client without downloading them.
- **Limits are enforced somewhere.** A function caps page sizes; a `.select()` in a component
  quietly hits the PostgREST `max_rows` ceiling and returns a truncated list with no error.

The pattern, end to end:

| Layer | Where | Job |
| --- | --- | --- |
| Edge function | `supabase/functions/<resource>/index.ts` | One REST resource. Auth via `requireUser`, RLS-scoped client, returns client-shaped JSON |
| Client module | `src/lib/<resource>Api.ts` | One exported function per route, built on `src/lib/api.ts` |
| Caller | hook or component | Falls back to local state when the call returns `null` |

`progress` is the reference. Deploy with `npm run deploy:progress`.

## Write them as normal REST APIs

A function is a **resource**, routed on HTTP method + path. Not a dispatcher on an `action`
field in the body, and not one function per operation.

```
GET    /progress            list          POST   /progress         create/update
GET    /progress/count      a sub-resource DELETE /progress         delete
GET    /progress/log        ?word=…
POST   /progress/lookup     an operation that needs a body
```

Rules that follow from that:

- **The verb is the HTTP method.** `GET` reads and never changes anything; `POST` writes;
  `DELETE` removes and is idempotent (deleting what isn't there is a 200, not a 404).
- **`GET` takes query parameters, not a body.** Comma-separate lists (`?filters=a,b`).
- **A read may use `POST` only when its input can't fit in a URL** — a several-hundred-word
  lookup. Name that route for what it does (`/lookup`) so the exception is visible.
- **Identifiers that can contain spaces or slashes go in the query string**, not the path.
  `%2F` in a path is mangled by enough proxies to not be worth it.
- **Page with a keyset cursor, not offsets.** Return `{ …, hasMore, cursor }` and take
  `?after=<cursor>`. Rows here are ordered by a timestamp that changes when a user answers a
  word, so an offset silently skips rows mid-walk; a deep `OFFSET` also makes Postgres scan
  and discard everything before it. One paging mode for every list.
- **Status codes are real.** 400 bad input, 401 signed out, 404 unknown route, 500 otherwise,
  and the body is always `{ error: string }`.
- **One shape per route, regardless of outcome.** Empty results return the same keys with
  empty values — `{ log: [] }`, never `{ log: null }` or a missing key.
- **A key's name implies its type** across the whole resource: in `progress`, `progress` is
  always `WordProgress[]` and `words` is always `string[]`.

Routing and the handlers live in `supabase/functions/<resource>/index.ts`; the shared pieces
(CORS, replies, row mapping, validation) go in `_shared/<resource>.ts`. See `progress`.

The older `ai` function takes `{ action, params }` — that's the pattern being moved away from;
don't copy it.

### Never hand-roll `fetch`

`src/lib/api.ts` is the HTTP client for every edge function — session token, `apikey`, JSON in
and out, timeout, and error unwrapping, in one place. A client module contains route
definitions and nothing else.

```ts
request.get<T>('/progress', { params: { limit: 50 } })              // → T, throws ApiError
request.get<T>('/progress', { params: { limit: 50 }, quiet: true }) // → T | null
```

A call throws by default; `ApiError` carries the status and the server's own `error` message,
ready for a toast. `quiet: true` turns any failure into a `null` with one console line — and
the overloads put that in the type, so a quiet call is `T | null` and TypeScript makes you
handle it.

Choose per call, not per module: whether a failure is survivable is a fact about that call.
Use `quiet` only where the caller has a local fallback — `progressApi` is quiet throughout
because the store's own copy of progress stands in. **The app is offline-capable: `null` means
"use what's in the store", never an error screen.**

Other options are `{ params, timeout, signal }`. `params` skips `undefined`/empty values, and a
caller's `signal` is combined with the timeout rather than replacing it.

`user_word_progress` is fully migrated — reads *and* writes go through `progress-*`, and
`src/hooks/useVocabulary.ts` doesn't import `supabase` at all. Writes also mean the server owns
`user_id` (taken from the session, never the request body) and the answer-log append.

### Known exceptions

- **Older features** (collections, quizzes, teams, streak, companion, notes) still query
  directly. Don't add more; migrate one when you're already working in it.

## Bucket rules are written twice

The learning buckets (`not-started` / `struggling` / `learning` / `mastered` / `skipped`) exist
as `wordBucket()` in `src/lib/progress.ts` **and** as the `bucket` generated column in
`supabase/migrations/20260807000000_progress_bucket.sql`. History filters on the SQL one; the
flash card labels with the TS one. **Change one, change the other** — `src/lib/progress.test.ts`
pins the truth table both must satisfy.

The bucket slugs are also public URLs (`/history?tab=struggling`), so renaming one breaks
existing links.

## Conventions

- **Validate and clamp every caller-supplied value** in an edge function — especially limits
  and list lengths. An unbounded `limit` is a free full table scan.
- **Comments explain why, not what.** Match the density of the file you're in; the codebase
  leans on short "why this exists" headers above components and non-obvious logic.
- **npm**, not yarn/pnpm.
- Don't run `tsc`/`npm run build` after every edit unless asked — the harness reports type
  errors from the tools themselves.
