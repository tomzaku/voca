// The rules of the IPA page's minimal-pairs listening drill, with no UI: a
// round plays one word of a pair learners often confuse (ship / sheep) and
// asks which was heard. The IPA page and the world's Duyệt Thị Đường theatre
// both draw rounds from here.

import { MINIMAL_PAIRS, pairsForSymbol, type MinimalPair } from '../data/ipa';

export interface PairRound {
  pair: MinimalPair;
  /** The side that's played. */
  correct: 'a' | 'b';
  /** The order the two words are offered in. */
  order: ['a', 'b'] | ['b', 'a'];
}

export function pairKey(pair: MinimalPair): string {
  return `${pair.a.word}-${pair.b.word}`;
}

/** The pairs to drill: those contrasting `focusSymbol`, or every pair. */
export function pairPool(focusSymbol?: string | null): MinimalPair[] {
  if (!focusSymbol) return MINIMAL_PAIRS;
  const filtered = pairsForSymbol(focusSymbol);
  return filtered.length > 0 ? filtered : MINIMAL_PAIRS;
}

/** A fresh round from `pool`, not repeating the pair just played. */
export function randomRound(pool: MinimalPair[], avoidKey?: string, rand: () => number = Math.random): PairRound {
  let pair: MinimalPair;
  do {
    pair = pool[Math.floor(rand() * pool.length)];
  } while (pool.length > 1 && pairKey(pair) === avoidKey);
  return {
    pair,
    correct: rand() < 0.5 ? 'a' : 'b',
    order: rand() < 0.5 ? ['a', 'b'] : ['b', 'a'],
  };
}
