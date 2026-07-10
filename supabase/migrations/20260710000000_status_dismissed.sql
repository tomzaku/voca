-- The Skip button now means "don't show me this word again": such words get
-- status 'dismissed' and leave the learning rotation (restorable from History).
-- Giving up on a word keeps status 'skipped' — it repeats until learned.
alter table user_word_progress drop constraint if exists user_word_progress_status_check;
alter table user_word_progress
  add constraint user_word_progress_status_check
  check (status is null or status in ('known', 'skipped', 'dismissed'));
