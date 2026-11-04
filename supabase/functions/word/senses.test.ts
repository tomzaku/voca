// A word's other parts of speech come from model output that is stored for
// every user, and their IPA from eSpeak read behind a lead-in word — both
// pinned here.

import { describe, expect, it } from 'vitest';
import { asSenses } from './sanitize.ts';
import { ipaContext, stripLeadIn } from './senses.ts';

describe('asSenses', () => {
  const sense = (partOfSpeech: string, extra = {}) => ({ partOfSpeech, definition: 'd', examples: ['e'], ...extra });

  it('drops the primary part of speech and duplicates', () => {
    const out = asSenses([sense('Verb'), sense('noun'), sense('noun')], 'verb');
    expect(out.map((s) => s.partOfSpeech)).toEqual(['noun']);
  });

  it('drops entries without a part of speech or definition', () => {
    expect(asSenses([{ partOfSpeech: 'noun' }, { definition: 'x' }, 'noun', null], 'verb')).toEqual([]);
  });

  it('keeps at most three, and at most three examples each', () => {
    const out = asSenses([sense('noun', { examples: ['a', 'b', 'c', 'd'] }), sense('adjective'), sense('adverb'), sense('preposition')], 'verb');
    expect(out).toHaveLength(3);
    expect(out[0].examples).toEqual(['a', 'b', 'c']);
  });

  it('keeps only well-formed translations', () => {
    const [s] = asSenses([sense('noun', { translations: { Vietnamese: 'sự sử dụng', 'x;drop': 'no', chinese: 3 } })], 'verb');
    expect(s.translations).toEqual({ vietnamese: 'sự sử dụng' });
  });

  it('is empty for anything but an array', () => {
    expect(asSenses(undefined, 'verb')).toEqual([]);
    expect(asSenses({ partOfSpeech: 'noun' }, 'verb')).toEqual([]);
  });
});

describe('ipaContext', () => {
  it('leads a verb with "to", a noun with "the", an adjective with "is"', () => {
    expect(ipaContext('use', 'verb')).toEqual({ text: 'to use', drop: 1 });
    expect(ipaContext('use', 'Noun')).toEqual({ text: 'the use', drop: 1 });
    expect(ipaContext('content', 'adjective')).toEqual({ text: 'is content', drop: 1 });
    expect(ipaContext('give up', 'phrasal verb')).toEqual({ text: 'to give up', drop: 1 });
  });

  it('reads anything else, or no part of speech, bare', () => {
    expect(ipaContext('well', 'adverb')).toEqual({ text: 'well', drop: 0 });
    expect(ipaContext('well', undefined)).toEqual({ text: 'well', drop: 0 });
  });
});

describe('stripLeadIn', () => {
  it('drops the lead-in and wraps the rest in slashes', () => {
    expect(stripLeadIn('tə jˈuːz', 1)).toBe('/jˈuːz/');
    expect(stripLeadIn('tə ɡˈɪv ˈʌp', 1)).toBe('/ɡˈɪv ˈʌp/');
    expect(stripLeadIn(' lˈaɪv ', 0)).toBe('/lˈaɪv/');
  });

  it('is null when nothing is left', () => {
    expect(stripLeadIn('tə', 1)).toBeNull();
  });
});
