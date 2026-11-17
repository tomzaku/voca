import { describe, expect, it } from 'vitest';
import {
  bandToCefr, currentStage, daysBetween, daysLeft, everydayTarget, makeChoice, parseChoice,
  planStages, tasksFor, tasksPerDay, taskHref, visitMatches,
} from './course';
import { CEFR_WORDS } from '../data/cefrWords';

const day0 = '2026-11-01';

describe('targets', () => {
  it('maps IELTS bands onto the vocabulary band they need', () => {
    expect(bandToCefr('5.0')).toBe('B1');
    expect(bandToCefr('5.5')).toBe('B2');
    expect(bandToCefr('6.5')).toBe('B2');
    expect(bandToCefr('7.0')).toBe('C1');
  });

  it('aims everyday English one band up, capped at C2', () => {
    expect(everydayTarget('A1')).toBe('A2');
    expect(everydayTarget('C2')).toBe('C2');
  });
});

describe('planStages', () => {
  it('covers every band from start to target', () => {
    const stages = planStages(makeChoice('ielts', 'A2', '6.5', day0), {});
    expect(stages.map((s) => s.cefr)).toEqual(['A2', 'B1', 'B2']);
    expect(stages.every((s) => s.seen === 0 && s.total > 0)).toBe(true);
  });

  it('gives a learner already past the target just the target band', () => {
    const stages = planStages(makeChoice('ielts', 'C2', '6.0', day0), {});
    expect(stages.map((s) => s.cefr)).toEqual(['B2']);
  });

  it('counts seen words case-insensitively and moves on from a finished band', () => {
    const a1 = CEFR_WORDS.filter((w) => w.level === 1);
    const progress = Object.fromEntries(a1.map((w) => [w.word.toUpperCase(), { word: w.word, seenAt: '' }]));
    const stages = planStages(makeChoice('everyday', 'A1', undefined, day0), progress);
    expect(stages[0].seen).toBe(stages[0].total);
    expect(currentStage(stages).cefr).toBe('A2');
    expect(daysLeft(stages, 10)).toBe(Math.ceil(stages[1].total / 10));
  });
});

describe('tasksFor', () => {
  const c = makeChoice('ielts', 'B1', '6.5', day0);

  it('scales with the daily goal', () => {
    expect(tasksFor(c, 5, day0)).toHaveLength(tasksPerDay(5));
    expect(tasksFor(c, 30, day0)).toHaveLength(3);
  });

  it('rotates day to day, and is stable within a day', () => {
    expect(tasksFor(c, 10, day0)[0].key).toBe(tasksFor(c, 10, day0)[0].key);
    expect(tasksFor(c, 10, '2026-11-02')[0].key).not.toBe(tasksFor(c, 10, day0)[0].key);
    expect(daysBetween(day0, '2026-11-08')).toBe(7);
  });

  it('matches a visit on path and tab, and links with both', () => {
    const [t] = tasksFor(c, 10, day0);
    expect(t.path).toBe('/listening');
    expect(visitMatches(t, '/listening', 'ielts')).toBe(true);
    expect(visitMatches(t, '/listening', 'podcast')).toBe(false);
    expect(taskHref(t)).toBe('/listening?tab=ielts');
  });
});

describe('parseChoice', () => {
  it('round-trips a choice and rejects junk', () => {
    const c = makeChoice('everyday', 'B1', undefined, day0);
    expect(parseChoice(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(parseChoice({ ...c, id: 'toefl' })).toBeNull();
    expect(parseChoice({ ...c, startedOn: 'yesterday' })).toBeNull();
    expect(parseChoice(null)).toBeNull();
  });
});
