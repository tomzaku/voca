import { useEffect, useState } from 'react';
import { fetchWordUsage } from '../lib/wordApi';
import { getLearnLanguage } from '../lib/languages';
import type { WordUsage } from '../types';

// Usage notes per word for this session — flipping back to a card, or opening
// the same word in a peek, shouldn't ask again.
const memo = new Map<string, WordUsage>();

// The bundled English Vocabulary Profile list (src/data/cefrWords.ts) is real
// data; the server's CEFR is the model's estimate. Prefer the list where it has
// the word. Loaded on first use, since it's thousands of entries.
let cefrList: Promise<Map<string, string>> | null = null;
const LEVEL_NAMES = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
function cefrFromList(): Promise<Map<string, string>> {
  cefrList ??= import('../data/cefrWords').then(({ CEFR_WORDS }) =>
    new Map(CEFR_WORDS.map((w) => [w.word.toLowerCase(), LEVEL_NAMES[w.level]])));
  return cefrList;
}

/**
 * The learner's-dictionary notes for `word` (its English seed), or null while
 * loading / when there are none. Only asked for when the learner is learning
 * English: the notes describe the English word, and a Spanish learner's card
 * shows a Spanish headword.
 */
export function useWordUsage(word: string): WordUsage | null {
  const key = word.toLowerCase();
  const english = getLearnLanguage().toLowerCase() === 'english';
  // Tagged with its word, so a card that has moved on never shows the last
  // word's notes while this one's load.
  const [loaded, setLoaded] = useState<{ key: string; usage: WordUsage } | null>(null);

  useEffect(() => {
    if (!english || !key || memo.has(key)) return;
    const ctl = new AbortController();
    Promise.all([fetchWordUsage(key, ctl.signal), cefrFromList().catch(() => new Map<string, string>())])
      .then(([u, list]) => {
        if (!u || ctl.signal.aborted) return;
        const merged = { ...u, cefr: list.get(key) ?? u.cefr };
        // An empty answer may just mean "not generated yet" for a visitor —
        // worth asking again after they sign in.
        if (u.syllables || u.patterns.length || u.forms.length) memo.set(key, merged);
        setLoaded({ key, usage: merged });
      });
    return () => ctl.abort();
  }, [key, english]);

  if (!english) return null;
  return memo.get(key) ?? (loaded?.key === key ? loaded.usage : null);
}
