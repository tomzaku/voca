-- Public community notes for vocabulary words

create table if not exists word_notes (
  id uuid default gen_random_uuid() primary key,
  word text not null,
  user_id uuid references auth.users on delete set null,
  user_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table word_notes enable row level security;

-- Anyone can read notes (public)
create policy "notes_select"
  on word_notes for select
  using (true);

-- Authenticated users can insert their own notes
create policy "notes_insert"
  on word_notes for insert
  with check (auth.uid() = user_id);

-- Users can delete only their own notes
create policy "notes_delete"
  on word_notes for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_word_notes_word on word_notes(word);
create index if not exists idx_word_notes_user_id on word_notes(user_id);
