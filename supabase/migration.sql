-- ============================================================
-- Voca — combined migration
-- Run this in the Supabase SQL Editor, or via:
--   npm run db:push      (Supabase CLI — requires `supabase link`)
--   npm run db:migrate   (psql — requires DATABASE_URL in .env.local)
-- ============================================================

-- ── 20260406000000_init ──────────────────────────────────────

create table if not exists user_word_progress (
  user_id uuid references auth.users on delete cascade,
  word text not null,
  status text not null check (status in ('bookmarked', 'known', 'skipped')),
  learned_at timestamptz not null default now(),
  primary key (user_id, word)
);

alter table user_word_progress enable row level security;

create policy "Users can manage their own progress"
  on user_word_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_user_word_progress_user_id on user_word_progress(user_id);
