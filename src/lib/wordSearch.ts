// Word search, with no UI: how a query is cleaned up, what the search box
// suggests while it's empty, and what a lookup comes back with. The app's
// SearchModal and the world's library (Tàng Thư Lâu) both search through this.

import { getLearnLanguage } from './languages';
import { generateWordData, keyBySearchResult, recentCachedWords, UnknownWordError } from './wordService';
import type { VocabularyWord } from '../types';

/** Keep the whole phrase — phrasal verbs and idioms ("go on", "give up") are
 *  valid lookups; just lowercase and collapse stray whitespace. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type LookupResult =
  | { kind: 'found'; data: VocabularyWord }
  | { kind: 'unknown'; word: string; suggestions: string[] };

/**
 * Look a query up (cache-first, generated when new), keyed by the real word
 * it turned out to be (keyBySearchResult). Not a real word comes back as
 * 'unknown' with what the learner probably meant; anything else (offline,
 * network) throws.
 */
export async function lookupWord(query: string, signal?: AbortSignal): Promise<LookupResult> {
  try {
    return { kind: 'found', data: keyBySearchResult(await generateWordData(query, signal)) };
  } catch (err) {
    if (err instanceof UnknownWordError) return { kind: 'unknown', word: err.word, suggestions: err.suggestions };
    throw err;
  }
}

// Well-known idioms to show when none of the recent words bring one of their
// own — English only, since that's the language they're in.
const FALLBACK_IDIOMS = ['break the ice', 'piece of cake', 'under the weather'];

/**
 * What the placeholder types out: a mix of the learner's own recent words,
 * idioms, and a recent word's meaning in their mother language — so it shows
 * each kind of thing the box takes (a word, a phrase, the other language),
 * not just says so. Picked once, when the box opens.
 */
export function placeholderExamples(): string[] {
  const recent = recentCachedWords(8).reverse(); // newest first
  const words = recent.slice(0, 3).map((w) => w.headword || w.word);
  const idioms = recent.flatMap((w) => w.idioms?.slice(0, 1).map((i) => i.idiom) ?? []).slice(0, 2);
  if (idioms.length < 2 && getLearnLanguage() === 'English') {
    idioms.push(...FALLBACK_IDIOMS.filter((i) => !idioms.includes(i)).slice(0, 2 - idioms.length));
  }
  // A translation like "không ngừng, liên tục" — the first sense reads as a
  // search on its own.
  const meaning = recent.find((w) => w.translation)?.translation?.split(/[,;]/)[0].trim();
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    if (words[i]) out.push(words[i]);
    if (idioms[i]) out.push(idioms[i]);
    if (i === 0 && meaning) out.push(meaning);
  }
  return out;
}
