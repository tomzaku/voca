#!/usr/bin/env node
// Seed the `lexicon` table — every WordNet 3.1 lemma with the parts of speech
// it has — from the wordnet-db dev dependency. The `word` function checks a
// generated sense against it before storing it (see word/senseRows.ts).
//
// Idempotent: upserts on (word, pos), so a re-run only adds. About 155k rows.
//
// Requires env (.env is read by the npm script):
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Usage: npm run lexicon:build

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if (!SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const svc = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dict = path.join(path.dirname(createRequire(import.meta.url).resolve('wordnet-db/package.json')), 'dict');

const FILES = { noun: 'index.noun', verb: 'index.verb', adjective: 'index.adj', adverb: 'index.adv' };
const rows = [];
for (const [pos, file] of Object.entries(FILES)) {
  for (const line of fs.readFileSync(path.join(dict, file), 'utf8').split('\n')) {
    // Lines starting with a space are the licence header.
    if (!line || line.startsWith(' ')) continue;
    rows.push({ word: line.slice(0, line.indexOf(' ')).replace(/_/g, ' ').toLowerCase(), pos });
  }
}

const BATCH = 2000;
for (let i = 0; i < rows.length; i += BATCH) {
  const { error } = await svc.from('lexicon').upsert(rows.slice(i, i + BATCH), { onConflict: 'word,pos', ignoreDuplicates: true });
  if (error) throw error;
  process.stdout.write(`\r${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
}
console.log('\ndone');
