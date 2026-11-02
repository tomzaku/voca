import { beforeEach, describe, expect, it } from 'vitest';
import { drawFortune, FORTUNES, todaysFortune } from './fortunes';
import { makePhrase, DON_SCALE } from './donTune';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

describe('fortunes', () => {
  it('numbers every stick once', () => {
    expect(new Set(FORTUNES.map((f) => f.n)).size).toBe(FORTUNES.length);
  });

  it('gives one stick a day: shaking again the same day returns it', () => {
    const day = new Date(2027, 1, 6, 9);
    const first = drawFortune(day, () => 0.1);
    expect(drawFortune(new Date(2027, 1, 6, 21), () => 0.9)).toEqual(first);
    expect(todaysFortune(day)).toEqual(first);
  });

  it('lets a new day draw again', () => {
    drawFortune(new Date(2027, 1, 6), () => 0.1);
    expect(todaysFortune(new Date(2027, 1, 7))).toBeNull();
    expect(drawFortune(new Date(2027, 1, 7), () => 0.99).n).toBe(FORTUNES[FORTUNES.length - 1].n);
  });
});

describe('đờn phrases', () => {
  it('stay in the five-note scale and end on a held, bent note', () => {
    let seed = 7;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 20; i++) {
      const p = makePhrase(rand);
      expect(p.notes.every((n) => (DON_SCALE as readonly number[]).includes(n.midi))).toBe(true);
      expect(p.notes[p.notes.length - 1].bend).toBe(true);
      expect(p.notes.slice(0, -1).some((n) => n.bend)).toBe(false);
      expect(p.seconds).toBeGreaterThan(p.notes[p.notes.length - 1].at);
    }
  });
});
