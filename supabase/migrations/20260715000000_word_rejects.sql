-- The negative counterpart to word_cache. Discovering that a word ISN'T real
-- costs tokens just like generating a real one, and the verdict is the same for
-- everyone — so we store it ONCE and reuse it. A second search for "recieve"
-- then costs zero tokens, on any device, for any user.
--
-- Keyed by (word, learn_lang): "gift" is a real English word but nonsense in
-- German, so a verdict only holds within the language it was made in.
--
-- Written ONLY by the `word` edge function (service role), never by clients —
-- so nobody can mark a real word as a typo for everyone else.
create table if not exists word_rejects (
  word text not null,                        -- as typed: trimmed, lowercased
  learn_lang text not null,                  -- lowercased
  suggestions text[] not null default '{}',  -- real words it was likely meant to be, closest first
  -- Bump REJECT_VERSION (supabase/functions/word/rejects.ts) to invalidate every
  -- verdict made by an older prompt or model. Models do wrongly reject
  -- rare-but-real words, and without this a negative cache would make one bad
  -- verdict permanent for everyone.
  version int not null default 1,
  hits int not null default 1,               -- so one-off keyboard mashing can be pruned
  created_at timestamptz not null default now(),
  primary key (word, learn_lang)
);

-- RLS on with no policies: only the service role (edge function) can touch it.
alter table word_rejects enable row level security;

-- Count a cache hit without a read-modify-write round trip. SECURITY DEFINER to
-- write past RLS; execute is revoked from clients, so only the edge function's
-- service-role client can call it.
create or replace function bump_word_reject(p_word text, p_learn_lang text)
returns void
language sql
security definer
set search_path = public
as $$
  update word_rejects
     set hits = hits + 1
   where word = p_word and learn_lang = p_learn_lang;
$$;

revoke all on function bump_word_reject(text, text) from public, anon, authenticated;
