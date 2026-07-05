-- Word family: derivationally related forms of a word across parts of speech
-- (decide → decision, decisive, decidedly). Stored as a jsonb array of
-- { "word": "...", "pos": "..." }. Populated by the `word` edge function for
-- new words and by scripts/backfill-word-family.mjs for existing rows.
alter table word_cache
  add column if not exists word_family jsonb not null default '[]';
