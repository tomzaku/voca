-- A word's other parts of speech — "live" is a verb (/lɪv/) and an adjective
-- (/laɪv/). The word_cache row stays its primary meaning, so every reader that
-- knows nothing about senses keeps working; `word_senses` holds the rest, one
-- row each, ranked most common first.
--
-- Translations get their own table rather than a per-language column or map:
-- a learner only ever needs their own language, which is then one indexed
-- join (word, rank, lang) instead of unpacking every language on every read.
--
-- Written by the `word` function on generation and by
-- scripts/backfill-senses.mjs; clients get senses through the function.
create table if not exists word_senses (
  word             text not null references word_cache (word) on delete cascade,
  rank             smallint not null check (rank between 1 and 3),
  part_of_speech   text not null,
  ipa_us           text,
  ipa_gb           text,
  definition       text not null,
  short_definition text,
  examples         text[] not null default '{}',
  primary key (word, rank)
);

create table if not exists word_sense_translations (
  word        text not null,
  rank        smallint not null,
  lang        text not null,  -- lowercased language name, as in word_cache.translations
  translation text not null,
  primary key (word, rank, lang),
  foreign key (word, rank) references word_senses (word, rank) on delete cascade
);

-- Set once a word's senses have been asked for — even when it has only one
-- meaning, which is most words — so the backfill doesn't ask again.
alter table word_cache add column if not exists senses_checked_at timestamptz;

-- RLS on with no policies: only the service role can touch them.
alter table word_senses enable row level security;
alter table word_sense_translations enable row level security;
