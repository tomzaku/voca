// Writes the built-in collections — Curated, CEFR Level 1–6, the topics — as
// JSON the edge functions can read (supabase/functions/_shared/
// systemCollections.json): { "<collection id>": ["word", …] }.
//
// They live in the app's code (src/data, assembled in src/lib/collections.ts),
// but the `questions` function has to pick from whichever one a learner is
// studying, server-side, without the client sending the words. Run after
// changing any of them: `npm run export:collections`. A test
// (src/lib/systemCollections.test.ts) fails if the JSON falls behind.

import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';

const entry = `
  import { WORD_LIST } from './src/data/curatedWords.ts';
  import { CEFR_WORDS } from './src/data/cefrWords.ts';
  import { TOPIC_COLLECTIONS } from './src/data/topicWords.ts';
  const out = { curated: WORD_LIST.map((w) => w.word) };
  for (let level = 1; level <= 6; level++) out['level-' + level] = CEFR_WORDS.filter((w) => w.level === level).map((w) => w.word);
  for (const t of TOPIC_COLLECTIONS) out[t.id] = t.words;
  export default out;
`;

const res = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'error',
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(res.outputFiles[0].text).toString('base64'));
const path = 'supabase/functions/_shared/systemCollections.json';
writeFileSync(path, JSON.stringify(mod.default) + '\n');
const ids = Object.keys(mod.default);
console.log(`wrote ${path}: ${ids.length} collections, ${ids.reduce((n, id) => n + mod.default[id].length, 0)} words`);
