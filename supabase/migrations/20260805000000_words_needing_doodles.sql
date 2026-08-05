-- Words the next doodle sheet can be topped up with.
--
-- A sheet is one image cut into a 4x4 grid, and the crop reads the cells off
-- the rules the model drew. That only works when the model draws the grid it
-- was asked for — and asked for a 4x4 with eleven cells left empty, it doesn't:
-- it lays the five doodles out however it likes, the crop finds no 4x4, and
-- every thumbnail comes out cut across the wrong place. So a sheet is now
-- either full or not drawn at all, and this is where the words that fill it
-- come from when the caller didn't bring sixteen of their own.
--
-- They aren't filler in the wasteful sense: every cell is a real word from the
-- shared cache that nobody has drawn yet, saved to `word_doodles` like the
-- rest, so the words a learner meets later are already illustrated and free.
-- An image costs the same whatever it holds — the empty cells were the waste.
create or replace function words_needing_doodles(want integer, skip text[] default '{}')
returns table (word text, definition text)
language sql
stable
-- Both tables have RLS on with no policies at all, so the read has to happen
-- as the owner — same as every other function here that serves an edge
-- function (see pending_review_reminders).
security definer
set search_path = public
as $$
  select
    c.word,
    -- Same preference the edge function uses: the one-line "short" definition
    -- when a word has one, else the full one, which is NOT NULL.
    coalesce(nullif(btrim(c.short_definition), ''), c.definition) as definition
  from word_cache c
  left join word_doodles d on d.word = c.word
  where d.word is null
    and not (c.word = any (coalesce(skip, '{}')))
  -- Newest first: the recently generated words are the ones learners are
  -- actually meeting, so they're the ones worth spending a cell on.
  order by c.created_at desc
  limit greatest(coalesce(want, 0), 0);
$$;

-- Same posture as the tables it reads: only the service role (the `doodles`
-- edge function) gets to call it. Clients reach doodles through the function.
-- The grant is explicit because the revoke takes it away — EXECUTE reaches
-- every role through PUBLIC by default, and service_role holds it no other way.
revoke all on function words_needing_doodles(integer, text[]) from public, anon, authenticated;
grant execute on function words_needing_doodles(integer, text[]) to service_role;

-- The anti-join walks the cache newest-first; without this it sorts the whole
-- table every time a sheet is short of words.
create index if not exists word_cache_created_at_idx on word_cache (created_at desc);
