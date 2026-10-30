-- What the buddy wears in the world (the tailor's: figure, hair, its colour,
-- outfit, hat), so the look follows the user across devices. A small object of
-- short strings; the settings function checks its shape before writing it.
alter table user_settings
  add column if not exists companion_dress jsonb;
