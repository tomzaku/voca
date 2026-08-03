-- Rank teams on a rolling 30-day score instead of a lifetime word count.
--
-- Lifetime totals only go up, so the board would settle into whoever started
-- earliest and stay there: a newcomer studying every day could never close the
-- gap, and someone who stopped months ago would still outrank them. The score
-- decays, so holding a place means still turning up. The formula lives in
-- scoreFor() in the `teams` edge function — one place, in code, next to the
-- data it reads.
--
-- Written to be safe over any earlier draft of the teams migration: every
-- column add is guarded, and the objects the edge function replaced are dropped
-- only if they were ever created.

alter table team_members
  add column if not exists score int not null default 0,
  -- No-ops on the shipped schema; present so an earlier draft converges here.
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists learned int not null default 0,
  add column if not exists streak int not null default 0,
  add column if not exists longest int not null default 0,
  add column if not exists stats_at timestamptz not null default now();

alter table teams
  add column if not exists member_count int not null default 0;

-- The board's new sort, so the top of a team stays an index scan.
drop index if exists idx_team_members_standings;
create index idx_team_members_standings
  on team_members (team_id, score desc, learned desc, longest desc);

-- Existing members keep a zero score until their next board load recomputes it,
-- which is correct: a rolling window says nothing about anyone until it's
-- measured.

-- Drafts of this feature put the rules in SQL before the `teams` edge function
-- took them over. Dropped so there is exactly one door to these tables.
drop function if exists team_leaderboard(uuid, int);
drop function if exists my_teams();
drop function if exists join_team(uuid);
drop function if exists leave_team(uuid);

drop policy if exists "Teams are visible when public, owned or joined" on teams;
drop policy if exists "Owners manage their teams" on teams;
drop policy if exists "Users manage their own membership" on team_members;
