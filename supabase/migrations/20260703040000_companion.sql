-- Learning companion choice + name, so the buddy follows the user across
-- devices (stored on the existing per-user settings row).
alter table user_settings
  add column if not exists companion_animal text,
  add column if not exists companion_name text;
