-- Normalize word families into their own tables instead of a per-word column on
-- word_cache: a family (decide, decision, decisive, decidedly) is stored ONCE,
-- and every member word maps to it — no duplicated arrays across member rows,
-- and generating the family for one member covers the whole family.

alter table word_cache drop column if exists word_family;

create table if not exists word_families (
  id         uuid primary key default gen_random_uuid(),
  members    jsonb not null default '[]',  -- [{ "word": "...", "pos": "..." }] — every member incl. the seed
  created_at timestamptz not null default now()
);

create table if not exists word_family_members (
  word      text primary key,  -- lowercased member word → its family
  family_id uuid not null references word_families on delete cascade
);

-- Written only by the `word` edge function (service role) and the backfill
-- script; clients receive families through the function's response.
alter table word_families enable row level security;
alter table word_family_members enable row level security;
