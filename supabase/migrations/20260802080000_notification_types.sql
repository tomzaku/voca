-- Per-type notification switches.
--
-- `reminder_enabled` becomes the MASTER switch (it already gates everything, and
-- turning it off is what unsubscribes the device). Underneath it, each kind of
-- notification gets its own flag, so someone can keep streak warnings while
-- muting review nudges — previously it was all or nothing.
--
-- Both default true: existing users who opted in already wanted both.

alter table user_settings
  add column if not exists notify_streak boolean not null default true,
  add column if not exists notify_review boolean not null default true;

-- Adding `review_due` changes the return type, so drop first.
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
  streak_at_risk boolean,
  review_due boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.user_id, s.endpoint, s.p256dh, s.auth,
    coalesce(d.due_count, 0) as due_count,
    -- Returned even when review nudges are muted: a streak warning still deep
    -- links to a due word so the tap lands on something answerable.
    d.word,
    u.streak_count as streak,
    r.at_risk as streak_at_risk,
    (u.notify_review and d.word is not null) as review_due
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
      u.notify_streak
      and u.streak_count > 0
      -- `is distinct from` so a null last_active_day counts as "not today".
      and u.last_active_day is distinct from c.local_date
      -- Only at the final slot of their day, where the urgency is real.
      and c.slot = (select max(x) from unnest(u.reminder_times) as x)
    ) as at_risk
  ) r
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
    -- Something this user actually wants to hear about.
    and (r.at_risk or (u.notify_review and d.word is not null));
$$;

revoke all on function pending_review_reminders() from public, anon, authenticated;
grant execute on function pending_review_reminders() to service_role;

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
  streak_at_risk boolean,
  review_due boolean
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
      us.notify_streak
      and us.streak_count > 0
      and us.last_active_day is distinct from (now() at time zone us.reminder_timezone)::date
    ) as streak_at_risk,
    (us.notify_review and d.word is not null) as review_due
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
