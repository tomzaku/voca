-- Total review count per word ("how many times you've seen it"), shown on the
-- History page.
alter table user_word_progress
  add column if not exists views int not null default 0;
