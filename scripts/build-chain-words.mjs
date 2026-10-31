// Builds the Word Chain dictionary (public/game/words-en.txt) from the
// `word-list` package (MIT, ~275k English words): single plain words of 3–15
// letters, one per line. The game fetches it when it opens, so it stays out of
// the app's own bundle.
//
//   node scripts/build-chain-words.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import wordListPath from 'word-list';

const words = readFileSync(wordListPath, 'utf8').split('\n').filter((w) => /^[a-z]{3,15}$/.test(w));
const out = new URL('../public/game/words-en.txt', import.meta.url);
writeFileSync(out, words.join('\n') + '\n');
console.log(`words-en.txt: ${words.length} words`);
