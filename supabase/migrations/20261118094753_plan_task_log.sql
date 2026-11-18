-- Which of a day's plan tasks the learner did — the history behind the plan
-- calendar ("what did I do on Tuesday?") and what the plan reminder checks
-- before nagging. One row per task per day; the tasks themselves are derived
-- from the `course` setting (supabase/functions/_shared/coursePlan.ts), so
-- `task` is a slug, not a foreign key.
--
-- `day` is the learner's local date, as the client saw it when the task was
-- done — a plan day is the learner's day, not UTC's.
--
-- Written ONLY through the `plan` edge function on the caller's RLS-scoped
-- client, so user_id always comes from the session, never a request body.
create table if not exists plan_task_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  task text not null check (task ~ '^[a-z0-9-]{1,40}$'),
  done_at timestamptz not null default now(),
  primary key (user_id, day, task)
);

alter table plan_task_log enable row level security;

create policy "select own plan tasks" on plan_task_log
  for select using (auth.uid() = user_id);

create policy "insert own plan tasks" on plan_task_log
  for insert with check (auth.uid() = user_id);

create policy "delete own plan tasks" on plan_task_log
  for delete using (auth.uid() = user_id);
