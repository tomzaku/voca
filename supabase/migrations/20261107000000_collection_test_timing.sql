-- How long each student took, so equal scores rank the faster one first.
--
-- The clock starts when a student presses Start — the first time; reopening
-- the test doesn't restart it — and that's also when the server first hands
-- them the questions, so nobody can read them with the clock stopped.
-- Handing in stops it: the submission keeps the time taken.

create table if not exists collection_test_starts (
  test_id uuid not null references collection_tests on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  started_at timestamptz not null default now(),
  primary key (test_id, user_id)
);

alter table collection_test_starts enable row level security;

-- Null for a hand-in from before the clock existed; those rank after timed ones.
alter table collection_test_submissions
  add column if not exists duration_ms int;
