#!/usr/bin/env node
// One-off backfill: fill `phonetics` (IPA keyed by locale, e.g. en-US / en-GB)
// for word_cache rows that don't have it yet. Idempotent + resumable — only rows
// with an empty phonetics map are touched.
//
// Requires env (from Supabase → Settings → API, plus your provider key):
//   SUPABASE_URL                 https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    secret / service_role key (bypasses RLS)
//   ANTHROPIC_API_KEY            provider key
//   AI_MODEL                     optional (default claude-sonnet-5)
//
// Usage:
//   node scripts/backfill-phonetics.mjs [--dry-run] [--limit N]

import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY,
  AI_MODEL = 'claude-sonnet-5',
} = process.env;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = numArg('--limit');
const PAGE = 500;
const CONCURRENCY = 4;

function strArg(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
function numArg(flag) { const v = strArg(flag); return v ? parseInt(v, 10) : undefined; }

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!DRY_RUN && !ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY (needed unless --dry-run).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** IPA for a word keyed by locale: { "en-US": …, "en-GB": … }. */
async function generatePhonetics(word) {
  const prompt = `Give the IPA pronunciation of the English word "${word}" in both American and British English. Return ONLY JSON like {"en-US":"/…/","en-GB":"/…/"} with the slashes included, no extra text.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 120,
      system: 'You output ONLY a JSON object, no markdown, no extra text.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.content?.find((b) => b.type === 'text')?.text ?? '';
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const obj = JSON.parse(json);
  const phonetics = {};
  for (const [locale, ipa] of Object.entries(obj)) {
    if (typeof ipa === 'string' && ipa.trim()) phonetics[locale] = ipa.slice(0, 100);
  }
  if (Object.keys(phonetics).length === 0) throw new Error('empty phonetics');
  return phonetics;
}

/** Fetch every cached word without a phonetics map (paged; empty-map filter in JS). */
async function fetchPending() {
  const pending = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('word_cache')
      .select('word, headword, phonetics')
      .order('word', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      if (!r.phonetics || Object.keys(r.phonetics).length === 0) pending.push(r);
    }
    if (data.length < PAGE) break;
  }
  return pending;
}

async function main() {
  console.log(`Scanning word_cache… (model=${AI_MODEL}${DRY_RUN ? ', DRY RUN' : ''})`);
  let pending = await fetchPending();
  if (LIMIT) pending = pending.slice(0, LIMIT);
  console.log(`${pending.length} word(s) need phonetics.`);
  if (!pending.length || DRY_RUN) {
    if (DRY_RUN && pending.length) {
      console.log(pending.slice(0, 20).map((r) => r.word).join(', ') + (pending.length > 20 ? ' …' : ''));
    }
    return;
  }

  let done = 0, failed = 0;
  const queue = [...pending];
  async function worker() {
    for (;;) {
      const row = queue.shift();
      if (!row) return;
      const term = row.headword || row.word; // display word (handles non-English learn langs)
      try {
        const phonetics = await generatePhonetics(term);
        const { error } = await supabase
          .from('word_cache')
          .update({ phonetics })
          .eq('word', row.word);
        if (error) throw error;
        done++;
        console.log(`✓ ${row.word} → ${Object.entries(phonetics).map(([l, v]) => `${l} ${v}`).join('  ')}`);
      } catch (err) {
        failed++;
        console.warn(`✗ ${row.word}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nDone. Updated ${done}, failed ${failed}.`);
  if (failed) console.log('Re-run to retry the failed ones (idempotent).');
}

main().catch((e) => { console.error(e); process.exit(1); });
