// The `plan` resource — which of each day's plan tasks the learner did. The
// plan itself (course, stages, today's sessions) is derived from the `course`
// setting; this is the record of doing it, for the plan calendar and for the
// reminder that checks what's left before it names it.
//
//   GET    /plan/days?from=YYYY-MM-DD&to=YYYY-MM-DD → { days: [{ day, tasks }] }
//   POST   /plan/days   { day, task }               → { day, tasks }
//   DELETE /plan/days?day=…&task=…                  → { day, tasks }
//
// `days` lists only days with something done, oldest first; a day with
// nothing is simply absent. Days are the learner's local dates.
//
// Deploy: `supabase functions deploy plan`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';
import { daysBetween, TASK_KEYS } from '../_shared/coursePlan.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Longest range one GET may ask for — a year and a bit covers any calendar view. */
const MAX_RANGE_DAYS = 400;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: unknown): v is string => typeof v === 'string' && DAY.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`));
const isTask = (v: unknown): v is string => typeof v === 'string' && TASK_KEYS.has(v);

async function tasksOn(db: SupabaseClient, userId: string, day: string): Promise<string[]> {
  const { data, error } = await db
    .from('plan_task_log')
    .select('task')
    .eq('user_id', userId)
    .eq('day', day)
    .order('done_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.task as string);
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('plan') + 1).join('/');
  const route = `${req.method} /${sub}`;
  if (!['GET /days', 'POST /days', 'DELETE /days'].includes(route)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;
  const userId = auth.user.id;

  try {
    if (route === 'GET /days') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!isDay(from) || !isDay(to)) return jsonResponse(400, { error: 'from and to must be YYYY-MM-DD.' });
      const span = daysBetween(from, to);
      if (span < 0) return jsonResponse(400, { error: 'from must not be after to.' });
      if (span > MAX_RANGE_DAYS) return jsonResponse(400, { error: `A range can cover at most ${MAX_RANGE_DAYS} days.` });

      const { data, error } = await db
        .from('plan_task_log')
        .select('day, task')
        .eq('user_id', userId)
        .gte('day', from)
        .lte('day', to)
        .order('day')
        .order('done_at');
      if (error) throw new Error(error.message);

      const byDay = new Map<string, string[]>();
      for (const r of data ?? []) {
        const list = byDay.get(r.day as string) ?? [];
        list.push(r.task as string);
        byDay.set(r.day as string, list);
      }
      return jsonResponse(200, { days: [...byDay].map(([day, tasks]) => ({ day, tasks })) });
    }

    if (route === 'DELETE /days') {
      const day = url.searchParams.get('day');
      const task = url.searchParams.get('task');
      if (!isDay(day) || !isTask(task)) return jsonResponse(400, { error: 'A valid day and task are required.' });
      const { error } = await db.from('plan_task_log').delete().eq('user_id', userId).eq('day', day).eq('task', task);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { day, tasks: await tasksOn(db, userId, day) });
    }

    // POST /days
    let body: Record<string, unknown>;
    try {
      body = (await req.json() ?? {}) as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body.' });
    }
    const { day, task } = body;
    if (!isDay(day) || !isTask(task)) return jsonResponse(400, { error: 'A valid day and task are required.' });
    // A local date is at most a day either side of the server's UTC one; a
    // tick for anything further off is a client clock gone wrong, not a day
    // the learner actually lived.
    const today = new Date().toISOString().slice(0, 10);
    if (Math.abs(daysBetween(today, day)) > 1) return jsonResponse(400, { error: 'Only today can be ticked.' });

    const { error } = await db
      .from('plan_task_log')
      .upsert({ user_id: userId, day, task }, { onConflict: 'user_id,day,task', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return jsonResponse(200, { day, tasks: await tasksOn(db, userId, day) });
  } catch (err) {
    console.error('[plan]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
