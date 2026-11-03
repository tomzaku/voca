// Migration versions — the timestamp a file under supabase/migrations starts
// with, which is how Supabase tracks what the remote has applied. Two ways to
// get one wrong, and `supabase db push` refuses both, after the fact:
//   - two files with the same version (sessions working in parallel each
//     picking "the next one") — the remote records the version once, and the
//     second file can never be pushed
//   - a new file that sorts before one the remote already has ("inserted
//     before the last migration") — easy here, because the versions run ahead
//     of the calendar, so `supabase migration new`'s real clock lands behind
//
//   node scripts/migrations.mjs new <name>   create one, after every existing
//                                            version (npm run db:new <name>)
//   node scripts/migrations.mjs check        refuse either mistake; the
//                                            pre-commit hook runs it when a
//                                            commit touches the migrations

import { execSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'supabase/migrations';
const VERSION = /^(\d{14})_.+\.sql$/;

const versionOf = (file) => VERSION.exec(file)?.[1] ?? null;
const files = () => readdirSync(join(root, DIR)).filter((f) => f.endsWith('.sql'));

/** "20261113000000" → that moment, UTC. */
function toDate(v) {
  return new Date(Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(8, 10), +v.slice(10, 12), +v.slice(12, 14)));
}
function toVersion(d) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

function create(name) {
  const slug = String(name ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (!slug) {
    console.error('Usage: npm run db:new <name>   e.g. npm run db:new builtin_test_results');
    process.exit(1);
  }
  // A second after the newest version there is — or now, if that's later.
  const latest = files().map(versionOf).filter(Boolean).sort().at(-1);
  const after = latest ? new Date(toDate(latest).getTime() + 1000) : new Date(0);
  const version = toVersion(new Date(Math.max(after.getTime(), Date.now())));
  const file = `${DIR}/${version}_${slug}.sql`;
  writeFileSync(join(root, file), `-- ${slug.replace(/_/g, ' ')}: what this changes, and why.\n\n`);
  console.log(file);
}

function check() {
  const problems = [];
  const all = files();
  for (const f of all) if (!versionOf(f)) problems.push(`${f}: doesn't start with a 14-digit version`);

  const byVersion = new Map();
  for (const f of all) {
    const v = versionOf(f);
    if (v) byVersion.set(v, [...(byVersion.get(v) ?? []), f]);
  }
  for (const [v, list] of byVersion) if (list.length > 1) problems.push(`${v} is used by ${list.length} files: ${list.join(', ')}`);

  // A migration this commit adds must come after every one already committed —
  // the remote may have applied those, and won't take one in front of them.
  let committed = [];
  let added = [];
  try {
    committed = execSync(`git ls-tree --name-only HEAD ${DIR}/`, { cwd: root, encoding: 'utf8' }).split('\n').map((p) => p.split('/').pop()).filter(Boolean);
    added = execSync(`git diff --cached --name-only --diff-filter=AR -- ${DIR}`, { cwd: root, encoding: 'utf8' }).split('\n').map((p) => p.split('/').pop()).filter(Boolean);
  } catch { /* not in a git checkout: only the duplicate check applies */ }
  const newestCommitted = committed.filter((f) => !added.includes(f)).map(versionOf).filter(Boolean).sort().at(-1);
  for (const f of added) {
    const v = versionOf(f);
    if (v && newestCommitted && v <= newestCommitted) problems.push(`${f} sorts before ${newestCommitted}, already committed`);
  }

  if (problems.length) {
    console.error('Migration versions:');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('Rename the new file with a fresh version: `npm run db:new <name>` picks one after every existing migration.');
    process.exit(1);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'new') create(rest.join('_'));
else if (cmd === 'check') check();
else {
  console.error('Usage: node scripts/migrations.mjs new <name> | check');
  process.exit(1);
}
