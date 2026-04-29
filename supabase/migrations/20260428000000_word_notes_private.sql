-- Add is_private flag to word_notes

alter table word_notes
  add column if not exists is_private boolean not null default false;

-- Drop the old open-read policy and replace it with one that hides private notes
drop policy if exists "notes_select" on word_notes;

create policy "notes_select"
  on word_notes for select
  using (
    is_private = false
    or auth.uid() = user_id
  );
