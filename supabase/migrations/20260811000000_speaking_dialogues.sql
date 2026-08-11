-- AI-generated speaking-practice dialogues: a scripted conversation built from
-- a user's own vocabulary words and a topic they picked. Stored per-user (not
-- a shared cache like word_cache) because the content depends on which words
-- and topic this user chose — there is nothing to share across users.
--
-- Written ONLY through the caller's RLS-scoped client (never the service
-- role) — same as word_notes and progress — so user_id always comes from the
-- session, never a request body.
create table if not exists speaking_dialogues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  title text not null,
  situation text not null,
  speakers jsonb not null default '{"a":"A","b":"B"}',
  lines jsonb not null default '[]',        -- [{ speaker: 'a'|'b', text }]
  words text[] not null default '{}',       -- the vocabulary it was built from
  created_at timestamptz not null default now()
);

create index if not exists speaking_dialogues_user_created_idx
  on speaking_dialogues (user_id, created_at desc);

alter table speaking_dialogues enable row level security;

create policy "select own dialogues" on speaking_dialogues
  for select using (auth.uid() = user_id);

create policy "insert own dialogues" on speaking_dialogues
  for insert with check (auth.uid() = user_id);

create policy "delete own dialogues" on speaking_dialogues
  for delete using (auth.uid() = user_id);
