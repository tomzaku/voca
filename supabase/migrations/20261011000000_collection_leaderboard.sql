-- The collection page ranks members by how far through the list they are, so
-- the 50 rows that come back must be the top 50 — ordered by join date, a list
-- with more members would rank only its earliest learners. Same columns, same
-- visibility rule as 20260705050000; only the order changes.
create or replace function collection_members_progress(cid uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  done int,
  total int
)
language sql
security definer
set search_path = public
as $$
  select * from (
    select
      m.user_id,
      coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as display_name,
      u.raw_user_meta_data->>'avatar_url' as avatar_url,
      m.joined_at,
      (
        select count(*)::int
        from user_word_progress p
        where p.user_id = m.user_id
          and p.word = any(c.words)
          and (p.status = 'known' or p.mastered)
      ) as done,
      coalesce(array_length(c.words, 1), 0) as total
    from collections c
    join collection_members m on m.collection_id = c.id
    join auth.users u on u.id = m.user_id
    where c.id = cid
      and (c.is_public or c.owner_id = auth.uid())
  ) ranked
  order by done desc, joined_at asc
  limit 50;
$$;

grant execute on function collection_members_progress(uuid) to authenticated;
