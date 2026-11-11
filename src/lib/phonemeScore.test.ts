// The scoring math, on hand-built recogniser output: no model needed.

import { describe, expect, it } from 'vitest';
import { forcedAlign, greedyDecode, logSoftmax, makeVocab, scoreBest, scoreWord, tokenizeIpa, type Frames } from './phonemeScore';

// A slice of the real vocabulary's shape: id 0 is the CTC blank.
const vocab = makeVocab({ '<pad>': 0, 'θ': 1, 's': 2, 'ɪ': 3, 'ŋ': 4, 'k': 5, 'i': 6, 'iː': 7, 'aɪ': 8, 'ɑːɹ': 9, 'ɑː': 10, 'ɹ': 11, 'i5': 12 });

/** Frames where each listed token is near-certain in turn ('_' = blank). */
function frames(seq: string[]): Frames {
  const V = vocab.tokens.length;
  const logp = new Float32Array(seq.length * V).fill(-12);
  seq.forEach((tok, t) => { logp[t * V + (tok === '_' ? 0 : vocab.ids.get(tok)!)] = 12; });
  return logSoftmax({ logp, T: seq.length, V });
}

describe('tokenizeIpa', () => {
  it('strips stress and slashes, keeps diphthongs whole', () => {
    expect(tokenizeIpa('/θˈaɪŋk/', vocab)).toEqual(['θ', 'aɪ', 'ŋ', 'k']);
  });
  it('splits r-coloured combos into their parts', () => {
    expect(tokenizeIpa('/θˈɑːɹ/', vocab)).toEqual(['θ', 'ɑː', 'ɹ']);
  });
});

describe('greedyDecode', () => {
  it('collapses repeats and blanks, and ignores non-English phones', () => {
    expect(greedyDecode(frames(['_', 'θ', 'θ', '_', 'i5', 'ŋ', '_', 'k']), vocab)).toEqual(['θ', 'ŋ', 'k']);
  });
});

describe('forcedAlign', () => {
  it('places each target on its frames', () => {
    expect(forcedAlign(frames(['_', 'θ', 'ɪ', 'ɪ', 'ŋ', 'k', '_']), [1, 3, 4, 5])).toEqual([[1, 1], [2, 3], [4, 4], [5, 5]]);
  });
  it('is null when the clip is shorter than the target', () => {
    expect(forcedAlign(frames(['θ']), [1, 3])).toBeNull();
  });
});

describe('scoreWord', () => {
  it('scores a clean "think" as all good', () => {
    const r = scoreWord(frames(['_', 'θ', 'ɪ', 'ŋ', 'k', '_']), vocab, '/θˈɪŋk/')!;
    expect(r.phones.map((p) => p.status)).toEqual(['good', 'good', 'good', 'good']);
    expect(r.score).toBe(100);
  });
  it('flags θ said as s, and says what was heard', () => {
    const r = scoreWord(frames(['_', 's', 'ɪ', 'ŋ', 'k', '_']), vocab, '/θˈɪŋk/')!;
    expect(r.phones[0]).toMatchObject({ ipa: 'θ', status: 'wrong', heard: 's' });
    expect(r.phones.slice(1).every((p) => p.status === 'good')).toBe(true);
    expect(r.heard).toBe('sɪŋk');
  });
  it('accepts /i/ for /ɪ/ as an accent, but not /iː/ — ship vs sheep', () => {
    expect(scoreWord(frames(['_', 'θ', 'i', 'ŋ', 'k']), vocab, '/θɪŋk/')!.phones[1].status).toBe('good');
    expect(scoreWord(frames(['_', 'θ', 'iː', 'ŋ', 'k']), vocab, '/θɪŋk/')!.phones[1]).toMatchObject({ status: 'wrong', heard: 'iː' });
  });
  it('counts a combo token as saying its parts', () => {
    const r = scoreWord(frames(['_', 'ɑːɹ', 'ɑːɹ', '_']), vocab, '/ɑːɹ/')!;
    expect(r.phones.map((p) => p.status)).toEqual(['good', 'good']);
  });
});

describe('a dropped sound', () => {
  it('is wrong, with nothing heard', () => {
    const r = scoreWord(frames(['_', 'θ', 'ɪ', 'ŋ', '_', '_']), vocab, '/θɪŋk/')!;
    expect(r.phones[3]).toMatchObject({ ipa: 'k', status: 'wrong', heard: '' });
  });
});

describe('scoreBest', () => {
  it('keeps the accent the speaker was closer to', () => {
    const r = scoreBest(frames(['_', 'ɑː', '_']), vocab, ['/ɑːɹ/', '/ɑː/'])!;
    expect(r.ipa).toBe('/ɑː/');
    expect(r.score).toBe(100);
  });
});
