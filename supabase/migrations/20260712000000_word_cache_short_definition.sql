-- Short one-line English definition used by the Pro mind map (distinct from
-- `definition`, which is the full learn-language definition from the word
-- function). Written only by the `ai` edge function (service role) after a
-- mindmap generation; read back to fill gaps when a later generation omits a
-- word's definition.
alter table word_cache add column if not exists short_definition text;
