#!/usr/bin/env node
// Give words cached before senses existed their other parts of speech —
// "live" the adjective (/laɪv/) beside "live" the verb (/lɪv/).
//
// This does NOT reimplement anything the `word` function does: the prompt
// (senses.ts), the sanitizer (sanitize.ts) and the row writer (senseRows.ts)
// are imported from supabase/functions/word, which keeps them free of Deno
// APIs for exactly this. Node strips the .ts types on import (22.18+).
//
// Each sense is translated into every mother tongue the word already has a
// translation for, so no learner sees a translated primary meaning beside an
// untranslated second one.
//
// IPA comes from eSpeak, never the model, read per part of speech behind a
// lead-in word ("to use" /juːz/, "the use" /juːs/ — see ipaContext). A word
// that turns out to have several senses gets its primary IPA re-read the same
// way, which corrects heteronyms cached from the bare spelling: "use" the verb
// was stored with the noun's /juːs/.
//
// Idempotent + resumable: only rows with senses_checked_at null are asked,
// and every answered word is marked — including the many with one meaning.
//
// Costs a little: one short Gemini Flash call per word.
//
// Requires env (.env is read by the npm script):
//   VITE_SUPABASE_URL            https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    secret key — word_cache is RLS'd with no client policies
//   GOOGLE_API_KEY               Gemini key (the same one the edge functions use)
//   AI_MODEL                     optional (default gemini-2.5-flash, as in production)
//
// Usage:
//   npm run senses:backfill -- --dry-run            # ask, print, write nothing
//   npm run senses:backfill -- --word live --dry-run
//   npm run senses:backfill -- --limit 50
//   npm run senses:backfill                         # everything unchecked

import { createClient } from '@supabase/supabase-js';
import { phonemize } from 'phonemizer';
import { ipaContext, sensesOnlyPrompt, stripLeadIn } from '../supabase/functions/word/senses.ts';
import { asSenses, sameIpa } from '../supabase/functions/word/sanitize.ts';
import { writeSenses } from '../supabase/functions/word/senseRows.ts';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const { SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY, AI_MODEL = 'gemini-2.5-flash' } = process.env;

const args = process.argv.slice(2);
const strArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const DRY_RUN = args.includes('--dry-run');
const LIMIT = Number(strArg('--limit')) || Infinity;
const ONLY = strArg('--word')?.toLowerCase();
const CONCURRENCY = Number(strArg('--concurrency')) || 4;
const PAGE = 500;
/** The learn language: its entry in `translations` is the headword, not a translation. */
const LEARN_KEY = 'english';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_API_KEY) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GOOGLE_API_KEY.');
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
        max_tokens: 1500,
        temperature: 0,
        reasoning_effort: 'none',
        messages: [
          { role: 'system', content: 'You are a vocabulary tutor. Return ONLY valid JSON, no markdown, no explanation.' },
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

/** Same voices as supabase/functions/word/phonemize.ts. */
const VOICES = { 'en-US': 'en-us', 'en-GB': 'en-gb-x-rp' };

/** eSpeak's IPA for `word` read as `pos`, per locale; `fallback` where it fails. */
async function ipaAs(word, pos, fallback = {}) {
  const out = { ...fallback };
  for (const [locale, voice] of Object.entries(VOICES)) {
    const { text, drop } = ipaContext(word, pos);
    const [raw] = await phonemize(text, voice).catch(() => []);
    const ipa = raw ? stripLeadIn(raw, drop) : null;
    if (ipa) out[locale] = ipa;
  }
  return out;
}

async function process1(row) {
  const word = row.headword || row.word;
  const langs = Object.keys(row.translations ?? {}).filter((k) => k !== LEARN_KEY);
  const answer = await ask(sensesOnlyPrompt(word, row.part_of_speech || 'word', row.definition, langs.length ? langs : ['vietnamese']));
  // Flash sometimes answers with the bare array instead of the wrapper object.
  const senses = asSenses(Array.isArray(answer) ? answer : answer.otherSenses, row.part_of_speech);
  for (const s of senses) s.phonetics = await ipaAs(row.word, s.partOfSpeech);
  const primary = senses.length ? await ipaAs(row.word, row.part_of_speech, row.phonetics) : null;
  const us = primary?.['en-US'];
  const fixIpa = !!us && !sameIpa(row.phonetics?.['en-US'], us);

  const summary = senses.map((s) => `${s.partOfSpeech} ${s.phonetics?.['en-US'] ?? ''}`).join(', ') || '—';
  console.log(`${row.word} (${row.part_of_speech}${fixIpa ? ` ${row.phonetics?.['en-US']} → ${us}` : ''}): ${summary}`);
  if (DRY_RUN) {
    if (ONLY) console.log(JSON.stringify({ primary, senses }, null, 2));
    return { senses: senses.length, fixed: fixIpa };
  }

  if (fixIpa) {
    const { error } = await svc.from('word_cache').update({ phonetics: { ...row.phonetics, ...primary } }).eq('word', row.word);
    if (error) throw error;
  }
  // A one-language row asks for `translation`, a several-language one for
  // `translations`; writeSenses files the former under the language given.
  await writeSenses(svc, row.word, senses, langs[0] ?? 'vietnamese');
  return { senses: senses.length, fixed: fixIpa };
}

// Keyset on `word`, not offsets: rows leave the unchecked filter as they're
// written, so an offset would skip words — and a page fetched while the last
// one is still in flight would hand those rows out twice.
async function* unchecked() {
  let yielded = 0;
  let after = '';
  for (;;) {
    let q = svc.from('word_cache')
      .select('word, headword, part_of_speech, definition, phonetics, translations')
      .order('word', { ascending: true })
      .gt('word', after)
      .limit(PAGE);
    q = ONLY ? q.eq('word', ONLY) : q.is('senses_checked_at', null);
    const { data, error } = await q;
    if (error) throw error;
    if (!data.length) return;
    for (const row of data) {
      if (yielded++ >= LIMIT) return;
      yield row;
    }
    after = data[data.length - 1].word;
  }
}

const failed = new Set();
let done = 0, withSenses = 0, ipaFixed = 0;
const queue = unchecked();
async function worker() {
  for (;;) {
    const { value: row, done: end } = await queue.next();
    if (end) return;
    try {
      const r = await process1(row);
      done++;
      if (r.senses) withSenses++;
      if (r.fixed) ipaFixed++;
    } catch (err) {
      failed.add(row.word);
      console.warn(`✗ ${row.word}: ${err.message}`);
    }
  }
}

// Async generators don't allow concurrent next() calls, so serialize them.
const next = queue.next.bind(queue);
let chain = Promise.resolve();
queue.next = () => (chain = chain.then(next, next));

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`\n${DRY_RUN ? '[dry run] ' : ''}${done} words, ${withSenses} with other senses, ${ipaFixed} IPA corrected, ${failed.size} failed.`);
