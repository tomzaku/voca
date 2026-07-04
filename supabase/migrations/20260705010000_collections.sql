-- User-created vocabulary collections. System collections (Curated, CEFR
-- levels) stay bundled client-side; this table holds collections users create
-- themselves. A collection can be shared by making it public — anyone with the
-- link can then read (and study) it, but only the owner can modify it.
create table if not exists collections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users on delete cascade,
  name        text not null,
  description text,
  words       text[] not null default '{}',
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table collections enable row level security;

create policy "read own or public collections"
  on collections for select
  using (is_public or auth.uid() = owner_id);

create policy "insert own collections"
  on collections for insert
  with check (auth.uid() = owner_id);

create policy "update own collections"
  on collections for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "delete own collections"
  on collections for delete
  using (auth.uid() = owner_id);
