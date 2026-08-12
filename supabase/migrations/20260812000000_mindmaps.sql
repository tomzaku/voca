-- Server-side cache of generated mind maps, keyed by owner + mother tongue +
-- word set. The `mindmap` AI action is expensive (and pro-gated); once a map
-- has been generated for a given set of words, later visits should reuse the
-- stored tree instead of calling the AI again. `words` is stored normalized
-- (trimmed, lowercased, sorted) purely as the lookup key — the tree itself
-- still carries the real word text.
create table if not exists mindmaps (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users on delete cascade,
  mother_lang text not null default '',
  words       text[] not null,
  tree        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, mother_lang, words)
);

alter table mindmaps enable row level security;

create policy "read own mindmaps"
  on mindmaps for select
  using (auth.uid() = owner_id);

create policy "insert own mindmaps"
  on mindmaps for insert
  with check (auth.uid() = owner_id);

create policy "update own mindmaps"
  on mindmaps for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
