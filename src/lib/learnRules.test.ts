import { describe, expect, it } from 'vitest';
import { choiceOptions, freeLetterPositions, guessMatches, ONE_SHOT, scrambleTiles } from './learnRules';

describe('guessMatches', () => {
  it('ignores case and surrounding spaces', () => {
    expect(guessMatches('  Bridge ', 'bridge')).toBe(true);
    expect(guessMatches('bridges', 'bridge')).toBe(false);
  });
});

describe('freeLetterPositions', () => {
  it('gives away about 40% of the letters, at least one', () => {
    expect(freeLetterPositions('market').size).toBe(2);
    expect(freeLetterPositions('a').size).toBe(1);
  });
  it('never spends the budget on spaces or hyphens', () => {
    for (let i = 0; i < 30; i++) {
      for (const p of freeLetterPositions('pay off')) expect('pay off'[p]).not.toBe(' ');
    }
  });
});

describe('scrambleTiles', () => {
  it('keeps every letter and never hands back the word in order', () => {
    for (let i = 0; i < 50; i++) {
      const tiles = scrambleTiles('lotus');
      expect(tiles.map((t) => t.char).sort().join('')).toBe('lostu');
      expect(tiles.map((t) => t.char).join('')).not.toBe('lotus');
    }
  });
});

describe('choiceOptions', () => {
  const pool = ['river', 'bridge', 'Bridge', 'market', 'temple', 'lotus', 'citadel'];
  it('offers the answer and three distinct distractors', () => {
    const opts = choiceOptions('bridge', pool);
    expect(opts).toHaveLength(4);
    expect(opts).toContain('bridge');
    expect(new Set(opts.map((o) => o.toLowerCase())).size).toBe(4);
  });
  it('prefers distractors close to the answer in length', () => {
    const opts = choiceOptions('river', ['lotus', 'temple', 'market', 'a', 'extraordinarily']);
    expect(opts).not.toContain('extraordinarily');
  });
});

describe('ONE_SHOT', () => {
  it('ends the round on a miss only in the pick-one and type-once games', () => {
    expect(Object.entries(ONE_SHOT).filter(([, v]) => v).map(([k]) => k).sort()).toEqual(['choice', 'letters']);
  });
});
