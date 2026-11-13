import { describe, expect, it } from 'vitest';
import { karaokeQueue, starsFor, summarize, turnLimitMs } from './karaoke';

const line = (text: string, start = 0, end = 3) => ({ start, end, text });

describe('karaokeQueue', () => {
  it('sings real lines and passes over one-word cries', () => {
    expect(karaokeQueue([line('Hello, it’s me'), line('Oh'), line('Yeah —'), line('I was wondering')])).toEqual([0, 3]);
  });
});

describe('turnLimitMs', () => {
  it('gives twice the line plus a start, within bounds', () => {
    expect(turnLimitMs(line('a b', 10, 14))).toBe(12_000);
    expect(turnLimitMs(line('a b', 10, 14), 0.5)).toBe(20_000);
    expect(turnLimitMs(line('a b', 0, 0.5))).toBe(6000);
    expect(turnLimitMs(line('a b', 0, 60))).toBe(30_000);
  });
});

describe('summarize', () => {
  it('scores the mean, counts hits, and lists the weakest lines worst first', () => {
    const s = summarize([
      { index: 0, accuracy: 100 },
      { index: 1, accuracy: 40 },
      { index: 2, accuracy: 80 },
      { index: 3, accuracy: 60 },
    ]);
    expect(s).toEqual({
      score: 70,
      stars: 1,
      sung: 4,
      hits: 2,
      hardest: [{ index: 1, accuracy: 40 }, { index: 3, accuracy: 60 }],
    });
  });

  it('counts a line sung again by its last take', () => {
    const s = summarize([{ index: 1, accuracy: 40 }, { index: 1, accuracy: 90 }]);
    expect(s.score).toBe(90);
    expect(s.sung).toBe(1);
    expect(s.hardest).toEqual([]);
  });

  it('is zero with nothing sung', () => {
    expect(summarize([])).toEqual({ score: 0, stars: 0, sung: 0, hits: 0, hardest: [] });
  });
});

describe('starsFor', () => {
  it.each([[95, 3], [90, 3], [80, 2], [60, 1], [30, 0]])('%i → %i', (score, stars) => {
    expect(starsFor(score)).toBe(stars);
  });
});
