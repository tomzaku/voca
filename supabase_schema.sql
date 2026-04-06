-- Run this in your Supabase SQL editor to set up the database

create table if not exists user_word_progress (
  user_id uuid references auth.users on delete cascade,
  word text not null,
  status text not null check (status in ('bookmarked', 'known', 'skipped')),
  learned_at timestamptz not null default now(),
  primary key (user_id, word)
);

-- Enable Row Level Security
alter table user_word_progress enable row level security;

-- Users can only see and modify their own progress
create policy "Users can manage their own progress"
  on user_word_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
