import { describe, expect, it } from 'vitest';
import { festiveActive, inLunarSeason, nextLunarNewYear } from './festive';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('inLunarSeason', () => {
  it('runs from three weeks before Tết 2027 (6 Feb) to the 15th day', () => {
    expect(inLunarSeason(at(2027, 1, 15))).toBe(false);  // 22 days before
    expect(inLunarSeason(at(2027, 1, 16))).toBe(true);   // 21 days before
    expect(inLunarSeason(at(2027, 2, 6))).toBe(true);
    expect(inLunarSeason(at(2027, 2, 20))).toBe(true);   // the 15th day
    expect(inLunarSeason(at(2027, 2, 21))).toBe(false);
  });

  it('is off in the rest of the year', () => {
    expect(inLunarSeason(at(2026, 11, 2))).toBe(false);
    expect(inLunarSeason(at(2027, 7, 1))).toBe(false);
  });
});

describe('festiveActive', () => {
  it('follows the season on auto, and the setting otherwise', () => {
    expect(festiveActive('auto', at(2027, 2, 6))).toBe(true);
    expect(festiveActive('auto', at(2026, 11, 2))).toBe(false);
    expect(festiveActive('on', at(2026, 11, 2))).toBe(true);
    expect(festiveActive('off', at(2027, 2, 6))).toBe(false);
  });
});

describe('nextLunarNewYear', () => {
  it('names the coming Tết, and keeps the current one through its season', () => {
    expect(nextLunarNewYear(at(2026, 11, 2))?.getTime()).toBe(new Date(2027, 1, 6).getTime());
    expect(nextLunarNewYear(at(2027, 2, 18))?.getTime()).toBe(new Date(2027, 1, 6).getTime());
  });
});
