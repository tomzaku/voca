-- Who joined a collection, with each member's progress through its words —
-- shown publicly on public collections (avatar + progress ring). SECURITY
-- DEFINER because memberships, auth.users metadata, and word progress are all
-- private tables; the function only answers for collections the caller could
-- see anyway (public, or their own), and only aggregates (a done-count, never
-- the actual words a member knows).
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
  order by m.joined_at asc
  limit 50;
$$;

grant execute on function collection_members_progress(uuid) to authenticated;
