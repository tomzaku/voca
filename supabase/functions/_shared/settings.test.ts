import { describe, expect, it } from 'vitest';
import { cleanDress, cleanGoal, fromSettings } from './settings';

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

describe('cleanGoal', () => {
  it('keeps a whole number of words, capped', () => {
    expect(cleanGoal(10)).toBe(10);
    expect(cleanGoal(7.6)).toBe(8);
    expect(cleanGoal(5000)).toBe(100);
  });
  it('clears anything that isn’t a positive number', () => {
    expect(cleanGoal(0)).toBeNull();
    expect(cleanGoal(-3)).toBeNull();
    expect(cleanGoal('10')).toBeNull();
    expect(cleanGoal(null)).toBeNull();
    expect(cleanGoal(Number.NaN)).toBeNull();
  });
  it('is what fromSettings writes', () => {
    expect(fromSettings({ dailyGoal: 250 })).toEqual({ daily_goal: 100 });
  });
});
