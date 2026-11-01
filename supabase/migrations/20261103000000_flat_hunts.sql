-- Treasure hunts, flattened: every question and every answer is a row.
--
-- Until now a hunt carried its stations and questions as one JSON column, and
-- an answer was logged only as "right" or "wrong" at a station. That ran the
-- race, but nothing could be asked of it afterwards — which question was
-- hard, which wrong answer the class kept picking, every question about one
-- word. Here each of those is a plain indexed query.
--
--   question_sets ─< questions                     a teacher's reusable sets
--   hunts ─< hunt_stations ─< hunt_questions        a hunt's own copy of its questions
--   hunts ─< hunt_players
--   hunts ─< hunt_finds                             a card scanned / a landmark reached
--   hunts ─< hunt_answers >─ hunt_questions         every answer, with what was given
--
-- A hunt COPIES its questions when it's created, rather than pointing at the
-- set's. Editing a set later can't change a game under way, and a result
-- always names the exact question that was asked. The copy is a few rows of
-- text — pictures aren't copied: a question names its word, and the picture
-- is the one the app already keeps in `word_doodles`.
--
-- Same lock as before: RLS on, no policies, so the browser reaches none of
-- this directly — the answers are in here. Everything goes through the
-- `hunts` and `question-sets` edge functions.

-- ── A teacher's question sets ───────────────────────────────────────────────

create table if not exists question_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  title text not null,
  -- Kept by the function on every write, so listing sets doesn't read every
  -- question just to count them.
  question_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_question_sets_owner on question_sets (owner_id, updated_at desc);

-- The columns a question has, wherever it lives. `options` are the choices
-- (or a matching board's word bank); `accept` other answers that count for a
-- typed one; `pair_prompts`/`pair_words` a matching board's meanings and the
-- word for each, in order.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references question_sets on delete cascade,
  position smallint not null,
  type text not null check (type in ('definition', 'sentence', 'listen', 'unscramble', 'spell', 'image', 'match', 'custom')),
  prompt text not null default '',
  answer text not null,
  options text[],
  accept text[],
  say text,
  scrambled text,
  image_word text,
  pair_prompts text[],
  pair_words text[],
  -- The word it was made from, when the app made it.
  word text,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_set on questions (set_id, position);
-- "Every question about this word."
create index if not exists idx_questions_word on questions (lower(word)) where word is not null;

-- ── A hunt's stations and its copy of the questions ─────────────────────────

alter table hunts add column if not exists set_id uuid references question_sets on delete set null;

create table if not exists hunt_stations (
  hunt_id uuid not null references hunts on delete cascade,
  station smallint not null,
  -- Printed on the classroom card; what its QR link carries.
  card text not null,
  -- World mode: the landmark (a `places` id) that opens it.
  place text,
  clue text not null default '',
  letter text not null check (length(letter) = 1),
  primary key (hunt_id, station)
);

create table if not exists hunt_questions (
  id uuid primary key default gen_random_uuid(),
  hunt_id uuid not null,
  station smallint not null,
  position smallint not null,
  -- The set question it was copied from, while that still exists.
  source_id uuid references questions on delete set null,
  type text not null check (type in ('definition', 'sentence', 'listen', 'unscramble', 'spell', 'image', 'match', 'custom')),
  prompt text not null default '',
  answer text not null,
  options text[],
  accept text[],
  say text,
  scrambled text,
  image_word text,
  pair_prompts text[],
  pair_words text[],
  word text,
  foreign key (hunt_id, station) references hunt_stations on delete cascade,
  unique (hunt_id, station, position)
);

create index if not exists idx_hunt_questions_source on hunt_questions (source_id) where source_id is not null;

-- ── What happens in a hunt ──────────────────────────────────────────────────

create table if not exists hunt_finds (
  id bigserial primary key,
  hunt_id uuid not null references hunts on delete cascade,
  team smallint not null check (team in (0, 1)),
  station smallint not null,
  player_id uuid references hunt_players on delete cascade,
  at timestamptz not null default now()
);

create index if not exists idx_hunt_finds_hunt on hunt_finds (hunt_id, id);

create table if not exists hunt_answers (
  id bigserial primary key,
  hunt_id uuid not null references hunts on delete cascade,
  player_id uuid references hunt_players on delete cascade,
  team smallint not null check (team in (0, 1)),
  -- A station, or -1 for the treasure word itself.
  station smallint not null,
  question_id uuid references hunt_questions on delete set null,
  -- What the student sent: a word, or a matching board's words joined by " | ".
  given text not null,
  correct boolean not null,
  at timestamptz not null default now()
);

-- The race: a hunt's answers in order.
create index if not exists idx_hunt_answers_hunt on hunt_answers (hunt_id, id);
-- A student's misses at a station — their cooldown and their next question.
create index if not exists idx_hunt_answers_misses on hunt_answers (hunt_id, player_id, station) where not correct;
-- Results per question.
create index if not exists idx_hunt_answers_question on hunt_answers (question_id) where question_id is not null;

-- ── Out with the old shape ─────────────────────────────────────────────────
--
-- Hunts made before this were test runs, so they're cleared rather than
-- carried over: every hunt and everything hanging off it goes.

truncate table hunts cascade;
alter table hunts drop column if exists stations;
drop table if exists hunt_events;

-- Pictures are read from `word_doodles` by word now.
drop table if exists hunt_images;

alter table question_sets enable row level security;
alter table questions enable row level security;
alter table hunt_stations enable row level security;
alter table hunt_questions enable row level security;
alter table hunt_finds enable row level security;
alter table hunt_answers enable row level security;
