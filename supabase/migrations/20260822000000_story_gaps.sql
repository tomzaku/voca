-- AI-generated Story Gaps: a short paragraph built from a user's own
-- vocabulary words, with each target word wrapped in [[ ]] for the client to
-- turn into a drag-and-drop blank (see src/lib/wordService.ts#parseCloze).
-- Stored per-user, same shape/rationale as speaking_dialogues — the content
-- depends on which words this user chose, so there's nothing to share across
-- users, and a saved round should be replayable without paying for another
-- generation.
create table if not exists story_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paragraph text not null,             -- raw text, target words wrapped in [[ ]]
  words text[] not null default '{}',  -- the vocabulary it was built from
  learn_lang text not null default 'English',
  created_at timestamptz not null default now()
);

create index if not exists story_gaps_user_created_idx
  on story_gaps (user_id, created_at desc);

alter table story_gaps enable row level security;

create policy "select own story gaps" on story_gaps
  for select using (auth.uid() = user_id);

create policy "insert own story gaps" on story_gaps
  for insert with check (auth.uid() = user_id);

create policy "delete own story gaps" on story_gaps
  for delete using (auth.uid() = user_id);
