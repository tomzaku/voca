// Which skill sessions a course schedules on which day — shared, unmodified,
// by the app (src/lib/course.ts) and the edge functions (`notify`, `plan`).
// It's the one rule both sides must agree on: the reminder names today's
// tasks, the app lists and ticks them, and a mismatch would be a reminder for
// something the app never asks for. So it lives once, here, with no imports,
// and both bundlers pull it in.

export type CourseId = 'everyday' | 'ielts';
export type Skill = 'listening' | 'speaking' | 'writing' | 'grammar';

export interface TaskSpec {
  /** Slug — what a done task is logged as (plan_task_log.task). */
  key: string;
  skill: Skill;
  /** Message id for the task's name in the app. */
  labelId: string;
  /** Its name in a notification, which is English-only server copy. */
  name: string;
  /** Where it opens. */
  path: string;
  /** `?tab=` the page must be on for a visit to count; none = any. */
  tab?: string;
}

// The sessions each course rotates through, in order. Skills alternate so two
// consecutive days never repeat one, and no key appears twice — a day takes up
// to three consecutive entries, and each must be its own task.
export const POOLS: Record<CourseId, TaskSpec[]> = {
  everyday: [
    { key: 'podcast', skill: 'listening', labelId: 'plan.task.podcast', name: 'a podcast', path: '/listening', tab: 'podcast' },
    { key: 'conversation', skill: 'speaking', labelId: 'plan.task.conversation', name: 'a short conversation', path: '/speaking', tab: 'conversation' },
    { key: 'grammar', skill: 'grammar', labelId: 'plan.task.grammar', name: 'a grammar lesson', path: '/grammar' },
    { key: 'dictation', skill: 'listening', labelId: 'plan.task.dictation', name: 'dictation', path: '/listening', tab: 'dictation' },
    { key: 'dialogue', skill: 'speaking', labelId: 'plan.task.dialogue', name: 'a daily dialogue', path: '/speaking', tab: 'dialogue' },
    { key: 'improve-writing', skill: 'writing', labelId: 'plan.task.improveWriting', name: 'a short paragraph', path: '/writing/improve' },
  ],
  ielts: [
    { key: 'ielts-listening', skill: 'listening', labelId: 'plan.task.ieltsListening', name: 'IELTS listening', path: '/listening', tab: 'ielts' },
    { key: 'ielts-speaking', skill: 'speaking', labelId: 'plan.task.ieltsSpeaking', name: 'IELTS speaking', path: '/speaking', tab: 'ielts' },
    { key: 'ielts-writing', skill: 'writing', labelId: 'plan.task.ieltsWriting', name: 'an IELTS writing task', path: '/writing/ielts' },
    { key: 'grammar', skill: 'grammar', labelId: 'plan.task.grammar', name: 'a grammar lesson', path: '/grammar' },
    { key: 'comprehension', skill: 'listening', labelId: 'plan.task.comprehension', name: 'listening comprehension', path: '/listening', tab: 'comprehension' },
    { key: 'conversation', skill: 'speaking', labelId: 'plan.task.conversation', name: 'a short conversation', path: '/speaking', tab: 'conversation' },
  ],
};

export const COURSE_IDS = Object.keys(POOLS) as CourseId[];

/** Skill sessions a day for a words-a-day goal — a bigger goal means a longer day. */
export function tasksPerDay(goal: number): number {
  if (goal >= 30) return 3;
  if (goal >= 20) return 2;
  return 1;
}

const DAY_MS = 86_400_000;

/** Whole days between two YYYY-MM-DD dates. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / DAY_MS) : 0;
}

/** YYYY-MM-DD `n` days after `day`. */
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The sessions for `day`: `tasksPerDay(goal)` consecutive entries of the
 * course's pool, starting where the previous day left off — so over a week
 * every kind of session comes round, whatever the goal. Days before the
 * course began have none.
 */
export function scheduledTasks(course: CourseId, startedOn: string, goal: number, day: string): TaskSpec[] {
  const pool = POOLS[course];
  const offset = daysBetween(startedOn, day);
  if (!pool || offset < 0) return [];
  const n = Math.min(tasksPerDay(goal), pool.length);
  return Array.from({ length: n }, (_, i) => pool[(offset * n + i) % pool.length]);
}

/** Every task key any course can schedule — what the log accepts. */
export const TASK_KEYS = new Set(Object.values(POOLS).flat().map((t) => t.key));
