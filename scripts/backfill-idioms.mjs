#!/usr/bin/env node
// One-off backfill: generate 3-6 popular idioms for every cached word and store
// them normalized — the idiom text lives ONCE in `idioms` (unique on the text,
// so "work like a dog" generated for both "work" and "dog" becomes one row) and
// each word links to it through `word_idioms`. Words are sent in batches to
// keep the call count (and cost) low.
//
// Idempotent + resumable: a word is marked done via word_cache.idioms_checked_at
// even when it has NO well-known idioms (most rare/technical words don't), so
// re-runs only touch unchecked words — failed ones stay unchecked and retry.
//
// Requires env (from Supabase → Settings → API, plus ONE provider key):
//   SUPABASE_URL                 https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    secret / service_role key (bypasses RLS)
//   GOOGLE_API_KEY               provider key (Gemini; checked first)
//   ANTHROPIC_API_KEY            provider key (used if no GOOGLE_API_KEY)
//   AI_MODEL                     optional (default gemini-2.5-flash / claude-sonnet-5)
//
// Usage:
//   node scripts/backfill-idioms.mjs [--dry-run] [--limit N]

import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_API_KEY,
  ANTHROPIC_API_KEY,
  AI_MODEL,
} = process.env;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = numArg('--limit');
const PAGE = 500;
const BATCH = 10; // words per AI call (each may return up to 6 idioms w/ examples)
const CONCURRENCY = 3; // parallel batches — the unique(idiom) upsert makes cross-batch duplicates safe
const MAX_IDIOMS = 6;

function strArg(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
function numArg(flag) { const v = strArg(flag); return v ? parseInt(v, 10) : undefined; }

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!DRY_RUN && !GOOGLE_API_KEY && !ANTHROPIC_API_KEY) {
  console.error('Missing GOOGLE_API_KEY or ANTHROPIC_API_KEY (needed unless --dry-run).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SYSTEM = 'You output ONLY a JSON object, no markdown, no extra text.';

function batchPrompt(rows) {
  const list = rows
    .map((r, i) => `${i + 1}. "${r.word}"${r.definition ? ` (meaning: ${String(r.definition).slice(0, 100)})` : ''}`)
    .join('\n');
  return `For each English vocabulary word below, list its popular idioms: well-known English idioms or fixed expressions that contain the word or an inflected form of it (e.g. "let sleeping dogs lie" for "dog"). Give 3-6 per word, ordered by how often they are actually heard in everyday modern speech — most common FIRST (e.g. for "dog": "work like a dog" before rarer ones like "a dog's life"). ONLY include genuinely established, widely used idioms — never invent one. Return an empty array for words with no well-known idioms (most rare or technical words have none).

Words:
${list}

Return ONLY a JSON object mapping every word (spelled EXACTLY as given, lowercase) to its idiom array:
{ "word1": [{ "idiom": "the idiom", "meaning": "short plain-English meaning", "example": "one natural example sentence" }], "word2": [] }`;
}

/** Validate + normalize one model-returned idiom entry (null = drop it). */
function cleanIdiom(e) {
  if (!e || typeof e.idiom !== 'string' || typeof e.meaning !== 'string') return null;
  const idiom = e.idiom.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
  const meaning = e.meaning.trim();
  if (!idiom || idiom.length > 80 || !meaning) return null;
  const example = typeof e.example === 'string' && e.example.trim()
    ? e.example.trim().slice(0, 300)
    : null;
  return { idiom, meaning: meaning.slice(0, 200), example };
}

/** One AI call for a batch of rows → { word: [{ idiom, meaning, example }] }. */
async function generateBatch(rows) {
  const prompt = batchPrompt(rows);
  let text;
  if (GOOGLE_API_KEY) {
    const model = AI_MODEL || 'gemini-2.5-flash';
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GOOGLE_API_KEY}` },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
        reasoning_effort: 'none', // thinking tokens count against max_tokens
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    text = (await res.json()).choices?.[0]?.message?.content ?? '';
  } else {
    const model = AI_MODEL || 'claude-sonnet-5';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    text = (await res.json()).content?.find((b) => b.type === 'text')?.text ?? '';
  }

  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const obj = JSON.parse(json);
  const out = {};
  for (const [word, arr] of Object.entries(obj)) {
    if (!Array.isArray(arr)) continue;
    out[word.toLowerCase()] = arr.map(cleanIdiom).filter(Boolean).slice(0, MAX_IDIOMS);
  }
  return out;
}

/**
 * Store one word's idioms: upsert the idiom texts (merging on the unique text,
 * so an idiom already created via another word is reused), link them, and mark
 * the word checked — the mark also covers the "no idioms" case.
 */
async function storeIdioms(word, idioms) {
  if (idioms.length) {
    // Dedupe by text within the word before upserting (model may repeat one).
    const unique = [...new Map(idioms.map((e) => [e.idiom, e])).values()];
    const { data: rows, error } = await supabase
      .from('idioms')
      .upsert(unique, { onConflict: 'idiom' })
      .select('id, idiom');
    if (error) throw error;
    // The model returns idioms most-common-in-speech first; the position is the
    // rank (1 = most common). Merge (not ignore) on conflict so re-runs re-rank.
    const rankByIdiom = new Map(unique.map((e, i) => [e.idiom, i + 1]));
    const links = rows.map((r) => ({ word, idiom_id: r.id, rank: rankByIdiom.get(r.idiom) ?? 100 }));
    const { error: linkErr } = await supabase
      .from('word_idioms')
      .upsert(links, { onConflict: 'word,idiom_id' });
    if (linkErr) throw linkErr;
  }
  const { error: markErr } = await supabase
    .from('word_cache')
    .update({ idioms_checked_at: new Date().toISOString() })
    .eq('word', word);
  if (markErr) throw markErr;
}

/** Every cached word not yet checked for idioms (paged). */
async function fetchPending() {
  const pending = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('word_cache')
      .select('word, definition')
      .is('idioms_checked_at', null)
      .order('word', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    pending.push(...data);
    if (data.length < PAGE) break;
  }
  return pending;
}

async function main() {
  const provider = GOOGLE_API_KEY ? 'google' : 'anthropic';
  console.log(`Scanning word_cache… (provider=${provider}${DRY_RUN ? ', DRY RUN' : ''})`);
  let pending = await fetchPending();
  if (LIMIT) pending = pending.slice(0, LIMIT);
  console.log(`${pending.length} word(s) not yet checked for idioms.`);
  if (!pending.length || DRY_RUN) {
    if (DRY_RUN && pending.length) {
      console.log(pending.slice(0, 20).map((r) => r.word).join(', ') + (pending.length > 20 ? ' …' : ''));
    }
    return;
  }

  const batches = [];
  for (let i = 0; i < pending.length; i += BATCH) batches.push(pending.slice(i, i + BATCH));

  let done = 0, none = 0, failed = 0;
  const queue = [...batches];
  async function worker() {
    for (;;) {
      const rows = queue.shift();
      if (!rows) return;
      try {
        const byWord = await generateBatch(rows);
        for (const row of rows) {
          const idioms = byWord[row.word.toLowerCase()];
          if (!idioms) {
            failed++;
            console.warn(`✗ ${row.word}: missing from batch response`);
            continue;
          }
          try {
            await storeIdioms(row.word, idioms);
          } catch (err) {
            failed++;
            console.warn(`✗ ${row.word}: ${err.message}`);
            continue;
          }
          if (idioms.length) {
            done++;
            console.log(`✓ ${row.word} → ${idioms.map((e) => e.idiom).join('; ')}`);
          } else {
            none++;
            console.log(`– ${row.word}: no idioms`);
          }
        }
      } catch (err) {
        failed += rows.length;
        console.warn(`✗ batch of ${rows.length} (${rows[0].word}…): ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nDone. ${done} word(s) got idioms, ${none} had none, ${failed} failed.`);
  if (failed) console.log('Re-run to retry the failed ones (idempotent).');
}

main().catch((e) => { console.error(e); process.exit(1); });
