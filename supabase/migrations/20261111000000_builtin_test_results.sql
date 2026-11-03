-- The built-in collections' practice tests — a few fixed tests for each of
-- Curated, CEFR Level 1–6 and the topics, with no due date. Their questions
-- aren't rows: they're frozen in supabase/functions/_shared/builtinTests.json
-- (`npm run export:tests`), so a test is named by its id there ("level-2-t3").
--
-- One row per learner per test: the attempt under way or last handed in, and
-- their best. A test with no deadline can be taken again; the best score is
-- what the top three ranks, the last attempt is what the review shows.
--
-- No row-level policies: only the `tests` function reads or writes it, with
-- the service role, and takes `user_id` and the name from the session.

create table if not exists builtin_test_results (
  test_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  -- The attempt under way: when Start was pressed. Null once handed in.
  started_at timestamptz,
  -- The last attempt handed in: its answers ({ "<question id>": given }) and score.
  last_answers jsonb,
  last_score int,
  last_submitted_at timestamptz,
  -- The best attempt: highest score, then the quickest, then the earliest.
  best_score int,
  best_duration_ms int,
  best_at timestamptz,
  total int not null,
  primary key (test_id, user_id)
);

alter table builtin_test_results enable row level security;

-- The top three of a test.
create index if not exists idx_builtin_test_results_best
  on builtin_test_results (test_id, best_score desc nulls last, best_duration_ms asc nulls last, best_at asc);
