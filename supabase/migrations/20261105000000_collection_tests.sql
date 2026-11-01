-- Tests a collection's owner sends to its members: a question set (the same
-- ones treasure hunts are built from), answered by each member on their own
-- time, before a due date.
--
--   collections ─< collection_tests ─< collection_test_questions
--   collection_tests ─< collection_test_submissions ─< collection_test_answers
--
-- Like a hunt, a test COPIES its questions from the set when it's sent:
-- editing the set later can't change a test students are part-way through,
-- and a result always names the exact question that was asked.
--
-- One submission per member. It's written whole — every answer at once — so
-- there is no half-taken test on the server to reason about.
--
-- Same lock as the hunt tables: RLS on, no policies. The answers are in here,
-- so everything goes through the `tests` edge function, which holds the
-- service role and checks who owns or belongs to the collection itself.

create table if not exists collection_tests (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  -- The set it was made from, while that still exists.
  set_id uuid references question_sets on delete set null,
  title text not null,
  due_at timestamptz not null,
  question_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_collection_tests_collection on collection_tests (collection_id, created_at desc);

create table if not exists collection_test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references collection_tests on delete cascade,
  position smallint not null,
  source_id uuid references questions on delete set null,
  type text not null check (type in ('definition', 'sentence', 'listen', 'unscramble', 'spell', 'image', 'match', 'custom')),
  prompt text not null default '',
  answer text not null,
  options text[],
  accept text[],
  say text,
  scrambled text,
  image_word text,
  pair_prompts text[],
  pair_words text[],
  word text,
  unique (test_id, position)
);

create table if not exists collection_test_submissions (
  test_id uuid not null references collection_tests on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  -- Copied from the session when they submit, so the teacher's results read
  -- a name even after the student leaves the collection.
  name text not null,
  score int not null,
  total int not null,
  submitted_at timestamptz not null default now(),
  primary key (test_id, user_id)
);

create table if not exists collection_test_answers (
  id bigserial primary key,
  test_id uuid not null,
  user_id uuid not null,
  question_id uuid not null references collection_test_questions on delete cascade,
  -- What the student sent: a word, or a matching board's words joined by " | ".
  given text not null,
  correct boolean not null,
  foreign key (test_id, user_id) references collection_test_submissions on delete cascade,
  unique (test_id, user_id, question_id)
);

-- Results per question.
create index if not exists idx_collection_test_answers_question on collection_test_answers (question_id);

alter table collection_tests enable row level security;
alter table collection_test_questions enable row level security;
alter table collection_test_submissions enable row level security;
alter table collection_test_answers enable row level security;

-- Everyone in a collection, with a name — for "who hasn't taken it yet". The
-- names live in auth.users, which PostgREST can't join, so this reads them.
-- Only the service role may call it: the `tests` function checks the caller
-- owns the collection first.
create or replace function collection_roster(cid uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select
    m.user_id,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as display_name,
    m.joined_at
  from collection_members m
  join auth.users u on u.id = m.user_id
  where m.collection_id = cid
  order by m.joined_at
  limit 1000;
$$;

revoke all on function collection_roster(uuid) from public, anon, authenticated;
grant execute on function collection_roster(uuid) to service_role;
