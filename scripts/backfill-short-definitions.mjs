#!/usr/bin/env node
// One-off backfill: fill `short_definition` (the punchy one-liner shown as a
// handwritten note in the Pro mind map) for word_cache rows that don't have
// one yet. Idempotent + resumable — only rows with a NULL/empty
// short_definition are touched, and words are sent in batches to keep the
// call count (and cost) low.
//
// Requires env (from Supabase → Settings → API, plus ONE provider key):
//   SUPABASE_URL                 https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    secret / service_role key (bypasses RLS)
//   GOOGLE_API_KEY               provider key (Gemini; checked first)
//   ANTHROPIC_API_KEY            provider key (used if no GOOGLE_API_KEY)
//   AI_MODEL                     optional (default gemini-2.5-flash / claude-sonnet-5)
//
// Usage:
//   node scripts/backfill-short-definitions.mjs [--dry-run] [--limit N]

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
const BATCH = 20; // words per AI call
const CONCURRENCY = 3; // parallel batches

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
  return `For each English vocabulary word below, write a very short plain-English definition (max 12 words), phrased like a quick handwritten note next to the word on a study mind map — punchy and memorable, e.g. "too willing to believe things; easily fooled".

Words:
${list}

Return ONLY a JSON object mapping every word (spelled EXACTLY as given, lowercase) to its short definition:
{ "word1": "short definition", ... }`;
}

/** One AI call for a batch of rows → { word: shortDefinition }. */
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
        max_tokens: 1500,
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
        max_tokens: 1500,
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
  for (const [word, def] of Object.entries(obj)) {
    if (typeof def === 'string' && def.trim()) out[word.toLowerCase()] = def.trim().slice(0, 200);
  }
  return out;
}

/** Fetch every cached word without a short_definition (paged). */
async function fetchPending() {
  const pending = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('word_cache')
      .select('word, definition, short_definition')
      .order('word', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      if (!r.short_definition || !r.short_definition.trim()) pending.push(r);
    }
    if (data.length < PAGE) break;
  }
  return pending;
}

async function main() {
  const provider = GOOGLE_API_KEY ? 'google' : 'anthropic';
  console.log(`Scanning word_cache… (provider=${provider}${DRY_RUN ? ', DRY RUN' : ''})`);
  let pending = await fetchPending();
  if (LIMIT) pending = pending.slice(0, LIMIT);
  console.log(`${pending.length} word(s) need a short_definition.`);
  if (!pending.length || DRY_RUN) {
    if (DRY_RUN && pending.length) {
      console.log(pending.slice(0, 20).map((r) => r.word).join(', ') + (pending.length > 20 ? ' …' : ''));
    }
    return;
  }

  const batches = [];
  for (let i = 0; i < pending.length; i += BATCH) batches.push(pending.slice(i, i + BATCH));

  let done = 0, failed = 0;
  const queue = [...batches];
  async function worker() {
    for (;;) {
      const rows = queue.shift();
      if (!rows) return;
      try {
        const defs = await generateBatch(rows);
        for (const row of rows) {
          const def = defs[row.word.toLowerCase()];
          if (!def) {
            failed++;
            console.warn(`✗ ${row.word}: missing from batch response`);
            continue;
          }
          const { error } = await supabase
            .from('word_cache')
            .update({ short_definition: def })
            .eq('word', row.word);
          if (error) {
            failed++;
            console.warn(`✗ ${row.word}: ${error.message}`);
            continue;
          }
          done++;
          console.log(`✓ ${row.word} → ${def}`);
        }
      } catch (err) {
        failed += rows.length;
        console.warn(`✗ batch of ${rows.length} (${rows[0].word}…): ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nDone. Updated ${done}, failed ${failed}.`);
  if (failed) console.log('Re-run to retry the failed ones (idempotent).');
}

main().catch((e) => { console.error(e); process.exit(1); });
