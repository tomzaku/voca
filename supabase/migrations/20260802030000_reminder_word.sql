-- Name a real word in the reminder instead of counting them.
--
-- "12 words ready for review" is a chore notification: it describes a backlog,
-- and a backlog is easy to dismiss. Naming one word ("Still remember
-- 'ubiquitous'?") is a question, and a question is hard not to answer.
--
-- Which word: the one they've struggled with most (lapses + wrong answers),
-- breaking ties randomly so the same word doesn't nag every single day.

-- Both functions gain a `word` column, which changes their return type — that
-- needs a drop rather than `create or replace`.
drop function if exists pending_review_reminders();
drop function if exists test_reminder_targets(text);

create function pending_review_reminders()
returns table (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  due_count bigint,
  word text
)
language sql
security definer
set search_path = public
as $$
  select s.user_id, s.endpoint, s.p256dh, s.auth, d.due_count, d.word
  from push_subscriptions s
  join user_settings u on u.user_id = s.user_id
  -- One lateral yields both the headline word and the total: window functions
  -- run before LIMIT, so `count(*) over ()` still sees every due row.
  cross join lateral (
    select p.word, count(*) over () as due_count
    from user_word_progress p
    where p.user_id = s.user_id
      and p.due_at <= now()
      and not p.mastered
    order by (p.lapses + p.wrong_count) desc, random()
    limit 1
  ) d
  where u.reminder_enabled
    -- Each user matched against their *own* local clock, which is how a single
    -- hourly UTC job serves every timezone at once.
    and extract(hour from (now() at time zone u.reminder_timezone)) = u.reminder_hour
    -- ...and only on the days they asked for, in that same local zone: near
    -- midnight the local weekday differs from UTC's.
    and extract(dow from (now() at time zone u.reminder_timezone))::smallint
        = any(u.reminder_days)
    -- Survive cron retries and hour-boundary jitter without double-sending.
    and (s.last_sent_at is null or s.last_sent_at < now() - interval '20 hours');
  -- The cross join already guarantees at least one due word, so the old
  -- `having count(*) > 0` guard is now structural.
$$;

revoke all on function pending_review_reminders() from public, anon, authenticated;
grant execute on function pending_review_reminders() to service_role;

-- Test variant: same shape, no gates. LEFT JOIN LATERAL (not cross join) so a
-- device with nothing due still comes back — a test send must reach the phone
-- to prove delivery works, even on an empty queue.
create function test_reminder_targets(p_email text)
returns table (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  due_count bigint,
  word text
)
language sql
security definer
set search_path = public
as $$
  select s.user_id, s.endpoint, s.p256dh, s.auth,
         coalesce(d.due_count, 0) as due_count,
         d.word
  from push_subscriptions s
  join auth.users u on u.id = s.user_id
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
