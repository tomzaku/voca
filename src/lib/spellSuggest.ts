// "Did you mean…" candidates, found locally against the bundled CEFR list — no
// network, no tokens. The server's AI suggestions are better (it can reason
// about what you meant); these fill in when it returned none, and pad the list
// out with near-spellings it didn't think of.
//
// Note this list is only ~8500 common words, so a miss means nothing: plenty of
// real words aren't in it. Never use absence from it to judge a word invalid —
// that's the model's job (see the `word` edge function).

import { CEFR_WORDS } from '../data/cefrWords';

/**
 * Damerau-Levenshtein distance between `a` and `b`, abandoned as soon as it's
 * certain to exceed `max` (returning `max + 1`). The cutoff is what makes
 * scanning the whole word list per search cheap enough to do synchronously.
 *
 * Transposition counts as ONE edit, not two — that's the whole reason this isn't
 * plain Levenshtein. Swapped letters are the most common typo there is, and
 * charging 2 for "recieve"→"receive" puts it behind "relieve" (a 1-edit
 * substitution), i.e. it ranks a real but unrelated word above the intended one.
 */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  // Three rows: the transposition case needs the row before last.
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      // Adjacent letters swapped ("ie" ↔ "ei") — one edit, not two.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      row.push(v);
      if (v < best) best = v;
    }
    // Every cell in this row is already over budget, and distance never
    // decreases as rows advance — no point finishing.
    if (best > max) return max + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

/**
 * Real words spelled close to `word`, closest first. Ties break toward the more
 * common word (lower CEFR level), since that's the likelier intent.
 */
export function similarWords(word: string, limit = 6): string[] {
  const w = word.toLowerCase().trim();
  if (!w) return [];

  // Two edits on a short word lands on something unrelated ("cat" → "dog" is 3,
  // but "cat" → "cut" → "cup" is already a different idea at 2), so scale the
  // budget with length.
  const max = w.length <= 4 ? 1 : 2;

  const scored: { word: string; distance: number; level: number }[] = [];
  for (const { word: candidate, level } of CEFR_WORDS) {
    if (candidate === w) continue;
    const distance = editDistance(w, candidate, max);
    if (distance <= max) scored.push({ word: candidate, distance, level });
  }

  scored.sort((a, b) => a.distance - b.distance || a.level - b.level || a.word.localeCompare(b.word));
  return scored.slice(0, limit).map((s) => s.word);
}

/**
 * What to offer for a rejected `word`: the server's suggestions if it had any,
 * otherwise locally-found near-spellings.
 *
 * Deliberately NOT a merge. The server knows what you meant; edit distance only
 * knows what looks similar, and the word list is small enough that a miss
 * produces confident nonsense ("wierd" → "bird", "were", "where"). Padding good
 * suggestions with those makes the page worse, so the local list only gets used
 * when the alternative is showing nothing at all.
 */
export function mergeSuggestions(word: string, fromServer: string[], limit = 6): string[] {
  const self = word.toLowerCase().trim();
  const clean = (words: string[]) => {
    const seen = new Set([self]);
    const out: string[] = [];
    for (const s of words) {
      const key = s.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
      if (out.length === limit) break;
    }
    return out;
  };

  const server = clean(fromServer);
  return server.length > 0 ? server : clean(similarWords(word, limit));
}
