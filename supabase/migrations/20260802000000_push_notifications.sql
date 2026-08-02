-- Daily review reminders over Web Push.
--
-- Two halves, deliberately split:
--   * WHEN to remind is a property of the user  -> user_settings
--   * WHERE to deliver is a property of a device -> push_subscriptions
-- A user with a phone and a laptop has one preferred hour but two endpoints,
-- and endpoints expire independently of each other.

-- ─── When ────────────────────────────────────────────────────────────

alter table user_settings
  -- Hour 0-23 in the user's *own* zone. The sender runs hourly in UTC and
  -- matches this against each user's local clock, so one job serves everyone.
  add column if not exists reminder_hour int not null default 8,
  add column if not exists reminder_timezone text not null default 'UTC',
  -- Separate from having a subscription: toggling the reminder off should not
  -- throw away push permission, because permission can't be re-requested once
  -- a user has denied it.
  add column if not exists reminder_enabled boolean not null default false;

-- Postgres has no `add constraint if not exists`, and the rest of this file is
-- re-runnable, so guard it explicitly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_reminder_hour_range'
  ) then
    alter table user_settings
      add constraint user_settings_reminder_hour_range
      check (reminder_hour between 0 and 23);
  end if;
end $$;

-- ─── Where ───────────────────────────────────────────────────────────

create table if not exists push_subscriptions (
  user_id uuid not null references auth.users on delete cascade,
  -- The push service URL identifies the device; it is the natural key.
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  -- Dedupe guard: a cron retry within the same day must not double-send.
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "Users can manage their own push subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The sender scans by user; keep that lookup cheap as devices accumulate.
create index if not exists push_subscriptions_user_idx
  on push_subscriptions (user_id);

-- The hourly job's hot path is "words that came due" — without this it degrades
-- into a full scan of every user's progress once an hour.
create index if not exists user_word_progress_due_idx
  on user_word_progress (user_id, due_at)
  where due_at is not null and not mastered;

-- ─── Who to notify, right now ────────────────────────────────────────

-- Called once an hour by the `notify` edge function. Returns one row per device
-- that should receive a reminder this hour.
--
-- SECURITY DEFINER because it deliberately reads across users — access is
-- restricted to service_role below, so the anon/authenticated roles the client
-- uses can never call it and harvest other people's push endpoints.
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
    -- Survive cron retries and hour-boundary jitter without double-sending.
    and (s.last_sent_at is null or s.last_sent_at < now() - interval '20 hours')
  group by s.user_id, s.endpoint, s.p256dh, s.auth
  -- Never send "you have 0 words due". A reminder with nothing behind it is
  -- how an app earns a permanent block.
  having count(p.word) > 0;
$$;

revoke all on function pending_review_reminders() from public, anon, authenticated;
grant execute on function pending_review_reminders() to service_role;
