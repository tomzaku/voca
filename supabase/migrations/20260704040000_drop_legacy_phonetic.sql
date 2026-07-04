-- Drop the legacy single `phonetic` column now that `phonetics` (locale-keyed
-- map) is the source of truth. First preserve any value that hasn't made it into
-- the map yet, as en-US, so no pronunciation is lost.
update word_cache
set phonetics = jsonb_build_object('en-US', phonetic)
where phonetic is not null and phonetic <> '' and phonetics = '{}'::jsonb;

alter table word_cache drop column if exists phonetic;
