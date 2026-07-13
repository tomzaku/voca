-- Popular idioms for cached words, normalized many-to-many: an idiom like
-- "work like a dog" belongs to several words ("work", "dog"), so the idiom
-- itself is stored ONCE in `idioms` and each word links to it through
-- `word_idioms` — no duplicated idiom text across words.
--
-- Written only by the backfill script (service role); clients receive idioms
-- through the `word` edge function response.
create table if not exists idioms (
  id         uuid primary key default gen_random_uuid(),
  idiom      text not null unique,  -- lowercased idiom text, e.g. "work like a dog"
  meaning    text not null,         -- short plain-English meaning
  example    text,                  -- one natural example sentence
  created_at timestamptz not null default now()
);

create table if not exists word_idioms (
  word     text not null,  -- lowercased word_cache word
  idiom_id uuid not null references idioms on delete cascade,
  primary key (word, idiom_id)
);

-- Idiom-side lookups and the FK cascade (the PK already covers word-side).
create index if not exists word_idioms_idiom_id_idx on word_idioms (idiom_id);

-- Set once the backfill has generated idioms for a word — even when none were
-- found (most rare/technical words have no idioms) — so those words aren't
-- re-queried on every re-run.
alter table word_cache
  add column if not exists idioms_checked_at timestamptz;

-- RLS on with no policies: only the service role can touch them.
alter table idioms enable row level security;
alter table word_idioms enable row level security;
