import { describe, expect, it } from 'vitest';
import { accuracy, parseRaceWords, playerProgress, raceLength, raceWords, trainProgress, wpm } from './typeRace';

describe('raceWords', () => {
  it('keeps plain words, once each, as many as asked', () => {
    const words = raceWords(['Apple', 'apple', 'ice cream', 'go', 'x', 'well-being', 'résumé', 'banana'], 10, () => 0);
    expect(words.sort()).toEqual(['apple', 'banana', 'go', 'well-being']);
  });
});

describe('speed and progress', () => {
  const words = ['cat', 'dog'];                       // "cat dog": 7 characters

  it('counts five characters to a word', () => {
    expect(wpm(50, 60_000)).toBe(10);
    expect(wpm(25, 30_000)).toBe(10);
  });

  it('moves the train at its pace', () => {
    expect(raceLength(words)).toBe(7);
    expect(trainProgress(words, 10, 6_000)).toBeCloseTo(5 / 7);
    expect(trainProgress(words, 10, 60_000)).toBe(1);
  });

  it('counts your words done and the right start of the next', () => {
    expect(playerProgress(words, 0, 'ca')).toBeCloseTo(2 / 7);
    expect(playerProgress(words, 0, 'cx')).toBeCloseTo(1 / 7);
    expect(playerProgress(words, 1, 'd')).toBeCloseTo(5 / 7);
    expect(playerProgress(words, 2, '')).toBe(1);
  });

  it('writes accuracy as a whole percent', () => {
    expect(accuracy(9, 10)).toBe(90);
    expect(accuracy(0, 0)).toBe(100);
  });
});

describe('parseRaceWords', () => {
  it('takes plain words, and nothing else', () => {
    expect(parseRaceWords(['calm', "don't"])).toEqual(['calm', "don't"]);
    expect(parseRaceWords([])).toBeNull();
    expect(parseRaceWords(['calm', '<b>'])).toBeNull();
    expect(parseRaceWords('calm')).toBeNull();
  });
});
