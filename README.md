# Voca — Daily Vocabulary

A playful, game-style vocabulary learner. Guess words from AI-generated clues, drag-and-drop
words into AI-written stories, practise speaking, and save words to revisit — with on-device
text-to-speech and speech-to-text.

Built with React 19 + Vite + Tailwind CSS v4, Zustand for state, and Supabase for auth,
data, and the server-side AI proxy.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Create a `.env` from the example and fill in your Supabase project:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Other scripts:

```bash
npm run build      # type-check + production build
npm run preview    # preview the production build
npm run lint       # eslint
npm test           # vitest
```

Enable the repo's git hooks once per clone — this bumps the patch version in
`package.json` on every commit, so each commit is a distinct build (the version
reaches the app as `__APP_VERSION__`):

```bash
git config core.hooksPath .githooks
```

Skip the bump for one commit with `SKIP_VERSION_BUMP=1 git commit ...`. Merges,
rebases, cherry-picks and reverts are skipped automatically.

## AI setup (server-side key)

AI requests (word data, story generation, quizzes, English practice) are **not** made from the
browser. The client calls a Supabase Edge Function (`supabase/functions/ai`) with the signed-in
user's JWT, and the function makes the upstream provider call using a key stored as a server
secret. **No AI key ever reaches the client**, and only signed-in users can trigger AI calls.

### 1. Set the provider key as a secret

Pick **one** provider and set its key. Google AI has a free tier:

```bash
supabase secrets set AI_PROVIDER=google GOOGLE_API_KEY=AIza...
```

Or use another provider:

```bash
# Anthropic
supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=sk-...

# Perplexity
supabase secrets set AI_PROVIDER=perplexity PERPLEXITY_API_KEY=pplx-...
```

| Secret | Required | Default | Notes |
| --- | --- | --- | --- |
| `AI_PROVIDER` | no | `google` | `google` \| `anthropic` \| `openai` \| `perplexity` |
| `AI_MODEL` | no | provider default | e.g. `gemini-2.5-flash`, `claude-sonnet-5`, `gpt-4o`, `sonar` |
| `GOOGLE_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `PERPLEXITY_API_KEY` | yes (matching `AI_PROVIDER`) | — | the provider API key |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected into the function automatically — you don't
set those.

### 2. Deploy the function

```bash
supabase functions deploy ai
```

The client points at your remote Supabase project, so AI features start working as soon as the
function is deployed and the secrets are set.

### Local development

To run the function locally instead of deploying:

```bash
# supabase/functions/.env  (git-ignored)
#   AI_PROVIDER=google
#   GOOGLE_API_KEY=AIza...
supabase functions serve ai --env-file supabase/functions/.env
```

Point `VITE_SUPABASE_URL` at your local stack (`http://127.0.0.1:54321`) so the client calls the
locally served function.

## Daily reminders (Web Push)

Users can opt into a nudge when words come due for review, configured from the
Profile page: on/off, **up to 5 times a day** at half-hour granularity, and
which days of the week (default **7:00 AM, every day**, in their own timezone).
Times use the platform's native `<input type="time">` picker — the iOS wheel,
the Android clock dialog — rather than a custom dropdown. The app is a static
site, so nothing of ours is awake at 7am — delivery runs:

```
pg_cron (every 30m)  →  pg_net POST  →  `notify` function  →  push service  →  service worker
```

One half-hourly UTC job serves every timezone: each user is matched against
their own local clock, chosen times, and chosen weekdays. Nobody is sent a
reminder with zero words due, and a 25-minute dedupe absorbs retries without
blocking a genuine next reminder, which may be only 30 minutes away.

The copy names **one real word** rather than counting a backlog — "Still
remember *ubiquitous*?" asks a question; "12 words ready for review" describes a
chore. The word chosen is whichever due word the user has struggled with most
(`lapses + wrong_count`), ties broken randomly so the same word doesn't nag
every day, and the sentence is picked from several variants so it keeps
registering. Tapping the notification opens **that word's card** —
`/?w=<encoded>`, the same deep link the app uses internally.

### Notification actions

Every notification is one named **action**, defined in the `ACTIONS` table in
`supabase/functions/notify/index.ts`. An action owns both its copy variants and
its destination URL:

| Action | Sent when | Opens |
| --- | --- | --- |
| `streak_at_risk` | last slot of the day, streak alive, nothing studied yet | a due word, else `/` |
| `review_word` | any slot, words due | `/?w=<encoded word>` |
| `test_ping` | test send with nothing due and no streak at risk | `/` |

A streak warning outranks a review nudge — the review queue is still there
tomorrow, the streak isn't — and it fires even when nothing is due, since one
answer on a new word is enough to keep a streak alive.

The action name travels in the push payload, so the service worker groups
notifications per action (`tag: voca-<action>`) — a new review reminder replaces
the previous one instead of stacking, without swallowing an unrelated
notification of a different kind.

Adding a kind of notification (lost streak, shared collection, quiz invite) is a
new entry in that table plus whatever query selects its recipients — no changes
to the sender or the service worker.

### 1. Generate a VAPID key pair

```bash
npx web-push generate-vapid-keys
```

The **public** key goes in `.env` as `VITE_VAPID_PUBLIC_KEY` (it ships in the
bundle, which is fine). The **private** key is a server secret.

### 2. Set the server secrets

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=BM... \
  VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT=mailto:you@example.com \
  CRON_SECRET="$(openssl rand -hex 32)"
```

| Secret | Required | Default | Notes |
| --- | --- | --- | --- |
| `CRON_SECRET` | yes | — | shared secret the cron job sends as `x-cron-secret` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | yes | — | from step 1 |
| `VAPID_SUBJECT` | no | `mailto:noreply@voca.app` | contact required by the push spec |
| `APP_BASE` | no | `/voca` | base path the app is served from |

### 3. Deploy the function

```bash
supabase functions deploy notify --no-verify-jwt
```

`--no-verify-jwt` is required because cron has no user JWT. The `CRON_SECRET`
check is what protects the endpoint instead — the function runs with
service-role privileges, so it must not be deployed without one.

### 4. Schedule it

Run once in the SQL editor — **not** as a migration, since it contains the
secret:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every 30 minutes, NOT hourly: reminder times have half-hour granularity, so
-- an hourly job would silently never fire anything set to :30.
select cron.schedule('voca-review-reminders', '0,30 * * * *', $$
  select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/notify',
    headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb
  );
$$);
```

If you already scheduled this on the old hourly cadence, replace it:

```sql
select cron.unschedule('voca-review-reminders');
-- ...then run the cron.schedule above.
```

### Testing a real device

Don't wait for the hour to come round. A **test send** targets one user and
skips the hour/weekday/dedupe gates, while still going through the real VAPID
encryption and push transport:

```bash
npm run notify:test -- you@example.com
```

```
→ Test send to you@example.com
  https://<ref>.supabase.co/functions/v1/notify

✓ Sent to 2/2 device(s)
  12 word(s) currently due
```

The script reads `VITE_SUPABASE_URL` and `CRON_SECRET` from `.env`, so there's
nothing to paste. Set `TEST_REMINDER_EMAIL` in `.env` and you can drop the
argument entirely.

It fires on every device that email has enabled reminders on, and it does
**not** stamp `last_sent_at` — so testing never consumes that day's real
reminder. With nothing currently due it sends "Push is working" rather than
inventing a word count.

To exercise the scheduled path exactly as cron will:

```bash
npm run notify:test -- --scheduled
# ✓ Sent 0, pruned 0
#   0 is expected unless someone is genuinely due this hour.
```

Both modes are also reachable with plain `curl` if you'd rather — POST to
`/functions/v1/notify` with an `x-cron-secret` header, and either no body
(scheduled) or `{"test":true,"email":"..."}`.

### Platform notes

- **iOS/iPadOS** only exposes the Push API to apps installed on the Home Screen,
  and offers no programmatic install prompt — Profile detects this and shows
  Add-to-Home-Screen instructions instead of a toggle.
- **A denied permission is permanent.** `requestPermission()` resolves `denied`
  instantly forever after; only browser site settings can undo it. That's why
  the prompt is behind an explicit "Enable reminders" button rather than fired
  on load, and why turning the toggle off unsubscribes the device but keeps the
  permission.

## Learning streak

Consecutive calendar days with at least one **graded** answer (`markWord` /
`triageWord` — merely viewing a card doesn't count, or the streak stops meaning
anything). Shown as a flame in the navbar, lit once today is counted and dimmed
while it's still at risk.

Days are counted in the learner's own timezone: the client passes its local date
to `record_learning_day()`, which advances the streak atomically under a row
lock. Counting in UTC would break a Saigon user's streak seven hours before
their day actually ended, and two devices answering at once would otherwise both
read the old count and both add one.

## Database

Migrations live in `supabase/migrations`. Apply them with:

```bash
npm run db:push        # supabase db push
```

### Reading data: use an edge function, not the table

**The client does not query Supabase tables directly.** A read belongs in an edge function
under `supabase/functions/`, fronted by a small typed module in `src/lib/…Api.ts`. New code
should follow this; a lot of older code predates it (see below).

Keeping the table behind one endpoint means filters, pagination, page-size caps and column
names all live in one file. The function also returns the client's shape (`seenAt`, `correct`)
rather than the table's (`learned_at`, `correct_count`), so renaming a column never reaches a
component — and aggregates like "how many words am I struggling with" can be counted over rows
the device has never downloaded.

**Write them as normal REST APIs.** A function is a resource, routed on HTTP method + path —
not a dispatcher on an `action` field, and not one function per operation. `progress` covers
every read and write of `user_word_progress`; nothing in `src/` touches the table.

```
GET    /functions/v1/progress        ?filters=&after=&limit=   → { progress, hasMore, cursor }
POST   /functions/v1/progress        { progress, event? }      → { ok }
DELETE /functions/v1/progress        ?word=                    → { ok }
GET    /functions/v1/progress/count                            → { counts }
GET    /functions/v1/progress/words  ?filters=&limit=          → { words }
GET    /functions/v1/progress/peers  ?bucket=&exclude=&limit=  → { words, total }
GET    /functions/v1/progress/log    ?word=                    → { log }
POST   /functions/v1/progress/lookup { words: string[] }       → { progress }
```

The conventions, which any new resource should follow:

- **The verb is the HTTP method** — `GET` never changes anything, `DELETE` is idempotent.
- **`GET` takes query parameters**, comma-separating lists (`?filters=struggling,saved`).
- **A read uses `POST` only when its input won't fit in a URL** — `/lookup` takes a
  several-hundred-word list. Naming the route for what it does keeps the exception visible.
- **`word` is a query parameter, not a path segment**: words contain spaces, and `%2F` in a
  path is mangled by enough proxies to not be worth it.
- **Paging is a keyset cursor, never an offset.** Send `?after=<the last cursor>`. Rows are
  ordered by a timestamp that moves when a word is answered, so an offset silently skips rows
  mid-walk — and a deep `OFFSET` makes Postgres scan and discard everything before it. The
  same route and the same paging serve both History's "Load more" and the whole-account sync
  (which just passes no filters).
- **One shape per route**, whatever the outcome: `{ log: [] }`, never `{ log: null }`.
- **A key's name implies its type**: `progress` is always `WordProgress[]`, `words` is always
  `string[]`. Failures are always `{ error }` with a real status code.

`POST /progress` takes the answer that caused the write as `event` and appends it to the word's
log itself — the client never holds the whole log, so it can't send one back without
truncating it. `user_id` always comes from the session, never the request body.

On the client, `src/lib/api.ts` is the HTTP client for *every* edge function — session token,
`apikey`, JSON, timeouts, error unwrapping — so a resource module is route definitions and
nothing else:

```ts
request.get('/progress/count')                 // → T, throws ApiError on failure
request.get('/progress/count', { quiet: true }) // → T | null
```

A call throws by default, carrying the server's own message for a toast. `quiet: true` turns
failures into `null` instead, and the return type says so. `src/lib/progressApi.ts` is quiet
throughout, because the app is offline-capable and a failed read should fall back to the
stored copy of progress rather than interrupt anyone.

```bash
npm run deploy:progress
```

**Still direct, to be migrated:** the older features (collections, quizzes, teams, streak,
companion, word notes). Don't add new direct queries; move one over when you're already
working in that area.

### Learning buckets

Which bucket a word is in (`not-started` / `struggling` / `learning` / `mastered` / `skipped`)
is defined **twice on purpose**: `wordBucket()` in `src/lib/progress.ts` for the UI, and the
`bucket` generated column in `supabase/migrations/20260807000000_progress_bucket.sql` so
History can filter and count server-side without downloading rows. The two must agree —
`src/lib/progress.test.ts` pins the cases both have to satisfy. The slugs also appear in URLs
(`/history?tab=struggling`), so renaming one breaks saved links.

## Tech notes

- **TTS** runs in-browser (Kokoro / Piper), with a native Web Speech fallback. The engine, voice,
  and speed are user-configurable in Settings.
- **STT** uses on-device Whisper.
- **Progress** (learning state, saved words) is stored in `localStorage` and synced to Supabase
  per user, so History follows you across devices when signed in. The per-answer log is the one
  thing kept server-side only — it dwarfs everything else on the row, so it's fetched for a
  single word when you open its answer history.
