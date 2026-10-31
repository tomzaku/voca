import { describe, expect, it } from 'vitest';
import { DUEL_SECONDS, duelPoints, duelResult, parseQuestions } from './wordDuel';

describe('duelPoints', () => {
  it('scores right answers, more for quick ones, and nothing for wrong', () => {
    expect(duelPoints(true, 0)).toBe(150);
    expect(duelPoints(true, DUEL_SECONDS * 500)).toBe(125);
    expect(duelPoints(true, DUEL_SECONDS * 2000)).toBe(100);
    expect(duelPoints(false, 0)).toBe(0);
  });

  it('decides the duel', () => {
    expect(duelResult(300, 200)).toBe('won');
    expect(duelResult(200, 300)).toBe('lost');
    expect(duelResult(250, 250)).toBe('draw');
  });
});

describe('parseQuestions', () => {
  const q = { word: 'calm', prompt: 'not excited', options: ['calm', 'loud', 'fast', 'red'] };

  it('takes questions as sent', () => {
    expect(parseQuestions([q])).toEqual([q]);
  });

  it('turns away anything that is not a question', () => {
    expect(parseQuestions('hi')).toBeNull();
    expect(parseQuestions([])).toBeNull();
    expect(parseQuestions([{ ...q, options: ['loud', 'fast'] }])).toBeNull();
    expect(parseQuestions([{ ...q, prompt: 3 }])).toBeNull();
    expect(parseQuestions(Array(20).fill(q))).toBeNull();
  });
});
