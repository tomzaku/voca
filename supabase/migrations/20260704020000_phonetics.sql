-- Per-accent phonetics, so a word can show US and UK (and later more)
-- pronunciations. Stored as a map { "us": "/…/", "uk": "/…/" } for
-- extensibility, alongside the legacy single `phonetic` column (kept as a
-- fallback for rows generated before this).
alter table word_cache
  add column if not exists phonetics jsonb not null default '{}';
