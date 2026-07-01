-- Make saving (bookmarking) independent from the learning status, so a word
-- can be both "known" and "saved" at the same time. Previously `status` held a
-- single value in ('bookmarked', 'known', 'skipped'), so marking a saved word
-- as "known" silently dropped it from the saved list.

-- 1. New independent saved flag.
alter table user_word_progress
  add column if not exists bookmarked boolean not null default false;

-- 2. Relax `status` first so it can hold a learning outcome or null.
alter table user_word_progress alter column status drop not null;
alter table user_word_progress drop constraint if exists user_word_progress_status_check;

-- 3. Migrate existing rows: a 'bookmarked' status becomes the flag with no
--    learning outcome.
update user_word_progress
  set bookmarked = true, status = null
  where status = 'bookmarked';

-- 4. `status` now only holds a learning outcome (and may be null).
alter table user_word_progress
  add constraint user_word_progress_status_check
  check (status is null or status in ('known', 'skipped'));
