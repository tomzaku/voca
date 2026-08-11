#!/usr/bin/env node
// Pull the linked Supabase project's `public` schema data down into the local
// Postgres run by `supabase start`, so `npm run start:local` (or Studio at
// :54323) can be pointed at a real-shaped dataset instead of an empty schema.
//
// Deliberately never touches `auth` — the dump is `--schema public` only, so
// no real email or password hash ever lands on a laptop. Every table under
// public has a `user_id`/`owner_id` FK into `auth.users`, and the local
// `auth.users` table is empty (nobody's signed in locally yet), so those FKs
// are unsatisfiable by construction. The restore runs with
// `session_replication_role = replica`, which — same as `disable trigger all`
// — turns off FK-enforcement triggers for that session, so the rows land with
// dangling references instead of failing. That's fine for browsing word/quiz
// content locally; anything that joins through to `auth.users` (an owner's
// email, say) will just come back null until you sign up locally too.
//
// Local data is discarded and replaced every run (`supabase db reset`
// reapplies migrations from scratch) — this is a one-way mirror, not a merge.
//
// Requires: Docker running, and `supabase login` done once (the CLI needs an
// access token to dump from the linked project; the project itself is already
// linked — see supabase/.temp/project-ref).

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.error) throw result.error;
  return result.status ?? 0;
}

function runQuiet(cmd, args) {
  try {
    return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch (err) {
    return err.stdout?.toString() ?? '';
  }
}

if (!runQuiet('which', ['supabase'])) {
  console.error('[sync-database] Supabase CLI not found. Install it: brew install supabase/tap/supabase');
  process.exit(1);
}

if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  console.error('[sync-database] Docker isn\'t running. Open Docker Desktop, then re-run this.');
  process.exit(1);
}

console.log('[sync-database] Ensuring local Supabase stack is up...');
if (spawnSync('supabase', ['status'], { stdio: 'ignore' }).status !== 0) {
  if (run('supabase', ['start']) !== 0) {
    console.error('[sync-database] `supabase start` failed.');
    process.exit(1);
  }
}

const workdir = mkdtempSync(join(tmpdir(), 'voca-sync-database-'));
const rawDump = join(workdir, 'remote-public-data.sql');
const guardedDump = join(workdir, 'remote-public-data.guarded.sql');

try {
  console.log('[sync-database] Dumping public-schema data from the linked project (no auth data)...');
  const dumpStatus = run('supabase', ['db', 'dump', '--linked', '--data-only', '--schema', 'public', '-f', rawDump]);
  if (dumpStatus !== 0) {
    console.error(
      '[sync-database] `supabase db dump` failed. If this is an auth error, run `supabase login` first.',
    );
    process.exit(1);
  }

  const raw = readFileSync(rawDump, 'utf8');

  // Some migrations `insert` a default row (e.g. the 'global' team) so the app
  // works out of the box. `db reset` below re-runs those migrations first, so
  // the same row already exists by the time this dump's own copy of it tries
  // to insert — truncate exactly the tables this dump touches, right before
  // loading it, so it lands in otherwise-empty tables either way.
  const tables = [...new Set([...raw.matchAll(/^INSERT INTO "public"\."(\w+)"/gm)].map((m) => m[1]))];
  const truncate = tables.length
    ? `truncate table ${tables.map((t) => `public."${t}"`).join(', ')} cascade;`
    : '';

  const guarded = [
    '-- FK targets in auth/other schemas are intentionally not present locally; see script header.',
    'set session_replication_role = replica;',
    truncate,
    raw,
    'set session_replication_role = default;',
    '',
  ].join('\n');
  writeFileSync(guardedDump, guarded);

  console.log('[sync-database] Resetting local database and loading the dump as its seed...');
  if (run('supabase', ['db', 'reset', '--local', '--sql-paths', guardedDump]) !== 0) {
    console.error('[sync-database] `supabase db reset` (with the dump as seed) failed.');
    process.exit(1);
  }
} finally {
  rmSync(workdir, { recursive: true, force: true });
}

console.log('[sync-database] Done. Local Postgres (127.0.0.1:54322) now mirrors public-schema data from the linked project.');
console.log('[sync-database] Studio: http://127.0.0.1:54323');
