import { describe, expect, it } from 'vitest';
import { chainDictionary, checkChainWord, initialChain, playChain } from './wordChain';

const dict = chainDictionary(['apple', 'elephant', 'tiger', 'rabbit', 'egg', 'ice cream', 'go', 'eagle']);

describe('checkChainWord', () => {
  const s = initialChain('apple');           // next word starts with "e"
  it('takes a word on the letter, in the dictionary, unused', () => {
    expect(checkChainWord('Elephant ', s, dict)).toBe('ok');
  });
  it('says why a word does not count', () => {
    expect(checkChainWord('tiger', s, dict)).toBe('letter');
    expect(checkChainWord('ex', s, dict)).toBe('short');
    expect(checkChainWord('eqzz', s, dict)).toBe('unknown');
    expect(checkChainWord(null, s, dict)).toBe('time');
    expect(checkChainWord('apple', { ...s, letter: 'a' }, dict)).toBe('used');
  });
  it('keeps multi-word and short entries out of the dictionary', () => {
    expect(dict.has('icecream')).toBe(false);
    expect(dict.has('go')).toBe(false);
  });
});

describe('playChain', () => {
  it('a good word moves the letter on and passes the turn', () => {
    const s = playChain(initialChain('apple'), 'elephant', dict);
    expect(s.letter).toBe('t');
    expect(s.turn).toBe(1);
    expect(s.words).toEqual(['apple', 'elephant']);
    expect(s.last).toEqual({ player: 0, word: 'elephant', verdict: 'ok' });
  });

  it('a bad word costs a life and keeps the letter', () => {
    const s = playChain(initialChain('apple'), 'tiger', dict);
    expect(s.lives).toEqual([2, 3]);
    expect(s.letter).toBe('e');
    expect(s.turn).toBe(1);
  });

  it('losing the last life loses the game, and nothing counts after', () => {
    let s = initialChain('apple');
    for (let i = 0; i < 6; i++) s = playChain(s, null, dict);
    expect(s.loser).toBe(0);
    expect(playChain(s, 'eagle', dict)).toBe(s);
  });
});
