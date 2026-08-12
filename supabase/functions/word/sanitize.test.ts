// The model resolves "${word}" (which may be English, mother-tongue, or
// learn-language input) to an English cache key in the same call that
// generates the rest of the entry — this sanitizer is the only thing that has
// to trust what it says that key is.

import { describe, expect, it } from 'vitest';
import { asSeedWord } from './sanitize.ts';

describe('asSeedWord', () => {
  it('lowercases and trims the resolved key', () => {
    expect(asSeedWord('  Dog  ', 'chó')).toBe('dog');
  });

  it('collapses internal whitespace', () => {
    expect(asSeedWord('ice   cream', 'kem')).toBe('ice cream');
  });

  it('caps length at 60 characters', () => {
    const long = 'a'.repeat(100);
    expect(asSeedWord(long, 'fallback').length).toBe(60);
  });

  it('falls back to the literal search term when missing or blank', () => {
    expect(asSeedWord(undefined, 'chó')).toBe('chó');
    expect(asSeedWord(null, 'chó')).toBe('chó');
    expect(asSeedWord('   ', 'chó')).toBe('chó');
    expect(asSeedWord(42, 'chó')).toBe('chó');
  });
});
