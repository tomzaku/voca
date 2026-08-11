// Runs every function's own handler in one local process, unmodified — no
// Docker, no Supabase CLI. Each function still calls `Deno.serve(handler)`
// itself when it's the entrypoint (see the `if (import.meta.main)` guard at
// the bottom of each index.ts); importing it here instead just gets the
// handler function without that guard firing, so there is exactly one
// implementation of every route, run two different ways.
//
// This still talks to the same Supabase Postgres project the deployed Edge
// Functions do (SUPABASE_URL / SUPABASE_ANON_KEY below) — only where the code
// executes has moved, not where the database lives.
//
//   deno run --watch --allow-net --allow-env --allow-read \
//     --env-file=supabase/functions/.env supabase/functions/_local/serve.ts
//
// or `npm run server:dev` from the repo root, which wraps the same command.

import ai from '../ai/index.ts';
import chat from '../chat/index.ts';
import collections from '../collections/index.ts';
import doodles from '../doodles/index.ts';
import me from '../me/index.ts';
import notify from '../notify/index.ts';
import pick from '../pick/index.ts';
import progress from '../progress/index.ts';
import push from '../push/index.ts';
import quizzes from '../quizzes/index.ts';
import settings from '../settings/index.ts';
import streak from '../streak/index.ts';
import teams from '../teams/index.ts';
import word from '../word/index.ts';
import wordNotes from '../word-notes/index.ts';

type Handler = (req: Request) => Response | Promise<Response>;

// Same names as the deployed routes (supabase/functions/<name>), so the exact
// same paths that hit /functions/v1/<name>/... in prod work here unprefixed.
const RESOURCES: Record<string, Handler> = {
  ai,
  chat,
  collections,
  doodles,
  me,
  notify,
  pick,
  progress,
  push,
  quizzes,
  settings,
  streak,
  teams,
  word,
  'word-notes': wordNotes,
};

const PORT = Number(Deno.env.get('PORT')) || 8787;

Deno.serve({ port: PORT }, (req) => {
  const name = new URL(req.url).pathname.split('/').filter(Boolean)[0] ?? '';
  const handler = RESOURCES[name];
  if (!handler) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return handler(req);
});

console.log(`[local] serving ${Object.keys(RESOURCES).length} functions on http://localhost:${PORT}`);
console.log(`[local] Supabase project: ${Deno.env.get('SUPABASE_URL')}`);
