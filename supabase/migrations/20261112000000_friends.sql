-- Friends: a request one person sends and the other accepts, and the private
-- messages friends send each other, kept so they're read even if the friend
-- wasn't in the world at the time. (Messages to anyone else stay delivered,
-- not stored — see the `messages` function.)
--
-- One row per pair, the two ids in order (user_a < user_b) so a pair can't
-- appear twice, whichever of them asked. `requested_by` says who asked, which
-- is what tells "sent" from "received" while it's pending.
--
-- RLS on, no policies: everything goes through the `friends` and `messages`
-- functions, which take the caller from the session and check the pair.

create table if not exists friendships (
  user_a uuid not null references auth.users on delete cascade,
  user_b uuid not null references auth.users on delete cascade,
  requested_by uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);

-- "My friends" reads both columns: the primary key covers user_a, this user_b.
create index if not exists idx_friendships_b on friendships (user_b);

create table if not exists friend_messages (
  id bigserial primary key,
  sender uuid not null references auth.users on delete cascade,
  recipient uuid not null references auth.users on delete cascade,
  text text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

-- A conversation, newest first, paged by id: either direction between two people.
create index if not exists idx_friend_messages_pair
  on friend_messages (least(sender, recipient), greatest(sender, recipient), id desc);
-- What I haven't read yet.
create index if not exists idx_friend_messages_unread on friend_messages (recipient, sender) where read_at is null;

alter table friendships enable row level security;
alter table friend_messages enable row level security;

-- Names and avatars for a list of people — they live in auth.users, which
-- PostgREST can't join. Service role only: the functions decide whose to ask.
create or replace function user_profiles(ids uuid[])
returns table (user_id uuid, display_name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.raw_user_meta_data->>'avatar_url'
  from auth.users u
  where u.id = any(ids[1:500]);
$$;

revoke all on function user_profiles(uuid[]) from public, anon, authenticated;
grant execute on function user_profiles(uuid[]) to service_role;
