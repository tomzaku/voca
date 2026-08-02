-- Half-hour granularity: 7:30 AM, not just 7:00.
--
-- `reminder_hours` (0-23) becomes `reminder_times`, stored as MINUTES SINCE
-- MIDNIGHT (0-1439, multiples of 30) so a time is one integer with no separate
-- minute column to keep in step. 7:30 AM is 450.
--
-- REQUIRES A CRON CHANGE. The job must now run twice an hour:
--   select cron.unschedule('voca-review-reminders');
--   select cron.schedule('voca-review-reminders', '0,30 * * * *', $$ ... $$);
-- Left on the hourly '0 * * * *' schedule, every :30 reminder silently never
-- fires. See the README.

alter table user_settings
  add column if not exists reminder_times smallint[];

-- Carry existing whole-hour schedules across: hour 7 -> 420 minutes.
update user_settings
   set reminder_times = (
     select array_agg((h * 60)::smallint order by h)
     from unnest(reminder_hours) as h
   )
 where reminder_times is null;

alter table user_settings
  alter column reminder_times set default '{420}';  -- 7:00 AM

alter table user_settings
  alter column reminder_times set not null;

alter table user_settings drop constraint if exists user_settings_reminder_hours_valid;
alter table user_settings drop column if exists reminder_hours;

-- CHECK constraints can't contain subqueries, but they may call an IMMUTABLE
-- function — which beats spelling out all 48 valid slots as a literal.
create or replace function is_half_hour_slots(times smallint[])
returns boolean
language sql
immutable
as $$
  select bool_and(t >= 0 and t < 1440 and t % 30 = 0) from unnest(times) as t;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_reminder_times_valid'
  ) then
    alter table user_settings
      add constraint user_settings_reminder_times_valid
      check (
        array_length(reminder_times, 1) between 1 and 5
        and is_half_hour_slots(reminder_times)
      );
  end if;
end $$;

-- Return shape is unchanged, so replace rather than drop.
create or replace function pending_review_reminders()
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
  -- The user's own wall clock, and the half-hour slot it currently falls in.
  cross join lateral (
    select now() at time zone u.reminder_timezone as local_now
  ) t
  cross join lateral (
    select (
      extract(hour from t.local_now)::int * 60
      + (floor(extract(minute from t.local_now) / 30) * 30)::int
    )::smallint as slot
  ) c
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
    -- Flooring to the slot means a job firing at :00:07 or :30:12 still matches.
    and c.slot = any(u.reminder_times)
    and extract(dow from t.local_now)::smallint = any(u.reminder_days)
    -- Absorbs a retry inside the same 30-minute slot without blocking a
    -- genuine next reminder, which can now be only 30 minutes away.
    and (s.last_sent_at is null or s.last_sent_at < now() - interval '25 minutes');
$$;

revoke all on function pending_review_reminders() from public, anon, authenticated;
grant execute on function pending_review_reminders() to service_role;
