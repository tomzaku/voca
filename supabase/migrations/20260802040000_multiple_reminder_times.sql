-- Allow up to 5 reminder times a day instead of exactly one.
--
-- One nudge a morning suits a commuter; someone studying in short bursts wants
-- a few. `reminder_hour` becomes `reminder_hours`, and the dedupe window has to
-- shrink with it — see the comment on the interval below, which is the part of
-- this change most likely to bite.

alter table user_settings
  add column if not exists reminder_hours smallint[];

-- Carry every existing schedule across before the old column goes.
update user_settings
   set reminder_hours = array[reminder_hour]::smallint[]
 where reminder_hours is null;

alter table user_settings
  alter column reminder_hours set default '{7}';

alter table user_settings
  alter column reminder_hours set not null;

-- The single-hour column and its range check are now dead.
alter table user_settings drop constraint if exists user_settings_reminder_hour_range;
alter table user_settings drop column if exists reminder_hour;

-- CHECK constraints can't contain subqueries, so the valid-hours set is spelled
-- out rather than generated.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_reminder_hours_valid'
  ) then
    alter table user_settings
      add constraint user_settings_reminder_hours_valid
      check (
        array_length(reminder_hours, 1) between 1 and 5
        and reminder_hours <@ '{0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23}'::smallint[]
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
    -- Any of their chosen hours, matched against their *own* local clock.
    and extract(hour from (now() at time zone u.reminder_timezone))::smallint
        = any(u.reminder_hours)
    and extract(dow from (now() at time zone u.reminder_timezone))::smallint
        = any(u.reminder_days)
    -- Guard against a cron retry inside the same hour, NOT against a second
    -- reminder later today: with up to 5 times a day the old 20-hour window
    -- would have swallowed every send after the first. The job runs hourly, so
    -- anything under an hour blocks duplicates while leaving back-to-back
    -- hourly slots (e.g. 7am and 8am) free to fire.
    and (s.last_sent_at is null or s.last_sent_at < now() - interval '50 minutes');
$$;

revoke all on function pending_review_reminders() from public, anon, authenticated;
grant execute on function pending_review_reminders() to service_role;
