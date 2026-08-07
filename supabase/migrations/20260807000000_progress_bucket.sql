-- Learning bucket as a queryable column, so History can ask the server for
-- "my struggling words, newest 50" instead of the client downloading every row
-- and filtering in memory.
--
-- The rule is a mirror of wordBucket() in src/lib/progress.ts — same order of
-- tests, same names as the `?tab=` values. The two MUST stay in step: a word
-- that reads "Struggling" on the flash card has to come back from the
-- struggling filter. src/lib/progress.test.ts pins the client side.
--
-- Generated + stored (not a view) so it can be indexed, and so it can never
-- drift from the row it describes.
alter table user_word_progress
  add column if not exists bucket text
  generated always as (
    case
      -- Skipped for good — out of rotation entirely.
      when status = 'dismissed' then 'skipped'
      when mastered then 'mastered'
      -- Failed the last round, or wrong more often than right.
      when status = 'skipped' or wrong_count > correct_count then 'struggling'
      -- On the review schedule.
      when due_at is not null then 'learning'
      else 'not-started'
    end
  ) stored;

-- History's own query: one bucket (or a few), newest-seen first, paginated.
create index if not exists user_word_progress_bucket_idx
  on user_word_progress (user_id, bucket, learned_at desc);

-- The unfiltered timeline (the "Recent" filter) and the paginated initial
-- sync, which both read newest-first.
create index if not exists user_word_progress_recent_idx
  on user_word_progress (user_id, learned_at desc);

-- The "Saved" filter. Partial, because saved words are a small minority.
create index if not exists user_word_progress_saved_idx
  on user_word_progress (user_id, learned_at desc)
  where bookmarked;

-- Every filter-chip count in one round trip, without shipping the rows.
-- security_invoker so the querying user's RLS policy applies — each user sees
-- only their own counts.
create or replace view user_progress_bucket_counts
  with (security_invoker = on) as
  select
    user_id,
    bucket,
    count(*) as n,
    count(*) filter (where bookmarked) as saved_n
  from user_word_progress
  group by user_id, bucket;

grant select on user_progress_bucket_counts to authenticated;

-- Append one answer to a word's log, server-side.
--
-- The client used to read the whole log, push onto it and write it back. Now
-- that the log is no longer synced down at sign-in, a client doing that would
-- write back a log of one entry and wipe the history. Appending here also
-- makes two devices answering the same word stop clobbering each other.
--
-- The last 50 answers are kept (`- 0` drops the oldest); older answers survive
-- only in correct_count / wrong_count.
create or replace function append_review_log(p_word text, p_entry jsonb)
  returns void
  language sql
  security invoker
as $$
  update user_word_progress
     set review_log =
       case
         when jsonb_array_length(coalesce(review_log, '[]'::jsonb)) >= 50
           then coalesce(review_log, '[]'::jsonb) - 0
         else coalesce(review_log, '[]'::jsonb)
       end || jsonb_build_array(p_entry)
   where user_id = auth.uid()
     and word = p_word;
$$;

grant execute on function append_review_log(text, jsonb) to authenticated;
