// asUsage is the only thing between model output and a table every user reads.

import { describe, expect, it } from 'vitest';
import { asUsage } from './sanitize.ts';

describe('asUsage', () => {
  it('turns garbage into the complete empty shape', () => {
    expect(asUsage('nope')).toEqual({
      cefr: null, frequency: null, syllables: null, labels: [], grammar: [], patterns: [], forms: [],
      variants: [], mistakes: [], confusables: [], synonymNotes: [], phrasalVerbs: [], origin: null,
    });
  });

  it('keeps only real CEFR levels and frequency bands', () => {
    expect(asUsage({ cefr: 'b2', frequency: 3 })).toMatchObject({ cefr: 'B2', frequency: 3 });
    expect(asUsage({ cefr: 'B3', frequency: 7 })).toMatchObject({ cefr: null, frequency: null });
  });

  it('drops records missing a required field', () => {
    const u = asUsage({
      patterns: [{ pattern: 'decide to do sth', example: 'She decided to leave.' }, { pattern: 'decide on sth' }],
      mistakes: [{ wrong: 'discuss about it', right: 'discuss it' }, { wrong: 'x' }],
    });
    expect(u.patterns).toEqual([{ pattern: 'decide to do sth', example: 'She decided to leave.' }]);
    expect(u.mistakes).toEqual([{ wrong: 'discuss about it', right: 'discuss it', why: '' }]);
  });

  it('drops a "mistake" whose correction is the same sentence', () => {
    expect(asUsage({ mistakes: [{ wrong: 'What colour?', right: 'What colour?', why: 'This is correct.' }] }).mistakes).toEqual([]);
  });

  it('lowercases and dedupes labels', () => {
    expect(asUsage({ labels: ['Formal', 'formal ', 3, 'UK'] }).labels).toEqual(['formal', 'uk']);
  });

  it('round-trips its own output', () => {
    const u = asUsage({ cefr: 'A1', forms: [{ label: 'past tense', form: 'went' }], origin: 'Old English.' });
    expect(asUsage(u)).toEqual(u);
  });
});
