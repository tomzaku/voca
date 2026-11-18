import { describe, expect, it } from 'vitest';
import {
  addDays, bandToCefr, currentStage, daysBetween, daysLeft, everydayTarget, makeChoice, paceWeeks, parseChoice,
  planStages, planWeeks, tasksFor, tasksPerDay, taskHref, visitMatches,
} from './course';
import { POOLS, TASK_KEYS, scheduledTasks } from '../../supabase/functions/_shared/coursePlan.ts';
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

describe('the shared rotation', () => {
  it('never repeats a task within a day, at any goal, on any day', () => {
    for (const id of ['everyday', 'ielts'] as const) {
      for (const goal of [5, 10, 20, 30]) {
        for (let d = 0; d < 14; d++) {
          const keys = scheduledTasks(id, day0, goal, addDays(day0, d)).map((t) => t.key);
          expect(new Set(keys).size).toBe(keys.length);
        }
      }
    }
  });

  it('has no tasks before the course began, and slug keys the log accepts', () => {
    expect(scheduledTasks('ielts', day0, 10, '2026-10-31')).toEqual([]);
    for (const t of Object.values(POOLS).flat()) expect(t.key).toMatch(/^[a-z0-9-]{1,40}$/);
    expect(TASK_KEYS.has('ielts-writing')).toBe(true);
  });

  it('puts the grammar level on the link only', () => {
    const c = makeChoice('everyday', 'B1', undefined, day0);
    const grammar = [0, 1, 2, 3, 4, 5].flatMap((d) => tasksFor(c, 10, addDays(day0, d))).find((t) => t.skill === 'grammar')!;
    expect(taskHref(grammar)).toBe('/grammar?level=B1');
  });
});

describe('planWeeks', () => {
  const c = makeChoice('everyday', 'A1', undefined, day0);

  it('splits each band into goal-sized weeks that never straddle bands', () => {
    const stages = planStages(c, {});
    const weeks = planWeeks(c, stages, 10, day0);
    const a1 = weeks.filter((w) => w.stage === 'A1');
    expect(a1.length).toBe(Math.ceil(stages[0].total / 70));
    expect(a1[0]).toMatchObject({ from: 1, to: 70, status: 'current', start: day0 });
    expect(weeks.find((w) => w.stage === 'A2')!.from).toBe(1);
    expect(weeks[1].start).toBe(addDays(day0, 7));
    expect(weeks[0].tasks.reduce((n, t) => n + t.count, 0)).toBe(7);
  });

  it('marks seen weeks done and measures pace against the calendar', () => {
    const a1 = CEFR_WORDS.filter((w) => w.level === 1).slice(0, 140);
    const progress = Object.fromEntries(a1.map((w) => [w.word, { word: w.word, seenAt: '' }]));
    const stages = planStages(c, progress);
    const today = addDays(day0, 21);
    const weeks = planWeeks(c, stages, 10, today);
    expect(weeks.slice(0, 3).map((w) => w.status)).toEqual(['done', 'done', 'current']);
    expect(weeks[2].start).toBe(today);
    expect(paceWeeks(c, weeks, today)).toBe(-1);
  });
});
