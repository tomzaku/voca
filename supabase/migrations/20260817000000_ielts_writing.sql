-- IELTS Writing practice: each user's own scored attempts.
--
-- The prompts themselves are NOT a table — like IELTS Speaking, Daily
-- Dialogue and Podcast (src/data/english*.ts), the question bank is static
-- content shipped in the client bundle (src/data/ieltsWriting.ts), not
-- something a user creates or a table anyone reads at runtime. `question_id`
-- below is that static file's id string, not a foreign key, for the same
-- reason `speaking_dialogues` doesn't FK into any "topics" table — there
-- isn't one.
--
-- Getting a score costs a Pro-gated AI call (ai-ielts-writing) — once a
-- caller has one, saving it here is just storage, so writing isn't Pro-gated
-- a second time (same reasoning as `mindmap`'s POST vs. `ai-mindmap`).
create table if not exists ielts_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  essay text not null,
  word_count int not null,
  band_overall numeric(2,1) not null,
  band_task numeric(2,1) not null,
  band_coherence numeric(2,1) not null,
  band_lexical numeric(2,1) not null,
  band_grammar numeric(2,1) not null,
  summary text not null,
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table ielts_submissions enable row level security;

create policy "Users can read their own IELTS submissions"
  on ielts_submissions for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own IELTS submissions"
  on ielts_submissions for insert
  with check (auth.uid() = owner_id);

create index idx_ielts_submissions_owner_created on ielts_submissions (owner_id, created_at desc);
