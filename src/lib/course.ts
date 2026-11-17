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

export type CourseId = 'everyday' | 'ielts';
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

/* ─── Today's tasks ──────────────────────────────────────────── */

export type Skill = 'listening' | 'speaking' | 'writing' | 'grammar';

export const SKILL_ICON: Record<Skill, string> = {
  listening: 'lucide:headphones',
  speaking: 'lucide:mic',
  writing: 'lucide:pen-line',
  grammar: 'lucide:book-open-check',
};

export interface PlanTask {
  /** Stable for the day — what "done" is recorded against. */
  key: string;
  skill: Skill;
  /** Message id for the task's name. */
  labelId: string;
  /** Where it opens. */
  path: string;
  /** `?tab=` the page must be on for a visit to count; none = any. */
  tab?: string;
  /** Extra query for the link only (a grammar level, say). */
  query?: Record<string, string>;
}

type TaskSpec = Omit<PlanTask, 'key' | 'query'> & { query?: (c: CourseChoice) => Record<string, string> };

// The skill sessions each course rotates through, in order. Alternating
// skills so two consecutive days never repeat one, and a day with two tasks
// gets two different skills.
// Grammar opens on the learner's starting band.
const grammarAt = (c: CourseChoice) => ({ level: c.level });

const POOLS: Record<CourseId, TaskSpec[]> = {
  everyday: [
    { skill: 'listening', labelId: 'plan.task.podcast', path: '/listening', tab: 'podcast' },
    { skill: 'speaking', labelId: 'plan.task.conversation', path: '/speaking', tab: 'conversation' },
    { skill: 'grammar', labelId: 'plan.task.grammar', path: '/grammar', query: grammarAt },
    { skill: 'listening', labelId: 'plan.task.dictation', path: '/listening', tab: 'dictation' },
    { skill: 'speaking', labelId: 'plan.task.dialogue', path: '/speaking', tab: 'dialogue' },
    { skill: 'writing', labelId: 'plan.task.improveWriting', path: '/writing/improve' },
  ],
  ielts: [
    { skill: 'listening', labelId: 'plan.task.ieltsListening', path: '/listening', tab: 'ielts' },
    { skill: 'speaking', labelId: 'plan.task.ieltsSpeaking', path: '/speaking', tab: 'ielts' },
    { skill: 'writing', labelId: 'plan.task.ieltsWriting', path: '/writing/ielts' },
    { skill: 'grammar', labelId: 'plan.task.grammar', path: '/grammar', query: grammarAt },
    { skill: 'listening', labelId: 'plan.task.comprehension', path: '/listening', tab: 'comprehension' },
    { skill: 'speaking', labelId: 'plan.task.ieltsSpeaking', path: '/speaking', tab: 'ielts' },
  ],
};

/** Skill sessions a day for a given words-a-day goal — a bigger goal means a longer day. */
export function tasksPerDay(goal: number): number {
  if (goal >= 30) return 3;
  if (goal >= 20) return 2;
  return 1;
}

const DAY_MS = 86_400_000;
/** Whole days between two local YYYY-MM-DD dates. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / DAY_MS) : 0;
}

/**
 * The skill tasks for `today`: `tasksPerDay(goal)` consecutive entries of the
 * course's pool, starting where yesterday's left off — so over a week every
 * kind of session comes round, whatever the goal.
 */
export function tasksFor(choice: CourseChoice, goal: number, today: string): PlanTask[] {
  const pool = POOLS[choice.id];
  const n = Math.min(tasksPerDay(goal), pool.length);
  const day = Math.max(0, daysBetween(choice.startedOn, today));
  const out: PlanTask[] = [];
  for (let i = 0; i < n; i++) {
    const spec = pool[(day * n + i) % pool.length];
    const { query, ...rest } = spec;
    out.push({ ...rest, key: `${spec.path}|${spec.tab ?? ''}|${spec.labelId}`, query: query?.(choice) });
  }
  return out;
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
