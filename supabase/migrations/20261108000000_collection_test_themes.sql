-- How a test looks and plays.
--
-- `theme` dresses the student's screen — colours, answer tiles, the little
-- things drifting in the background. It's only a name; the look lives in the
-- app (src/lib/testThemes.ts), so a new theme is a code change plus a line
-- here.
--
-- `instant_feedback` marks each answer the moment it's given, with the
-- celebration or the shake that goes with it. Off by default, because it shows
-- the right answer straight away — answers a finished student could pass on.
-- When it's on, an answer is checked once and LOCKED (collection_test_checks):
-- otherwise a student could tap every option until one turned green.

alter table collection_tests
  add column if not exists theme text not null default 'classic'
    check (theme in ('classic', 'ocean', 'space', 'jungle', 'candy', 'castle')),
  add column if not exists instant_feedback boolean not null default false;

create table if not exists collection_test_checks (
  test_id uuid not null references collection_tests on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  question_id uuid not null references collection_test_questions on delete cascade,
  given text not null,
  correct boolean not null,
  at timestamptz not null default now(),
  primary key (test_id, user_id, question_id)
);

alter table collection_test_checks enable row level security;
