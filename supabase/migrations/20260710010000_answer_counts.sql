-- Lifetime per-word answer tally: how many rounds were answered correctly and
-- how many wrong attempts were made (recorded when the word is revealed, since
-- the guess games differ in difficulty). Drives the correct/incorrect chart on
-- the revealed card.
alter table user_word_progress
  add column if not exists correct_count integer not null default 0,
  add column if not exists wrong_count integer not null default 0;
