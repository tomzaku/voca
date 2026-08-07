-- Give a team its own scoring window, so an owner can start a fresh season or
-- run a challenge over a fixed few days.
--
-- The score has always been DERIVED — recomputed from the review log every time
-- a board is read, never accumulated into a column (see scoreFor/statsFor in
-- the `teams` edge function). That is what makes this two columns rather than a
-- migration: moving the window recomputes history instead of rewriting it, so a
-- reset is exact, and clearing these columns puts every score back where it was.
--
--   both null              the built-in rolling 30-day window (Global)
--   scored_since set       cumulative from that instant — "reset to zero, now"
--   scored_until set       the window closes then; the board is final afterwards
--
-- `scored_since` may be in the future: a challenge announced on Monday to start
-- on Saturday shows everyone on zero until it opens.

alter table teams
  add column if not exists scored_since timestamptz,
  add column if not exists scored_until timestamptz;

-- Reading a board refreshes the members whose numbers have gone stale, oldest
-- first — which is this index. Without it that pass sorts the whole membership.
create index if not exists idx_team_members_stale
  on team_members (team_id, stats_at);

-- Existing teams keep both columns null and so keep the rolling window they
-- already had. No score changes on deploy from this file alone.
