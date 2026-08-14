-- Custom "Improve Writing" templates a user creates (Pro feature). The 5
-- built-in templates (General Writing, Slack, Jira Comment, Mail, Daily
-- Speaking) are NOT rows here — they're a client-side constant, since the
-- client always resolves and sends the instructions text itself.

create table if not exists writing_templates (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users on delete cascade,
  name         text not null,
  instructions text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table writing_templates enable row level security;

create policy "read own templates"
  on writing_templates for select
  using (auth.uid() = owner_id);

create policy "insert own templates"
  on writing_templates for insert
  with check (auth.uid() = owner_id);

create policy "update own templates"
  on writing_templates for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "delete own templates"
  on writing_templates for delete
  using (auth.uid() = owner_id);

create index if not exists idx_writing_templates_owner on writing_templates(owner_id);
