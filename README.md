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
```

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
Profile page: on/off, what time, and which days of the week (default **7:00 AM,
every day**, in their own timezone). The app is a static site, so nothing of
ours is awake at 7am — delivery runs:

```
pg_cron (hourly)  →  pg_net POST  →  `notify` function  →  push service  →  service worker
```

One hourly UTC job serves every timezone: each user is matched against their own
local clock and chosen weekdays. Nobody is sent a reminder with zero words due.

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
| `review_word` | daily reminder, words due | `/?w=<encoded word>` |
| `test_ping` | test send with nothing due | `/` |

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

select cron.schedule('voca-review-reminders', '0 * * * *', $$
  select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/notify',
    headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb
  );
$$);
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

## Database

Migrations live in `supabase/migrations`. Apply them with:

```bash
npm run db:push        # supabase db push
```

## Tech notes

- **TTS** runs in-browser (Kokoro / Piper), with a native Web Speech fallback. The engine, voice,
  and speed are user-configurable in Settings.
- **STT** uses on-device Whisper.
- **Progress** (known / skipped / saved words) is stored in `localStorage` and synced to Supabase
  per user, so History follows you across devices when signed in.
