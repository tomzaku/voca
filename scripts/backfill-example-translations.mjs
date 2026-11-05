#!/usr/bin/env node
// Give words cached before example translations existed their example
// sentences in each learner's mother tongue — `word_cache.example_translations`
// (see supabase/migrations/20261113000007_word_cache_example_translations.sql).
//
// The `word` function already tops a word up the first time a signed-in
// learner opens it; this does it ahead of time, so a teacher presenting a
// collection doesn't wait on (or rate-limit through) one call per slide, and
// visitors — who never trigger a top-up — see them too.
//
// The prompt and the pairing check are imported from
// supabase/functions/word/exampleTranslations.ts, so this writes exactly what
// the function would. Node strips the .ts types on import (22.18+).
//
// Languages: every mother tongue the row already has a word translation for
// (the keys of `translations`, minus the learn language), or just --lang.
//
// Idempotent + resumable: a word/language is skipped when its stored lines
// already pair one to one with the examples, so re-running only retries what
// failed — or what changed since.
//
// Costs a little: one Gemini Flash call per BATCH words.
//
// Requires env (.env is read by the npm script):
//   VITE_SUPABASE_URL            https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    secret key — word_cache is RLS'd with no client policies
//   GOOGLE_API_KEY               Gemini key (the same one the edge functions use)
//   AI_MODEL                     optional (default gemini-2.5-flash, as in production)
//
// Usage:
//   npm run examples:backfill -- --dry-run                  # count what's missing, write nothing
//   npm run examples:backfill -- --word abundant --dry-run  # print one word's translations
//   npm run examples:backfill -- --lang vietnamese --limit 100
//   npm run examples:backfill                               # everything missing

import { createClient } from '@supabase/supabase-js';
import {
  asExampleTranslations,
  exampleTranslationsPrompt,
  storedExampleTranslations,
} from '../supabase/functions/word/exampleTranslations.ts';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const { SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY, AI_MODEL = 'gemini-2.5-flash' } = process.env;

const args = process.argv.slice(2);
const strArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const DRY_RUN = args.includes('--dry-run');
const LIMIT = Number(strArg('--limit')) || Infinity;
const ONLY = strArg('--word')?.toLowerCase();
const LANG = strArg('--lang')?.toLowerCase();
const CONCURRENCY = Number(strArg('--concurrency')) || 4;
const BATCH = Number(strArg('--batch')) || 10; // words per AI call
const PAGE = 500;
/** The learn language: its entry in `translations` is the headword, not a translation. */
const LEARN_KEY = 'english';
/** A row with no mother tongue recorded yet still gets the app's main one. */
const DEFAULT_LANG = 'vietnamese';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || (!DRY_RUN && !GOOGLE_API_KEY)) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GOOGLE_API_KEY (the key is optional with --dry-run).');
  process.exit(1);
}

const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function ask(prompt) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GOOGLE_API_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 4000,
        temperature: 0,
        reasoning_effort: 'none', // thinking tokens count against max_tokens
        messages: [
          { role: 'system', content: 'You are a translator for language learners. Return ONLY valid JSON, no markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    }
    if (attempt >= 4) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, (res.status === 429 ? 3000 : 800) * attempt));
  }
}

/** The languages this row still needs its examples in. */
function missingLangs(row) {
  const examples = row.examples ?? [];
  if (!examples.length) return [];
  const langs = LANG
    ? [LANG]
    : Object.keys(row.translations ?? {}).filter((k) => k !== LEARN_KEY);
  const wanted = langs.length ? langs : [DEFAULT_LANG];
  return wanted.filter((l) => !storedExampleTranslations(row.example_translations, l, examples));
}

// Keyset on `word`, not offsets — the same reasoning as backfill-senses: rows
// change under us as they're written.
async function* pending() {
  let yielded = 0;
  let after = '';
  for (;;) {
    let q = svc.from('word_cache')
      .select('word, headword, examples, translations, example_translations')
      .order('word', { ascending: true })
      .gt('word', after)
      .limit(PAGE);
    if (ONLY) q = q.eq('word', ONLY);
    const { data, error } = await q;
    if (error) throw error;
    if (!data.length) return;
    for (const row of data) {
      const langs = missingLangs(row);
      if (!langs.length) continue;
      if (yielded++ >= LIMIT) return;
      yield { row, langs };
    }
    after = data[data.length - 1].word;
  }
}

/** Words that need the same languages share a call; one language set per batch. */
async function* batches() {
  const open = new Map(); // langs key → items
  for await (const item of pending()) {
    const key = item.langs.join(',');
    const list = open.get(key) ?? [];
    list.push(item);
    open.set(key, list);
    if (list.length >= BATCH) {
      open.delete(key);
      yield list;
    }
  }
  for (const list of open.values()) yield list;
}

let words = 0, lines = 0, failed = 0;
const missingByLang = {};

async function processBatch(items) {
  const langs = items[0].langs;
  for (const { row } of items) {
    words++;
    for (const l of langs) missingByLang[l] = (missingByLang[l] ?? 0) + 1;
  }
  if (DRY_RUN && !ONLY) return;

  // The model is shown the headword (what the examples actually use) and
  // answers keyed by it; the row is stored under its seed key.
  const shown = items.map(({ row }) => ({ row, label: row.headword || row.word }));
  const answer = await ask(exampleTranslationsPrompt(
    shown.map(({ row, label }) => ({ word: label, examples: row.examples })),
    langs,
  ));
  const lower = Object.fromEntries(Object.entries(answer ?? {}).map(([k, v]) => [k.toLowerCase(), v]));

  for (const { row, label } of shown) {
    const got = lower[label.toLowerCase()] ?? {};
    const fresh = {};
    for (const l of langs) {
      const t = asExampleTranslations(got[l], row.examples.length);
      if (t) fresh[l] = t;
    }
    const missed = langs.filter((l) => !fresh[l]);
    if (missed.length) {
      failed++;
      console.warn(`✗ ${row.word}: no usable ${missed.join(', ')} translation`);
    }
    if (!Object.keys(fresh).length) continue;
    lines += Object.values(fresh).reduce((n, t) => n + t.length, 0);
    if (ONLY || DRY_RUN) console.log(JSON.stringify({ word: row.word, examples: row.examples, ...fresh }, null, 2));
    else console.log(`✓ ${row.word} (${Object.keys(fresh).join(', ')})`);
    if (DRY_RUN) continue;

    const { error } = await svc.from('word_cache')
      .update({ example_translations: { ...(row.example_translations ?? {}), ...fresh } })
      .eq('word', row.word);
    if (error) {
      failed++;
      console.warn(`✗ ${row.word}: ${error.message}`);
    }
  }
}

const queue = batches();
// Async generators don't allow concurrent next() calls, so serialize them.
const next = queue.next.bind(queue);
let chain = Promise.resolve();
queue.next = () => (chain = chain.then(next, next));

async function worker() {
  for (;;) {
    const { value: items, done } = await queue.next();
    if (done) return;
    try {
      await processBatch(items);
    } catch (err) {
      failed += items.length;
      console.warn(`✗ batch of ${items.length} (${items[0].row.word}…): ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const byLang = Object.entries(missingByLang).map(([l, n]) => `${l} ${n}`).join(', ') || 'none';
console.log(`\n${DRY_RUN ? '[dry run] ' : ''}${words} words missing translations (${byLang}); ${lines} lines written, ${failed} failed.`);
if (failed && !DRY_RUN) console.log('Re-run to retry the failed ones (idempotent).');
