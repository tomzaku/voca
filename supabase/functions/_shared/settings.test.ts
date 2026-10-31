import { describe, expect, it } from 'vitest';
import { cleanDress, fromSettings } from './settings';

describe('cleanDress', () => {
  it('keeps the known parts as short strings', () => {
    expect(cleanDress({ outfit: 'aoDai', outfitColor: 'purple', hat: 'nonLa', back: 'gui' }))
      .toEqual({ outfit: 'aoDai', outfitColor: 'purple', hat: 'nonLa', back: 'gui' });
  });
  it('drops unknown keys, long values and non-strings', () => {
    expect(cleanDress({ outfit: 'x'.repeat(25), hat: 7, admin: true, hair: 'longhair' })).toEqual({ hair: 'longhair' });
  });
  it('stores nothing for something that isn’t a look', () => {
    expect(cleanDress('aoDai')).toBeNull();
    expect(cleanDress([1, 2])).toBeNull();
    expect(cleanDress({})).toBeNull();
  });
});

describe('fromSettings', () => {
  it('writes the look to its column, cleaned', () => {
    expect(fromSettings({ companionDress: { outfit: 'aoThe', extra: 'x' } })).toEqual({ companion_dress: { outfit: 'aoThe' } });
  });
});
