// The pairing rules: a translation is shown under its example only when the
// two line up one to one.
import { describe, expect, it } from 'vitest';
import { asExampleTranslations, exampleTranslationsPrompt, storedExampleTranslations } from './exampleTranslations.ts';

describe('asExampleTranslations', () => {
  it('keeps one trimmed line per example', () => {
    expect(asExampleTranslations([' Một. ', 'Hai.'], 2)).toEqual(['Một.', 'Hai.']);
  });

  it('drops an answer that would pair a line with the wrong sentence', () => {
    expect(asExampleTranslations(['Một.'], 2)).toBeNull();
    expect(asExampleTranslations(['Một.', 'Hai.', 'Ba.'], 2)).toBeNull();
    expect(asExampleTranslations(['Một.', '  '], 2)).toBeNull();
    expect(asExampleTranslations(['Một.', 2], 2)).toBeNull();
    expect(asExampleTranslations('Một.', 1)).toBeNull();
    expect(asExampleTranslations([], 0)).toBeNull();
  });
});

describe('storedExampleTranslations', () => {
  const examples = ['One.', 'Two.'];

  it('reads the language case-insensitively', () => {
    expect(storedExampleTranslations({ vietnamese: ['Một.', 'Hai.'] }, 'Vietnamese', examples)).toEqual(['Một.', 'Hai.']);
  });

  it('treats a language stored for different examples as missing', () => {
    expect(storedExampleTranslations({ vietnamese: ['Một.'] }, 'vietnamese', examples)).toBeNull();
    expect(storedExampleTranslations({}, 'vietnamese', examples)).toBeNull();
    expect(storedExampleTranslations(null, 'vietnamese', examples)).toBeNull();
  });
});

describe('exampleTranslationsPrompt', () => {
  it('numbers each word\'s examples and asks for every language', () => {
    const p = exampleTranslationsPrompt([{ word: 'abundant', examples: ['A.', 'B.'] }], ['Vietnamese', 'Spanish']);
    expect(p).toContain('"abundant":\n  1. A.\n  2. B.');
    expect(p).toContain('"vietnamese": ["…"], "spanish": ["…"]');
  });
});
