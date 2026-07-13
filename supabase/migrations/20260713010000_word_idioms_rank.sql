-- Popularity rank for a word's idioms: 1 = the idiom most often heard in
-- everyday speech. Kept on the LINK (word_idioms), not on idioms, because the
-- same idiom can matter more for one word than another ("work like a dog"
-- ranks high for "dog", lower for "work"). Generation returns idioms ordered
-- most-common-first; the position becomes the rank.
alter table word_idioms
  add column if not exists rank int not null default 100;

-- Links written before ranks existed are in arbitrary order and can't be
-- re-ranked without regenerating, so drop them and unmark their words: the
-- backfill script recreates them ranked (idiom rows are kept and reused on
-- relink — only the word↔idiom links are rebuilt).
delete from word_idioms;
update word_cache set idioms_checked_at = null where idioms_checked_at is not null;
