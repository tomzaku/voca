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

  
