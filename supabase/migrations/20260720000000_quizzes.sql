-- Shareable quizzes. A teacher saves a quiz config; students take it via the
-- link and every attempt (score + full answers) is recorded so the teacher can
-- track results. A quiz can require sign-in, in which case anonymous attempts
-- are rejected.
create table if not exists quizzes (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users on delete cascade,
  title        text,
  config       jsonb not null,
  -- Snapshot of each word's data (definition, examples, synonyms, antonyms) taken
  -- at share time by the (signed-in) teacher, so students — including anonymous
  -- ones who can't call the auth-gated word service — can take the quiz with no
  -- further AI calls.
  words_data   jsonb not null default '{}'::jsonb,
  require_auth boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table quizzes enable row level security;

-- Anyone with the link (the unguessable UUID) can read a quiz to take it.
create policy "read quizzes"
  on quizzes for select
  using (true);

create policy "insert own quizzes"
  on quizzes for insert
  with check (auth.uid() = owner_id);

create policy "update own quizzes"
  on quizzes for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "delete own quizzes"
  on quizzes for delete
  using (auth.uid() = owner_id);

create index if not exists idx_quizzes_owner on quizzes(owner_id);

-- One student's attempt at a quiz.
create table if not exists quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references quizzes on delete cascade,
  student_id   uuid references auth.users on delete set null, -- null = anonymous
  student_name text not null,
  score        int not null default 0,
  total        int not null default 0,
  answers      jsonb not null default '[]'::jsonb,
  duration_sec int not null default 0,
  created_at   timestamptz not null default now()
);

alter table quiz_attempts enable row level security;

-- Recording an attempt: signed-in students save under their own id; anonymous
-- submissions (student_id null) are allowed only when the quiz doesn't require
-- sign-in. auth.uid() is null for anonymous callers, so the first branch can
-- only pass for a genuinely signed-in student saving their own row.
create policy "insert attempt"
  on quiz_attempts for insert
  with check (
    student_id = auth.uid()
    or (
      student_id is null
      and exists (select 1 from quizzes q where q.id = quiz_id and q.require_auth = false)
    )
  );

-- The quiz owner (teacher) reads every attempt; a student may read their own.
create policy "read attempts"
  on quiz_attempts for select
  using (
    exists (select 1 from quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
    or student_id = auth.uid()
  );

create index if not exists idx_quiz_attempts_quiz on quiz_attempts(quiz_id);
