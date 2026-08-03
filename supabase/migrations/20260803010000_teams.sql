-- Teams: a group of learners who study alongside each other, and the standings
-- that go with it.
--
-- A team is the durable thing. Today the only one is "Global" — the built-in
-- team anyone can join — and the only thing built on top of it is a
-- leaderboard. Owned teams (a teacher and their students) attach to the same
-- two tables without reshaping them, which is why this is `teams` and not
-- `leaderboard_teams`. Built-in teams are the ones with no owner; there is no
-- way to rename or delete one.
--
-- These tables carry NO row-level policies, on purpose. RLS is enabled and
-- nothing is granted, so the browser cannot read or write them at all: every
-- operation goes through the `teams` edge function, which authenticates the
-- caller and states each rule as plain code. One door, and the rules are read
-- in TypeScript rather than reconstructed from policy expressions.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  -- Null = built-in (Global). Owned teams are created by, and belong to, a user.
  owner_id uuid references auth.users on delete cascade,
  -- Public teams are joinable by anyone; private ones are the invite case.
  is_public boolean not null default true,
  -- Denormalized (as on `collections`) so listing teams is one query.
  member_count int not null default 0,
  created_at timestamptz not null default now()
);

insert into teams (slug, name, description, owner_id)
values (
  'global',
  'Global',
  'Every learner who chose to share their progress.',
  null
)
on conflict (slug) do nothing;

/**
 * One membership — and the whole of what that member shares.
 *
 * Name, avatar and the three numbers live here rather than being joined out of
 * auth.users and user_word_progress at read time. Two reasons, in order of
 * importance: the row IS the consent, so leaving deletes everything shared in
 * one statement and no query can reach past it into private progress; and the
 * `auth` schema isn't exposed to PostgREST, so an edge function could not join
 * it anyway.
 *
 * The stats are a snapshot, refreshed by the edge function when the member
 * joins and each time they open a board. A member who hasn't opened the app in
 * a week shows last week's numbers — which is the honest reading of a
 * leaderboard anyone can walk away from.
 */
create table if not exists team_members (
  team_id uuid not null references teams on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  -- Words known or mastered: the ranking metric.
  learned int not null default 0,
  streak int not null default 0,
  longest int not null default 0,
  stats_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- The board's exact sort, so the top of a team is an index scan.
create index if not exists idx_team_members_standings
  on team_members (team_id, learned desc, longest desc, streak desc);

create index if not exists idx_team_members_user on team_members (user_id);

-- Enabled with no policies: denies every client, bypassed by the service role
-- the edge function holds.
alter table teams enable row level security;
alter table team_members enable row level security;
