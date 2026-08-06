-- Which doodles a human has actually looked at.
--
-- A doodle in `word_doodles` is what every learner sees for that word from then
-- on, and it can never be re-cut — only redrawn, for money. Two of the three
-- write paths put one there without anyone seeing it: the `doodles` edge
-- function draws on demand while somebody waits, and
-- `scripts/backfill-doodles.mjs --auto` writes unattended. Only the script's
-- default mode shows the sheet and its cut cells and asks y/n first.
--
-- `verified` records that difference, so an unreviewed doodle can be found and
-- looked at later instead of being trusted because it happens to exist.
--
-- Rows written before this column existed stay false: their provenance isn't
-- recorded anywhere, and claiming a human approved them would defeat the point.
alter table word_doodles
  add column if not exists verified boolean not null default false;

comment on column word_doodles.verified is
  'True only when a person looked at the cut doodle and approved it (backfill script, reviewed mode). On-demand draws and --auto runs are false, as is any doodle replaced by a later redraw.';

-- The one query this column is for: "what still needs looking at?". Partial, so
-- it only indexes the rows that aren't done.
create index if not exists word_doodles_unverified_idx
  on word_doodles (created_at desc) where not verified;
