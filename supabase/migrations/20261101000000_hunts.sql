-- Treasure hunts: a teacher splits a class into two teams, and each team races
-- through a chain of English challenges to open the treasure.
--
-- A hunt is played one of two ways, and the tables don't care which:
--   * 'qr'    — in a real classroom. Each station is a printed card with a QR
--               code, hidden somewhere; scanning it opens the station.
--   * 'world' — in /world. Each station is a landmark on the Huế map; walking
--               there opens it.
--
-- The state of the race is NOT stored. `hunt_events` is an append-only log
-- (a card found, a question solved or missed, the treasure opened) and every
-- read replays it — see supabase/functions/_shared/hunts.ts. Two students on
-- one team answering at the same instant both just append a row; nothing has
-- to be locked or reconciled, and the teacher's board can show the log itself.
--
-- Students don't need accounts. Joining hands back a random token, kept on
-- the student's device; only its hash is stored here.
--
-- Like `teams`, these carry NO row-level policies: RLS is on and nothing is
-- granted, so the browser can't read them at all — `stations` holds the
-- answers. Every rule lives in the `hunts` edge function.

create table if not exists hunts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  -- Typed by students to join, so short and unambiguous (no 0/O, 1/I/L).
  code text unique not null,
  title text not null,
  mode text not null check (mode in ('qr', 'world')),
  -- The word the collected letters spell; opening the treasure is typing it.
  treasure text not null,
  -- Station[] (see _shared/hunts.ts), answers included. Never sent as-is.
  stations jsonb not null,
  -- Correct answers, from different teammates, a station needs. Capped by
  -- the team's size when read, so a team of one can still play.
  need int not null default 2 check (need between 1 and 5),
  team_names jsonb not null default '["Red", "Blue"]'::jsonb,
  duration_min int not null default 30 check (duration_min between 5 and 180),
  status text not null default 'lobby' check (status in ('lobby', 'live', 'ended')),
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_hunts_owner on hunts (owner_id, created_at desc);

create table if not exists hunt_players (
  id uuid primary key default gen_random_uuid(),
  hunt_id uuid not null references hunts on delete cascade,
  -- sha-256 of the token the student's device holds.
  token_hash text unique not null,
  name text not null,
  team smallint not null check (team in (0, 1)),
  joined_at timestamptz not null default now()
);

create index if not exists idx_hunt_players_hunt on hunt_players (hunt_id, joined_at);

create table if not exists hunt_events (
  id bigserial primary key,
  hunt_id uuid not null references hunts on delete cascade,
  team smallint not null check (team in (0, 1)),
  -- Index into `stations`; -1 is the treasure itself.
  station smallint not null,
  player_id uuid references hunt_players on delete cascade,
  kind text not null check (kind in ('found', 'solve', 'miss', 'finish')),
  at timestamptz not null default now()
);

create index if not exists idx_hunt_events_hunt on hunt_events (hunt_id, id);

alter table hunts enable row level security;
alter table hunt_players enable row level security;
alter table hunt_events enable row level security;
