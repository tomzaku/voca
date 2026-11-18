// Client for the `plan` resource — which plan tasks were done on which day.
// See supabase/functions/plan/index.ts.
//
//   GET    /plan/days?from&to   → { days: [{ day, tasks }] }
//   POST   /plan/days {day,task} → { day, tasks }
//
// Quiet throughout: the course store keeps its own copy of what's ticked, and
// a signed-out learner's plan works from that alone.

import { request } from './api';

export interface PlanDay {
  /** Local YYYY-MM-DD. */
  day: string;
  /** Task keys done that day. */
  tasks: string[];
}

export async function fetchPlanDays(from: string, to: string): Promise<PlanDay[] | null> {
  const res = await request.get<{ days: PlanDay[] }>('/plan/days', { params: { from, to }, quiet: true });
  return res?.days ?? null;
}

export async function markPlanTask(day: string, task: string): Promise<PlanDay | null> {
  return request.post<PlanDay>('/plan/days', { day, task }, { quiet: true });
}
