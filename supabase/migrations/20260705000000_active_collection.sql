-- The user's selected vocabulary collection id (e.g. 'curated', 'level-3'), so
-- the choice syncs across devices. Collections themselves are client-side for
-- now; only this selection lives on the settings row.
alter table user_settings
  add column if not exists active_collection text;
