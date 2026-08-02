-- Warn people before a streak dies.
--
-- Two changes to the scheduled query:
--   1. It now reports streak state, so the sender can choose between a normal
--      review nudge and a "your streak is about to break" one.
--   2. A row no longer requires due words. Saving a streak only needs ONE
--      answer, and a learner with nothing due can still answer a new word — so
--      gating the warning on the review queue would silence it exactly when
--      someone has been away long enough to have cleared it.
--
-- The warning fires only at the LAST reminder slot of the user's day. Telling
-- someone at 7am that their streak is at risk is false urgency — they have all
-- day. At their final slot it's true, and true urgency is what makes it work.

drop function if exists pending_review_reminders();

create function pending_review_reminders()
returns table (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  due_count bigint,
  word text,
  streak int,
  streak_at_risk boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.user_id, s.endpoint, s.p256dh, s.auth,
    coalesce(d.due_count, 0) as due_count,
    d.word,
    u.streak_count as streak,
    r.at_risk as streak_at_risk
  from push_subscriptions s
  join user_settings u on u.user_id = s.user_id
  cross join lateral (
    select now() at time zone u.reminder_timezone as local_now
  ) t
  cross join lateral (
    select
      (
        extract(hour from t.local_now)::int * 60
        + (floor(extract(minute from t.local_now) / 30) * 30)::int
      )::smallint as slot,
      t.local_now::date as local_date
  ) c
  cross join lateral (
    select (
      u.streak_count > 0
      -- `is distinct from` so a null last_active_day counts as "not today".
      and u.last_active_day is distinct from c.local_date
      and c.slot = (select max(x) from unnest(u.reminder_times) as x)
    ) as at_risk
  ) r
  -- LEFT join: a streak warning must survive an empty review queue.
  left join lateral (
    select p.word, count(*) over () as due_count
    from user_word_progress p
    where p.user_id = s.user_id
      and p.due_at <= now()
      and not p.mastered
    order by (p.lapses + p.wrong_count) desc, random()
    limit 1
  ) d on true
  where u.reminder_enabled
    and c.slot = any(u.reminder_times)
    and extract(dow from t.local_now)::smallint = any(u.reminder_days)
    and (s.last_sent_at is null or s.last_sent_at < now() - interval '25 minutes')
    -- Something worth saying: words to review, or a streak to rescue.
    and (d.word is not null or r.at_risk);
$$;

revoke all on function pending_review_reminders() from public, anon, authenticated;
grant execute on function pending_review_reminders() to service_role;

-- Test sends report streak state too, so `notify:test` exercises whichever
-- message the user would actually receive.
drop function if exists test_reminder_targets(text);

create function test_reminder_targets(p_email text)
returns table (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  due_count bigint,
  word text,
  streak int,
  streak_at_risk boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.user_id, s.endpoint, s.p256dh, s.auth,
    coalesce(d.due_count, 0) as due_count,
    d.word,
    us.streak_count as streak,
    (
      us.streak_count > 0
      and us.last_active_day is distinct from (now() at time zone us.reminder_timezone)::date
    ) as streak_at_risk
  from push_subscriptions s
  join auth.users u on u.id = s.user_id
  join user_settings us on us.user_id = s.user_id
  left join lateral (
    select p.word, count(*) over () as due_count
    from user_word_progress p
    where p.user_id = s.user_id
      and p.due_at <= now()
      and not p.mastered
    order by (p.lapses + p.wrong_count) desc, random()
    limit 1
  ) d on true
  where lower(u.email) = lower(p_email);
$$;

revoke all on function test_reminder_targets(text) from public, anon, authenticated;
grant execute on function test_reminder_targets(text) to service_role;
