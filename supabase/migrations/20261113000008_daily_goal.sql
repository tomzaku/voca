-- How many words a day the learner means to review. Chosen on the first-visit
-- picker (or in Settings) and shown as the ring around the streak flame.
-- Null = never chosen; the client falls back to its default.
--
-- Bounded here as well as in the `settings` function, so a stray write can't
-- store a goal no one could ever meet.
alter table user_settings add column if not exists daily_goal smallint
  check (daily_goal between 1 and 100);
