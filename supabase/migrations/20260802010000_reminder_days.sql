-- Let users choose *which days* a reminder fires, not just the hour.
--
-- Until now the schedule was implicitly "every day". Someone studying on
-- weekdays only had no way to say so, and a reminder that arrives when you
-- have no intention of studying is how an app teaches people to ignore it.

-- Day numbers match Postgres `extract(dow ...)`: 0 = Sunday ... 6 = Saturday,
-- which is also JavaScript's Date#getDay(), so client and server agree without
-- a translation layer.
alter table user_settings
  add column if not exists reminder_days smallint[] not null default '{0,1,2,3,4,5,6}';

-- 7am reads as "start of the day" more reliably than 8am across schedules.
alter table user_settings
  alter column reminder_hour set default 7;

-- Same signature as before — only the day filter is new.
create or replace function pending_review_reminders()
returns table (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  due_count bigint
)
language sql
security definer
set search_path = public
as $$
  select s.user_id, s.endpoint, s.p256dh, s.auth, count(p.word) as due_count
  from push_subscriptions s
  join user_settings u on u.user_id = s.user_id
  join user_word_progress p
    on p.user_id = s.user_id
   and p.due_at <= now()
   and not p.mastered
  where u.reminder_enabled
    -- Each user matched against their *own* local clock, which is how a single
    -- hourly UTC job serves every timezone at once.
    and extract(hour from (now() at time zone u.reminder_timezone)) = u.reminder_hour
    -- ...and only on the days they asked for, in that same local zone: near
    -- midnight the local weekday differs from UTC's.
    and extract(dow from (now() at time zone u.reminder_timezone))::smallint
        = any(u.reminder_days)
    -- Survive cron retries and hour-boundary jitter without double-sending.
    and (s.last_sent_at is null or s.last_sent_at < now() - interval '20 hours')
  group by s.user_id, s.endpoint, s.p256dh, s.auth
  -- Never send "you have 0 words due". A reminder with nothing behind it is
  -- how an app earns a permanent block.
  having count(p.word) > 0;
$$;

revoke all on function pending_review_reminders() from public, anon, authenticated;
grant execute on function pending_review_reminders() to service_role;
