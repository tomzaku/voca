-- Treasure hunts played solo: every student races on their own, rather than
-- in two teams.
--
-- One column says which. Nothing else changes shape: a solo player is stored
-- on team 0 (the column must hold something, and nothing reads it in solo),
-- and their race is replayed from their own rows in hunt_finds and
-- hunt_answers, filtered by player instead of by team.

alter table hunts
  add column if not exists play text not null default 'teams'
  check (play in ('teams', 'solo'));
