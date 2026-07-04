-- Common collocations (natural word pairings, e.g. "make a decision") for the
-- shared word cache. Learners benefit from seeing how a word is actually used
-- alongside other words. Populated by the `word` edge function.
alter table word_cache
  add column if not exists collocations text[] not null default '{}';
