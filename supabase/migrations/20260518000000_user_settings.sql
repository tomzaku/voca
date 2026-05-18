create table if not exists user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  api_keys_encrypted text,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "Users can manage their own settings"
  on user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
