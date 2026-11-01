-- A teacher may show students the test's top three — names and scores — on
-- the test page, before and after they hand in. Off unless she turns it on:
-- it puts children's names and marks in front of their classmates.
alter table collection_tests
  add column if not exists show_leaderboard boolean not null default false;
