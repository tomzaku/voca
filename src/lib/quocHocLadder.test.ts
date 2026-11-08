import { describe, expect, it } from 'vitest';
import { QUESTIONS, QUESTION_TYPES } from './ladderQuestions';
import { answer, banked, RANGES, RANGE_LEVELS, canUse, current, newLadder, RUNG_COUNT, RUNG_POINTS, say, stop, askClass, takeHalf, swapQuestion, type LadderGame } from './quocHocLadder';

function seeded(seed = 7) {
  return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
}

const right = (g: LadderGame) => answer(g, current(g)!.answer).game;
const wrong = (g: LadderGame) => answer(g, (current(g)!.answer + 1) % 4).game;

describe('the question bank', () => {
  it('has 181 questions, each with its own id', () => {
    expect(QUESTIONS).toHaveLength(181);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it('gives every type 5 questions a level and a spare to swap in', () => {
    for (const type of QUESTION_TYPES) {
      for (const level of ['easy', 'medium', 'hard', 'expert'] as const) {
        expect(QUESTIONS.filter((q) => q.type === type && q.level === level).length, `${type} ${level}`).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('never repeats an option within a question, in either language', () => {
    for (const q of QUESTIONS) {
      for (const locale of ['en', 'vi']) {
        expect(new Set(q.options.map((o) => say(o, locale))).size, `#${q.id} ${say(q.q, 'en')}`).toBe(4);
      }
    }
  });

  it('never asks the same question twice', () => {
    expect(new Set(QUESTIONS.map((q) => say(q.q, 'en'))).size).toBe(QUESTIONS.length);
  });
});

describe('the ladder', () => {
  it('climbs five of each of its range\'s levels, with no repeats', () => {
    for (const range of RANGES) {
      for (const type of ['all', ...QUESTION_TYPES] as const) {
        const g = newLadder(type, range, seeded());
        expect(g.ladder.map((a) => a.question.level)).toEqual(RANGE_LEVELS[range].flatMap((l) => Array(5).fill(l)));
        expect(new Set(g.ladder.map((a) => a.question.id)).size).toBe(RUNG_COUNT);
        expect(Object.keys(g.spares)).toHaveLength(3);
        if (type !== 'all') expect(g.ladder.every((a) => a.question.type === type)).toBe(true);
      }
    }
  });

  it('starts the challenge range on medium and swaps within its level', () => {
    const g = newLadder('math', 'challenge', seeded());
    expect(current(g)!.question.level).toBe('medium');
    expect(current(swapQuestion(g))!.question.level).toBe('medium');
  });

  it('keeps the right answer findable after shuffling', () => {
    const g = newLadder('all', 'starter', seeded(3));
    for (const a of g.ladder) expect(a.options[a.answer]).toBe(a.question.options[0]);
  });

  it('pays the top rung for fifteen right answers', () => {
    let g = newLadder('all', 'starter', seeded());
    for (let i = 0; i < RUNG_COUNT; i++) g = right(g);
    expect(g.over).toEqual({ how: 'top', points: RUNG_POINTS[14] });
  });

  it('drops a wrong answer to the last safe rung passed', () => {
    let g = newLadder('all', 'starter', seeded());
    expect(wrong(g).over?.points).toBe(0);
    for (let i = 0; i < 7; i++) g = right(g);
    expect(wrong(g).over).toEqual({ how: 'wrong', points: RUNG_POINTS[4] });
    for (let i = 0; i < 5; i++) g = right(g);
    expect(wrong(g).over?.points).toBe(RUNG_POINTS[9]);
  });

  it('lets you stop with what you climbed', () => {
    let g = newLadder('all', 'starter', seeded());
    for (let i = 0; i < 7; i++) g = right(g);
    expect(banked(g)).toBe(RUNG_POINTS[6]);
    expect(stop(g).over).toEqual({ how: 'stopped', points: RUNG_POINTS[6] });
  });
});

describe('the helps', () => {
  it('half takes away two wrong answers, once', () => {
    const g = takeHalf(newLadder('all', 'starter', seeded()), seeded(11));
    const q = current(g)!;
    expect(g.hidden).toHaveLength(2);
    expect(g.hidden).not.toContain(q.answer);
    expect(canUse(g, 'half')).toBe(false);
    expect(answer(g, g.hidden[0]).game.over).toBeNull();
  });

  it('the class votes 100% in all, none on hidden answers, and mostly right on easy ones', () => {
    let hits = 0;
    for (let s = 1; s <= 40; s++) {
      const g = askClass(takeHalf(newLadder('all', 'starter', seeded(s)), seeded(s + 1)), seeded(s + 2));
      expect(g.poll!.reduce((a, b) => a + b, 0)).toBe(100);
      for (const h of g.hidden) expect(g.poll![h]).toBe(0);
      if (g.poll!.indexOf(Math.max(...g.poll!)) === current(g)!.answer) hits++;
    }
    expect(hits).toBeGreaterThan(35);
  });

  it('swap trades the question for another of its level', () => {
    const g = newLadder('nature', 'starter', seeded());
    const before = current(g)!.question.id;
    const s = swapQuestion(g);
    expect(current(s)!.question.id).not.toBe(before);
    expect(current(s)!.question.level).toBe('easy');
    expect(canUse(s, 'swap')).toBe(false);
  });
});
