-- Shared cache of AI-generated vocabulary data. Generating a word's definition,
-- examples, etc. costs tokens; that content (in the learn language) is the same
-- for everyone, so we store ONE row per word and reuse it across all users.
-- Only the translation differs per user, so translations are kept in a per-
-- language map: { "<mother_lang>": "translation" }. A new mother tongue only
-- needs a cheap translate-only call, not a full regeneration.
--
-- Written ONLY by the `ai` edge function (service role), never by clients — so
-- the cache can't be poisoned. Fields are explicit columns (not a JSON blob) so
-- the cache is inspectable and queryable.
create table if not exists word_cache (
  word text primary key,            -- English seed word, lowercased
  headword text,                    -- the display word the model returned
  phonetic text,                    -- IPA
  part_of_speech text,
  definition text not null,         -- in the learn language
  examples text[] not null default '{}',
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  image_keywords text[] not null default '{}',
  level text,
  translations jsonb not null default '{}',  -- { "<mother_lang>": "translation" }
  created_at timestamptz not null default now()
);

-- RLS on with no policies: only the service role (edge function) can touch it.
alter table word_cache enable row level security;
