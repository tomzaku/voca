// Courses — the goal a learner picks at onboarding, and the plan that follows
// from it. Only the choice is stored (the `course` setting); everything else
// here is derived, so the plan can be retuned without touching anyone's data.
//
// A plan is two things:
//   - stages: the CEFR word bands between where the learner starts and where
//     they're aiming, each with how much of it they've already seen
//   - today's tasks: the day's words, plus a rotating handful of listening /
//     speaking / writing / grammar sessions drawn from the course

import { CEFR_WORDS } from '../data/cefrWords';
import type { WordProgress } from '../types';
import {
  addDays, daysBetween, scheduledTasks, tasksPerDay, type CourseId, type Skill, type TaskSpec,
} from '../../supabase/functions/_shared/coursePlan.ts';

export type { CourseId };
export const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Cefr = (typeof CEFR)[number];

/** What's stored — the learner's answers to the onboarding questions. */
export interface CourseChoice {
  id: CourseId;
  /** Where they started. */
  level: Cefr;
  /** The band whose words finish the course. */
  target: Cefr;
  /** IELTS only — the overall band they're aiming for. */
  band?: string;
  /** Local YYYY-MM-DD the course began. */
  startedOn: string;
}

export const COURSES: CourseId[] = ['everyday', 'ielts'];
export const IELTS_BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5'] as const;

/**
 * The vocabulary band an IELTS score needs — the published CEFR alignment,
 * rounded to the band that covers it: 5.0 is B1, 5.5–6.5 B2, 7.0+ C1.
 */
export function bandToCefr(band: string): Cefr {
  const n = Number(band);
  if (n < 5.5) return 'B1';
  if (n < 7) return 'B2';
  return 'C1';
}

/** Everyday English aims one band above where you are — far enough to matter, near enough to see. */
export function everydayTarget(level: Cefr): Cefr {
  return CEFR[Math.min(CEFR.indexOf(level) + 1, CEFR.length - 1)];
}

/** `level-3` → 'B1'; anything else → null. */
export function cefrOfCollection(id: string): Cefr | null {
  const m = /^level-([1-6])$/.exec(id);
  return m ? CEFR[Number(m[1]) - 1] : null;
}

export const collectionOf = (cefr: Cefr) => `level-${CEFR.indexOf(cefr) + 1}`;

export function makeChoice(id: CourseId, level: Cefr, band: string | undefined, startedOn: string): CourseChoice {
  if (id === 'ielts') {
    const b = band ?? '6.5';
    return { id, level, target: bandToCefr(b), band: b, startedOn };
  }
  return { id, level, target: everydayTarget(level), startedOn };
}

/* ─── Stages ─────────────────────────────────────────────────── */

export interface Stage {
  cefr: Cefr;
  collectionId: string;
  total: number;
  seen: number;
}

/** Word counts per band — fixed data, so counted once. */
let bandWords: Map<number, string[]> | null = null;
function wordsOfBand(n: number): string[] {
  if (!bandWords) {
    bandWords = new Map();
    for (const w of CEFR_WORDS) {
      const list = bandWords.get(w.level) ?? [];
      list.push(w.word.toLowerCase());
      bandWords.set(w.level, list);
    }
  }
  return bandWords.get(n) ?? [];
}

/**
 * The bands from start to target, inclusive. A learner already past their
 * target (a C1 aiming at IELTS 6.5) gets the target band alone — the words
 * they'll be tested on, as review.
 */
export function planStages(choice: CourseChoice, progress: Record<string, WordProgress>): Stage[] {
  const seen = new Set(Object.keys(progress).map((w) => w.toLowerCase()));
  const from = CEFR.indexOf(choice.level);
  const to = CEFR.indexOf(choice.target);
  const start = from <= to ? from : to;
  const stages: Stage[] = [];
  for (let i = start; i <= to; i++) {
    const words = wordsOfBand(i + 1);
    stages.push({
      cefr: CEFR[i],
      collectionId: collectionOf(CEFR[i]),
      total: words.length,
      seen: words.filter((w) => seen.has(w)).length,
    });
  }
  return stages;
}

/** The first stage with words left, or the last if they're all done. */
export function currentStage(stages: Stage[]): Stage {
  return stages.find((s) => s.seen < s.total) ?? stages[stages.length - 1];
}

/** Days left at `perDay` new words a day. */
export function daysLeft(stages: Stage[], perDay: number): number {
  const left = stages.reduce((n, s) => n + Math.max(0, s.total - s.seen), 0);
  return Math.ceil(left / Math.max(1, perDay));
}

/* ─── Daily tasks ────────────────────────────────────────────── */

export type { Skill };

export const SKILL_ICON: Record<Skill, string> = {
  listening: 'lucide:headphones',
  speaking: 'lucide:mic',
  writing: 'lucide:pen-line',
  grammar: 'lucide:book-open-check',
};

export interface PlanTask extends TaskSpec {
  /** Extra query for the link only (a grammar level, say). */
  query?: Record<string, string>;
}

export { tasksPerDay, daysBetween, addDays };

/**
 * The skill tasks for `day` — the rotation itself lives in
 * supabase/functions/_shared/coursePlan.ts, shared with the reminder that
 * names them. Grammar opens on the learner's starting band.
 */
export function tasksFor(choice: CourseChoice, goal: number, day: string): PlanTask[] {
  return scheduledTasks(choice.id, choice.startedOn, goal, day).map((t) => (
    t.skill === 'grammar' ? { ...t, query: { level: choice.level } } : t
  ));
}

/* ─── The whole course, week by week ─────────────────────────── */

export interface PlanWeek {
  index: number;
  stage: Cefr;
  /** This week's slice of the stage's words, 1-based inclusive. */
  from: number;
  to: number;
  /** How much of the slice is seen — a stage's words fill its weeks in order. */
  seen: number;
  status: 'done' | 'current' | 'upcoming';
  /** Monday-agnostic: the 7 days starting here. Done weeks keep their
   *  scheduled date; the current and upcoming ones are projected from today. */
  start: string;
  /** The week's skill sessions, each with how many times it comes up. */
  tasks: { task: PlanTask; count: number }[];
}

/**
 * The course laid out as weeks: each week is `goal × 7` words of the current
 * band plus a week of the skill rotation. Weeks don't straddle bands — a band's
 * last week is just shorter — so every week has one clear "what level".
 */
export function planWeeks(choice: CourseChoice, stages: Stage[], goal: number, today: string): PlanWeek[] {
  const perWeek = Math.max(1, goal) * 7;
  const weeks: Omit<PlanWeek, 'status' | 'start' | 'tasks'>[] = [];
  for (const s of stages) {
    for (let from = 1; from <= s.total; from += perWeek) {
      const to = Math.min(s.total, from + perWeek - 1);
      const seen = Math.max(0, Math.min(to, s.seen) - from + 1);
      weeks.push({ index: weeks.length, stage: s.cefr, from, to, seen });
    }
  }
  const current = weeks.findIndex((w) => w.seen < w.to - w.from + 1);
  const cur = current === -1 ? weeks.length : current;
  return weeks.map((w) => {
    const start = w.index < cur
      ? addDays(choice.startedOn, w.index * 7)
      : addDays(today, (w.index - cur) * 7);
    return {
      ...w,
      status: w.index < cur ? 'done' : w.index === cur ? 'current' : 'upcoming',
      start,
      tasks: tallyWeek(choice, goal, start),
    };
  });
}

function tallyWeek(choice: CourseChoice, goal: number, start: string): { task: PlanTask; count: number }[] {
  const out = new Map<string, { task: PlanTask; count: number }>();
  for (let d = 0; d < 7; d++) {
    for (const t of tasksFor(choice, goal, addDays(start, d))) {
      const e = out.get(t.key);
      if (e) e.count++;
      else out.set(t.key, { task: t, count: 1 });
    }
  }
  return [...out.values()];
}

/**
 * Weeks ahead (+) or behind (−) the schedule: the week the learner is on
 * against the week the calendar says they'd be on at their pace.
 */
export function paceWeeks(choice: CourseChoice, weeks: PlanWeek[], today: string): number {
  const at = weeks.findIndex((w) => w.status === 'current');
  const on = at === -1 ? weeks.length : at;
  const expected = Math.floor(Math.max(0, daysBetween(choice.startedOn, today)) / 7);
  return on - expected;
}

/** Whether being on `pathname` with `tab` counts as doing `task`. */
export function visitMatches(task: PlanTask, pathname: string, tab: string | null): boolean {
  return pathname === task.path && (!task.tab || task.tab === tab);
}

export function taskHref(task: PlanTask): string {
  const q = new URLSearchParams({ ...(task.tab ? { tab: task.tab } : {}), ...(task.query ?? {}) }).toString();
  return q ? `${task.path}?${q}` : task.path;
}

/** A stored value, or null if it isn't a course this build understands. */
export function parseChoice(v: unknown): CourseChoice | null {
  if (!v || typeof v !== 'object') return null;
  const c = v as Record<string, unknown>;
  if (!COURSES.includes(c.id as CourseId)) return null;
  if (!CEFR.includes(c.level as Cefr) || !CEFR.includes(c.target as Cefr)) return null;
  if (typeof c.startedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.startedOn)) return null;
  return {
    id: c.id as CourseId,
    level: c.level as Cefr,
    target: c.target as Cefr,
    startedOn: c.startedOn,
    ...(typeof c.band === 'string' ? { band: c.band } : {}),
  };
}
