-- What the buddy wears in the world (the tailor's: hair and its colour, the
-- outfit and its colour, a hat), so the look follows the user across devices. A small object of
-- short strings; the settings function checks its shape before writing it.
alter table user_settings
  add column if not exists companion_dress jsonb;
