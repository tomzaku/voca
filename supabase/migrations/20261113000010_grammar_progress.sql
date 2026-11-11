-- How far a learner has got through the Grammar course: one row per lesson
-- they've practised. The lessons themselves are static content in the app
-- (src/data/grammar.ts), so `lesson_id` is a slug, not a foreign key.
--
-- Written ONLY through the `grammar` edge function on the caller's RLS-scoped
-- client, so user_id always comes from the session, never a request body.
create table if not exists grammar_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,60}$'),
  best_score smallint not null default 0 check (best_score between 0 and 100),
  last_score smallint not null default 0 check (last_score between 0 and 100),
  attempts integer not null default 0,
  -- First time the lesson was passed; never cleared by a later, worse attempt.
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table grammar_progress enable row level security;

create policy "select own grammar progress" on grammar_progress
  for select using (auth.uid() = user_id);

create policy "insert own grammar progress" on grammar_progress
  for insert with check (auth.uid() = user_id);

create policy "update own grammar progress" on grammar_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own grammar progress" on grammar_progress
  for delete using (auth.uid() = user_id);
