-- A learner can rename themselves. The chosen name is stored in user metadata
-- as `display_name`, not over `full_name`: Supabase re-copies the Google
-- profile (full_name, name, avatar_url) into the metadata on every sign-in,
-- so a rename written there would quietly revert. `display_name` isn't a
-- provider claim, so it survives.
--
-- Every SQL reader of a person's name goes through account_name() so the
-- precedence lives in one place — mirrored in src/lib/accountName.ts and
-- supabase/functions/_shared/accountName.ts.

create or replace function account_name(meta jsonb, email text)
returns text
language sql
immutable
as $$
  select left(coalesce(
    nullif(btrim(meta->>'display_name'), ''),
    nullif(btrim(meta->>'full_name'), ''),
    nullif(btrim(meta->>'name'), ''),
    split_part(email, '@', 1)
  ), 60);
$$;

-- Bodies below are unchanged from 20261112000000, 20261105000000 and
-- 20261011000000 except for the name expression.

create or replace function user_profiles(ids uuid[])
returns table (user_id uuid, display_name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    account_name(u.raw_user_meta_data, u.email),
    u.raw_user_meta_data->>'avatar_url'
  from auth.users u
  where u.id = any(ids[1:500]);
$$;

revoke all on function user_profiles(uuid[]) from public, anon, authenticated;
grant execute on function user_profiles(uuid[]) to service_role;

create or replace function collection_roster(cid uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select
    m.user_id,
    account_name(u.raw_user_meta_data, u.email) as display_name,
    m.joined_at
  from collection_members m
  join auth.users u on u.id = m.user_id
  where m.collection_id = cid
  order by m.joined_at
  limit 1000;
$$;

revoke all on function collection_roster(uuid) from public, anon, authenticated;
grant execute on function collection_roster(uuid) to service_role;

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
      account_name(u.raw_user_meta_data, u.email) as display_name,
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
