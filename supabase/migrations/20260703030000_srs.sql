-- Spaced repetition scheduling per (user, word). Extends user_word_progress so
-- a user's review schedule persists across devices. `interval` is a reserved
-- word in SQL, so the column is named srs_interval.
alter table user_word_progress
  add column if not exists reps int not null default 0,
  add column if not exists lapses int not null default 0,
  add column if not exists srs_interval int not null default 0,
  add column if not exists ease real not null default 2.5,
  add column if not exists due_at timestamptz,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists mastered boolean not null default false;
