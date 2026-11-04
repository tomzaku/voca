#!/usr/bin/env node
// Translate the Listen podcasts (src/data/englishListening.ts) sentence by
// sentence, for the "Translation" toggle on the podcast player: the sentence
// being said shows its translation under it.
//
// Writes src/data/podcastTranslations/<lang>/<podcast id>.json as
// { "<English sentence>": "<translation>" } — keyed by the sentence text, cut
// with the same splitSentences the player uses, so an edited sentence simply
// has no translation until this is run again. Files are bundled with the app
// (one lazy chunk per episode, loaded only when the toggle is on).
//
// Idempotent: only sentences missing from an episode's file are sent, and the
// whole episode goes along as context so the translation reads naturally.
//
// Requires GOOGLE_API_KEY (Gemini) or ANTHROPIC_API_KEY in .env.
//
// Usage:
//   npm run podcasts:translate                       # every missing sentence, Vietnamese
//   npm run podcasts:translate -- --only pod-1,pod-2 --dry-run

import fs from 'node:fs';
import path from 'node:path';
import { splitSentences } from '../src/lib/speechChunks.ts';

const { GOOGLE_API_KEY, ANTHROPIC_API_KEY, AI_MODEL } = process.env;
const args = process.argv.slice(2);
const strArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const DRY_RUN = args.includes('--dry-run');
const ONLY = strArg('--only')?.split(',');
// Folder name → the language as the model is told it.
const LANGS = { vi: 'Vietnamese' };
const LANG = strArg('--lang') ?? 'vi';
const CONCURRENCY = 3;

if (!LANGS[LANG]) { console.error(`Unknown --lang ${LANG} (have: ${Object.keys(LANGS).join(', ')})`); process.exit(1); }
if (!DRY_RUN && !GOOGLE_API_KEY && !ANTHROPIC_API_KEY) {
  console.error('Missing GOOGLE_API_KEY or ANTHROPIC_API_KEY (needed unless --dry-run).');
  process.exit(1);
}

const OUT_DIR = path.resolve(import.meta.dirname, '../src/data/podcastTranslations', LANG);
fs.mkdirSync(OUT_DIR, { recursive: true });

const SYSTEM = `You translate English listening material for ${LANGS[LANG]}-speaking learners of English. Translate naturally and faithfully, one sentence at a time, keeping names as they are. Output only JSON.`;

function prompt(title, all, missing) {
  return `Podcast: "${title}"

Whole script, for context:
${all.join(' ')}

Translate each numbered sentence below into ${LANGS[LANG]}:
${missing.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return ONLY a JSON array of ${missing.length} strings — the translations, in the same order, one per sentence.`;
}

async function complete(user) {
  if (GOOGLE_API_KEY) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GOOGLE_API_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL || 'gemini-2.5-flash',
        max_tokens: 16000,
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }],
        reasoning_effort: 'none', // thinking tokens count against max_tokens
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).choices?.[0]?.message?.content ?? '';
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: AI_MODEL || 'claude-sonnet-5', max_tokens: 16000, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).content?.[0]?.text ?? '';
}

async function translateEpisode(p) {
  const file = path.join(OUT_DIR, `${p.id}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const sentences = splitSentences(p.script);
  const missing = [...new Set(sentences.filter((s) => !existing[s]))];
  if (!missing.length) return { id: p.id, sent: 0 };
  if (DRY_RUN) return { id: p.id, sent: missing.length };

  const text = await complete(prompt(p.title, sentences, missing));
  const out = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
  if (!Array.isArray(out) || out.length !== missing.length || out.some((t) => typeof t !== 'string' || !t.trim())) {
    throw new Error(`${p.id}: expected ${missing.length} translations, got ${Array.isArray(out) ? out.length : typeof out}`);
  }
  missing.forEach((s, i) => { existing[s] = out[i].trim(); });
  // Script order, and only sentences still in the script — an edit drops the old line.
  const ordered = Object.fromEntries(sentences.filter((s) => existing[s]).map((s) => [s, existing[s]]));
  fs.writeFileSync(file, `${JSON.stringify(ordered, null, 2)}\n`);
  return { id: p.id, sent: missing.length };
}

const { podcasts } = await import('../src/data/englishListening.ts');
const queue = ONLY ? podcasts.filter((p) => ONLY.includes(p.id)) : [...podcasts];
let failed = 0, sent = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let p = queue.shift(); p; p = queue.shift()) {
    try {
      const r = await translateEpisode(p);
      sent += r.sent;
      console.log(`${r.id}: ${r.sent ? `${r.sent} sentence(s) ${DRY_RUN ? 'to translate' : 'translated'}` : 'up to date'}`);
    } catch (err) {
      failed++;
      console.error(`${p.id}: ${err.message}`);
    }
  }
}));
console.log(`${DRY_RUN ? 'Would translate' : 'Translated'} ${sent} sentence(s)${failed ? `, ${failed} episode(s) failed — run again to retry` : ''}.`);
if (failed) process.exitCode = 1;
