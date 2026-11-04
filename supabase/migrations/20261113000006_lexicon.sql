-- Which parts of speech each English word really has, from WordNet 3.1
-- (noun, verb, adjective, adverb). Seeded by scripts/build-lexicon.mjs.
--
-- It exists to check the model: asked for a word's other senses, it invents
-- some — "lamp" as a verb, "abandoned" as a verb (an inflected form), "obsess"
-- as a noun. A sense is stored only if its word and part of speech are here;
-- parts of speech WordNet doesn't cover (preposition, pronoun…) pass through.
create table if not exists lexicon (
  word text not null,  -- lowercased lemma, spaces for multi-word entries
  pos  text not null check (pos in ('noun', 'verb', 'adjective', 'adverb')),
  primary key (word, pos)
);

-- RLS on with no policies: only the service role reads it.
alter table lexicon enable row level security;
