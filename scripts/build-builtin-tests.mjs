// Writes the built-in collections' practice tests — a few fixed tests for each
// of Curated, CEFR Level 1–6 and the topics, no due date — as JSON the `tests`
// function grades against (supabase/functions/_shared/builtinTests.json):
//   { "<collection id>": { name, tests: [{ id, questions: StoredQuestion[] }] } }
// in the hunts' own question shape (_shared/hunts.ts), so they're served and
// marked the way every other question is.
//
// Up to seven questions in each test are "which word means this?": a
// definition already stored in word_cache (NO AI — a word without one isn't
// asked that way), with three wrong options from the same collection, of a
// similar length. The rest need only the word: hear it and spell it, or put
// its letters back in order — which is also how a topic whose words few
// people have looked up yet still gets its tests. Frozen here rather
// than picked per request so a test stays the same test: everyone's score on
// it, and its top three, mean the same thing.
//
// Words are chosen by a random order seeded with the collection's id, so a
// rebuild with the same definitions writes the same tests. Rebuilding with
// more definitions stored can change them — and the scores already saved
// were on the old questions — so rebuild only when the tests ought to change.
//
// Reads word_cache with the service key in supabase/functions/.env:
//   node --env-file=supabase/functions/.env scripts/build-builtin-tests.mjs
// (npm run export:tests)

import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see supabase/functions/.env).');
  process.exit(1);
}

/** Tests per collection, by kind: the levels are large, the topics 50 words. */
const TESTS = { level: 5, curated: 4, topic: 3 };
const QUESTIONS = 10;
/** At most this many of a test's questions are definitions; the rest are spelling. */
const DEFINITIONS = 7;

// The collections and their English names, from the app's own data.
const entry = `
  import { WORD_LIST } from './src/data/curatedWords.ts';
  import { CEFR_WORDS } from './src/data/cefrWords.ts';
  import { TOPIC_COLLECTIONS } from './src/data/topicWords.ts';
  const out = [{ id: 'curated', name: 'Curated', kind: 'curated', words: WORD_LIST.map((w) => w.word) }];
  for (let level = 1; level <= 6; level++) {
    out.push({ id: 'level-' + level, name: 'Level ' + level, kind: 'level', words: CEFR_WORDS.filter((w) => w.level === level).map((w) => w.word) });
  }
  for (const t of TOPIC_COLLECTIONS) out.push({ id: t.id, name: t.name, kind: 'topic', words: t.words });
  export default out;
`;
const res = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'error',
});
const collections = (await import('data:text/javascript;base64,' + Buffer.from(res.outputFiles[0].text).toString('base64'))).default;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/** Stored definitions for these words, by lower-cased word. */
async function definitions(words) {
  const defs = new Map();
  for (let i = 0; i < words.length; i += 200) {
    const { data, error } = await db.from('word_cache').select('word, definition').in('word', words.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const r of data ?? []) if (r.definition) defs.set(String(r.word).toLowerCase(), String(r.definition).trim());
  }
  return defs;
}

/** A repeatable random stream from a string. */
function seeded(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), h = (h << 13) | (h >>> 19);
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The definition with the word itself blanked — as _shared/questions.ts promptFor. */
function promptFor(word, definition) {
  const stem = word.length > 4 ? word.replace(/(e|es|s|ed|ing)$/i, '') : word;
  return definition.replace(new RegExp(`\\b(${escapeRe(word)}|${escapeRe(stem)}\\w*)\\b`, 'gi'), '___');
}

/** Three wrong options of a similar length — as _shared/questions.ts distractors. */
function distractors(word, pool, rand) {
  const seen = new Set([word.toLowerCase()]);
  const out = [];
  for (const w of shuffle(pool, rand).sort((a, b) => Math.abs(a.length - word.length) - Math.abs(b.length - word.length))) {
    if (seen.has(w.toLowerCase())) continue;
    seen.add(w.toLowerCase());
    out.push(w);
    if (out.length === 3) break;
  }
  return out;
}

/** The word's letters shuffled, never left in order. */
function scramble(word, rand) {
  for (let i = 0; i < 8; i++) {
    const s = shuffle([...word], rand).join('');
    if (s !== word) return s;
  }
  return [...word].reverse().join('');
}

const out = {};
let total = 0;
for (const c of collections) {
  const rand = seeded(c.id);
  const defs = await definitions(c.words);
  const order = shuffle(c.words, rand);
  // Words whose definition still says something once the word is blanked…
  const defined = order.filter((w) => {
    const d = defs.get(w.toLowerCase());
    return d && promptFor(w, d).replace(/___/g, '').trim().length > 12;
  });
  // …and the rest, spelt: one plain word of a few letters, nothing to trip on.
  const spelt = order.filter((w) => !defined.includes(w) && /^[a-z]{3,12}$/i.test(w));
  // As many tests as there are words for, each split the same way: up to
  // DEFINITIONS definitions, more only when there aren't spelling words
  // enough to make up the ten.
  const split = (n) => {
    const maxDef = Math.floor(defined.length / n), maxSpell = Math.floor(spelt.length / n);
    const perDef = Math.min(maxDef, Math.max(Math.min(DEFINITIONS, maxDef), QUESTIONS - maxSpell));
    return perDef + maxSpell >= QUESTIONS ? perDef : null;
  };
  let count = TESTS[c.kind];
  while (count >= 3 && split(count) === null) count--;
  if (count < 3) {
    console.warn(`${c.id}: only ${defined.length + spelt.length} usable words — skipped`);
    continue;
  }
  const perDef = split(count);
  const tests = [];
  for (let n = 0; n < count; n++) {
    const words = defined.slice(n * perDef, (n + 1) * perDef);
    const fill = spelt.slice(n * (QUESTIONS - perDef), (n + 1) * (QUESTIONS - perDef));
    const qs = [
      ...words.map((w) => ({ type: 'definition', prompt: promptFor(w, defs.get(w.toLowerCase())), options: shuffle([w, ...distractors(w, c.words, rand)], rand), answer: w })),
      ...fill.map((w, i) => (i % 2
        ? { type: 'unscramble', prompt: '', scrambled: scramble(w.toLowerCase(), rand), answer: w }
        : { type: 'listen', prompt: '', say: w, answer: w })),
    ];
    tests.push({ id: `${c.id}-t${n + 1}`, questions: shuffle(qs, rand).map((q, i) => ({ id: `q${i + 1}`, ...q })) });
  }
  out[c.id] = { name: c.name, tests };
  total += tests.length;
  console.log(`${c.id}: ${tests.length} tests — ${perDef} definitions + ${QUESTIONS - perDef} spelling each`);
}

const path = 'supabase/functions/_shared/builtinTests.json';
writeFileSync(path, JSON.stringify(out) + '\n');
console.log(`wrote ${path}: ${Object.keys(out).length} collections, ${total} tests`);
