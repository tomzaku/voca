-- The learn page's guess-game mode ('smart' | 'random' | one of the real
-- games), stored per user so the choice follows them across devices.
-- Null = never chosen — the app defaults to 'smart'.
alter table user_settings
  add column if not exists guess_game text;
