-- Rename phonetics map keys from the initial us/uk shape to locale codes
-- (en-US / en-GB). Data-only, idempotent — after this, no row has us/uk keys.
update word_cache
set phonetics =
      (phonetics - 'us' - 'uk')
      || (case when phonetics ? 'us' then jsonb_build_object('en-US', phonetics -> 'us') else '{}'::jsonb end)
      || (case when phonetics ? 'uk' then jsonb_build_object('en-GB', phonetics -> 'uk') else '{}'::jsonb end)
where phonetics ? 'us' or phonetics ? 'uk';
