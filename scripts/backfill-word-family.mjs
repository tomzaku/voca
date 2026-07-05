#!/usr/bin/env node
// One-off backfill: create word-family records for cached words that don't have
// one yet. Families are normalized — stored ONCE in word_families, with every
// member mapped in word_family_members — so backfilling one member also covers
// its siblings (they're skipped on later passes). Idempotent + resumable.
//
// Requires env (from Supabase → Settings → API, plus your provider key):
//   SUPABASE_URL                 https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    secret / service_role key (bypasses RLS)
//   ANTHROPIC_API_KEY            provider key
//   AI_MODEL                     optional (default claude-sonnet-5)
//
// Usage:
//   node scripts/backfill-word-family.mjs [--dry-run] [--limit N]

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
// Sequential (not concurrent): two family members processed in parallel would
// each miss the mapping and create duplicate family rows.
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

/** Derivationally related forms as [{ word, pos }] (excluding the word itself). */
async function generateWordFamily(word, definition) {
  const prompt = `List the word family of the English word "${word}"${definition ? ` (meaning: ${definition})` : ''}: 2-6 derivationally related forms across OTHER parts of speech (e.g. for "decide": decision/noun, decisive/adjective, decidedly/adverb). Do NOT include "${word}" itself. Return ONLY a JSON array like [{"word":"decision","pos":"noun"}]. Return [] if no related forms exist.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 250,
      system: 'You output ONLY a JSON array, no markdown, no extra text.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.content?.find((b) => b.type === 'text')?.text ?? '';
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const arr = JSON.parse(json);
  if (!Array.isArray(arr)) throw new Error('not an array');
  return arr
    .filter((e) => e && typeof e.word === 'string' && typeof e.pos === 'string')
    .map((e) => ({ word: e.word.slice(0, 60), pos: e.pos.slice(0, 30) }))
    .slice(0, 8);
}

/** Cached words with no family mapping yet. */
async function fetchPending() {
  const mapped = new Set();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('word_family_members')
      .select('word')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) mapped.add(r.word);
    if (data.length < PAGE) break;
  }

  const pending = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('word_cache')
      .select('word, headword, definition, part_of_speech')
      .order('word', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) if (!mapped.has(r.word)) pending.push(r);
    if (data.length < PAGE) break;
  }
  return pending;
}

async function storeFamily(row, family) {
  const headword = row.headword || row.word;
  const seen = new Set();
  const members = [];
  for (const m of [{ word: headword, pos: row.part_of_speech || '' }, ...family]) {
    const key = m.word.toLowerCase();
    if (!seen.has(key)) { seen.add(key); members.push(m); }
  }
  const { data: fam, error } = await supabase
    .from('word_families')
    .insert({ members })
    .select('id')
    .single();
  if (error) throw error;
  const keys = new Set(members.map((m) => m.word.toLowerCase()));
  keys.add(row.word.toLowerCase());
  const rows = [...keys].map((word) => ({ word, family_id: fam.id }));
  const { error: mapErr } = await supabase
    .from('word_family_members')
    .upsert(rows, { onConflict: 'word', ignoreDuplicates: true });
  if (mapErr) throw mapErr;
}

async function main() {
  console.log(`Scanning word_cache… (model=${AI_MODEL}${DRY_RUN ? ', DRY RUN' : ''})`);
  let pending = await fetchPending();
  if (LIMIT) pending = pending.slice(0, LIMIT);
  console.log(`${pending.length} word(s) need a family.`);
  if (!pending.length || DRY_RUN) {
    if (DRY_RUN && pending.length) {
      console.log(pending.slice(0, 20).map((r) => r.word).join(', ') + (pending.length > 20 ? ' …' : ''));
    }
    return;
  }

  // Sequential, re-checking the mapping before each word: an earlier word's
  // family may already have covered this one (sibling), so we skip it for free.
  let done = 0, skipped = 0, failed = 0;
  for (const row of pending) {
    const { data: existing } = await supabase
      .from('word_family_members')
      .select('word')
      .eq('word', row.word)
      .maybeSingle();
    if (existing) { skipped++; continue; }

    try {
      const family = await generateWordFamily(row.headword || row.word, row.definition);
      if (family.length === 0) { skipped++; console.log(`– ${row.word}: no family`); continue; }
      await storeFamily(row, family);
      done++;
      console.log(`✓ ${row.word} → ${family.map((f) => `${f.word}/${f.pos}`).join(', ')}`);
    } catch (err) {
      failed++;
      console.warn(`✗ ${row.word}: ${err.message}`);
    }
  }
  console.log(`\nDone. Created ${done}, skipped ${skipped} (covered/none), failed ${failed}.`);
  if (failed) console.log('Re-run to retry the failed ones (idempotent).');
}

main().catch((e) => { console.error(e); process.exit(1); });
