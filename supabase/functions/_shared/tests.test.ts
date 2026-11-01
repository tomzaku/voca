// A collection test's rules, pinned: a skipped question is wrong, matching
// takes every pair, and a due date has to be a real, future, near-ish moment.

import { describe, expect, it } from 'vitest';
import type { StoredQuestion } from './hunts';
import { cleanDue, grade, Invalid, isOpen, rank, tally } from './tests';

const qs: StoredQuestion[] = [
  { id: 'a', type: 'definition', prompt: 'a pet that barks', answer: 'dog', options: ['dog', 'cat'] },
  { id: 'b', type: 'custom', prompt: 'colour of the sky', answer: 'blue', accept: ['light blue'] },
  { id: 'c', type: 'match', prompt: '', answer: 'x · y', slotPrompts: ['1', '2'], slots: ['x', 'y'], options: ['y', 'x'] },
];

describe('grade', () => {
  it('scores each question with the hunt rules', () => {
    const r = grade(qs, { a: 'Dog', b: ' light blue ', c: ['x', 'y'] });
    expect(r).toMatchObject({ score: 3, total: 3 });
    expect(r.graded.map((g) => g.given)).toEqual(['Dog', ' light blue ', 'x | y']);
  });

  it('counts a skipped or blank question as wrong', () => {
    const r = grade(qs, { a: '', c: ['y', 'x'] });
    expect(r).toMatchObject({ score: 0, total: 3 });
    expect(r.graded[1]).toEqual({ questionId: 'b', given: '', correct: false });
  });

  it('ignores answers to questions that are not in the test, and junk bodies', () => {
    expect(grade(qs, { z: 'dog' }).score).toBe(0);
    expect(grade(qs, ['dog']).score).toBe(0);
    expect(grade(qs, null).total).toBe(3);
  });
});

describe('cleanDue', () => {
  const now = Date.parse('2026-11-01T00:00:00Z');
  it('takes a future date within a year', () => {
    expect(cleanDue('2026-11-08T17:00:00Z', now)).toBe('2026-11-08T17:00:00.000Z');
  });
  it('refuses the past, the far future and junk', () => {
    expect(() => cleanDue('2026-10-31T00:00:00Z', now)).toThrow(Invalid);
    expect(() => cleanDue('2028-01-01T00:00:00Z', now)).toThrow(Invalid);
    expect(() => cleanDue('soon', now)).toThrow(Invalid);
  });
  it('closes at the due moment', () => {
    expect(isOpen('2026-11-01T00:00:01Z', now)).toBe(true);
    expect(isOpen('2026-11-01T00:00:00Z', now)).toBe(false);
  });
});

describe('tally', () => {
  it('groups wrong answers case-insensitively, most common first, blanks unlisted', () => {
    const t = tally([
      { given: 'dog', correct: true },
      { given: 'Cat', correct: false },
      { given: 'cat ', correct: false },
      { given: 'cow', correct: false },
      { given: '', correct: false },
    ]);
    expect(t).toEqual({ right: 1, wrong: 4, commonWrong: [{ given: 'Cat', count: 2 }, { given: 'cow', count: 1 }] });
  });
});

describe('rank', () => {
  const row = (name: string, score: number, duration_ms: number | null, submitted_at: string) => ({ name, score, duration_ms, submitted_at });
  it('puts the higher score first, then the quicker, then the earlier; untimed after timed', () => {
    const rows = [
      row('slow', 9, 300_000, '2026-11-01T10:00:00Z'),
      row('untimed', 9, null, '2026-11-01T08:00:00Z'),
      row('best', 10, 900_000, '2026-11-01T12:00:00Z'),
      row('fast', 9, 120_000, '2026-11-01T11:00:00Z'),
      row('fastLater', 9, 120_000, '2026-11-01T11:30:00Z'),
    ];
    expect(rows.sort(rank).map((r) => r.name)).toEqual(['best', 'fast', 'fastLater', 'slow', 'untimed']);
  });
});

describe('cleanTheme', () => {
  it('takes a known theme and refuses anything else', async () => {
    const { cleanTheme } = await import('./tests');
    expect(cleanTheme('space')).toBe('space');
    expect(() => cleanTheme('lava')).toThrow(Invalid);
    expect(() => cleanTheme(3)).toThrow(Invalid);
  });
});
