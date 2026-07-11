-- Hand-drawn doodle for the Pro mind map, cached on the word's shared cache
-- row so each doodle is generated (and paid for) ONCE globally, then reused
-- by every user and device. Stored as a small data: URI (~96px PNG thumbnail,
-- downscaled server-side before saving). Written only by the `ai` edge
-- function (service role) — word_cache has RLS with no client policies.
alter table word_cache add column if not exists doodle text;
