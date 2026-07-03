-- Onboarding preferences. Collected once, right after a user's first sign-in,
-- via a popup. Stored here so we can tell (across devices) whether the user has
-- already been onboarded — if all of these are null, we show the popup.

-- The user_settings table (migration 20260518) is recorded as applied in the
-- remote history, but the table was dropped from the schema at some point — so
-- an `alter table` alone fails with "relation does not exist". Recreate it
-- idempotently first; this is a no-op anywhere the table already exists.
create table if not exists user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  api_keys_encrypted text,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

drop policy if exists "Users can manage their own settings" on user_settings;
create policy "Users can manage their own settings"
  on user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Onboarding preference columns.
alter table user_settings
  add column if not exists word_pack text,
  add column if not exists mother_language text,
  add column if not exists tts_engine text,
  add column if not exists tts_voice text;
