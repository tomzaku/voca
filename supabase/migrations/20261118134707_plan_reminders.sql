-- Reminders that know the plan. A learner with a course gets a reminder naming
-- what's left of today's plan ("IELTS listening + 10 words") rather than only
-- a due word — and gets one even with no words due, because the plan still
-- has sessions for today.
--
-- The rows carry what the `notify` function needs to work out today's tasks
-- itself (course, goal, the learner's local date) plus which are already done
-- (plan_task_log). The rotation that turns those into tasks lives in
-- supabase/functions/_shared/coursePlan.ts, shared with the app — not here,
-- so it's written once.
--
-- The return type grows, which `create or replace` can't do: drop and recreate.
drop function if exists pending_review_reminders();
drop function if exists test_reminder_targets(text);

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
  review_due boolean,
  course jsonb,
  daily_goal smallint,
  local_date date,
  plan_done text[]
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
    r.at_risk as streak_at_risk,
    (u.notify_review and d.word is not null) as review_due,
    case when u.notify_review then u.course end as course,
    u.daily_goal,
    c.local_date,
    coalesce(
      (select array_agg(l.task) from plan_task_log l where l.user_id = s.user_id and l.day = c.local_date),
      '{}'
    ) as plan_done
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
      and u.last_active_day is distinct from c.local_date
      and c.slot = (select max(x) from unnest(u.reminder_times) as x)
    ) as at_risk
  ) r
  left join lateral (
    select
      (
        select count(*)
        from user_word_progress p
        where p.user_id = s.user_id and p.due_at <= now() and not p.mastered
      ) as due_count,
      (
        select shortlist.word
        from (
          select p.word
          from user_word_progress p
          where p.user_id = s.user_id
            and p.due_at <= now()
            and not p.mastered
          order by (p.lapses + p.wrong_count) desc
          limit 5
        ) as shortlist
        order by random()
        limit 1
      ) as word
  ) d on true
  where u.reminder_enabled
    and c.slot = any(u.reminder_times)
    and extract(dow from t.local_now)::smallint = any(u.reminder_days)
    and (s.last_sent_at is null or s.last_sent_at < now() - interval '25 minutes')
    -- A course counts as something to remind about; `notify` drops the row
    -- if every task today turns out to be done and nothing else is due.
    and (r.at_risk or (u.notify_review and (d.word is not null or u.course is not null)));
$$;
revoke all on function pending_review_reminders() from public, anon, authenticated;
grant execute on function pending_review_reminders() to service_role;

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
  review_due boolean,
  course jsonb,
  daily_goal smallint,
  local_date date,
  plan_done text[]
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
    (us.notify_review and d.word is not null) as review_due,
    us.course,
    us.daily_goal,
    (now() at time zone us.reminder_timezone)::date as local_date,
    coalesce(
      (select array_agg(l.task) from plan_task_log l
        where l.user_id = s.user_id and l.day = (now() at time zone us.reminder_timezone)::date),
      '{}'
    ) as plan_done
  from push_subscriptions s
  join auth.users u on u.id = s.user_id
  join user_settings us on us.user_id = s.user_id
  left join lateral (
    select
      (
        select count(*)
        from user_word_progress p
        where p.user_id = s.user_id and p.due_at <= now() and not p.mastered
      ) as due_count,
      (
        select shortlist.word
        from (
          select p.word
          from user_word_progress p
          where p.user_id = s.user_id
            and p.due_at <= now()
            and not p.mastered
          order by (p.lapses + p.wrong_count) desc
          limit 5
        ) as shortlist
        order by random()
        limit 1
      ) as word
  ) d on true
  where lower(u.email) = lower(p_email);
$$;
revoke all on function test_reminder_targets(text) from public, anon, authenticated;
grant execute on function test_reminder_targets(text) to service_role;
