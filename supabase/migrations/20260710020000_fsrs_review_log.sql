-- FSRS memory state + per-answer log.
-- stability/difficulty are the FSRS-5 memory variables (replace SM-2 ease as
-- the scheduler's state; ease is kept for old rows). review_log records the
-- datetime and correctness of each answer (client caps it at the last 50).
alter table user_word_progress
  add column if not exists stability double precision,
  add column if not exists difficulty double precision,
  add column if not exists review_log jsonb not null default '[]'::jsonb;
