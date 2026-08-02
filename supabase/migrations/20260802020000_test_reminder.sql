-- Test-send support for the `notify` function.
--
-- `pending_review_reminders()` is deliberately gated on hour, weekday, due
-- words, and a 20-hour dedupe — which makes verifying a real device painful:
-- you either wait for the right hour or hand-edit four columns and remember to
-- put them back. This returns the same shape for one user with none of the
-- gates applied, so a test send exercises the real delivery path without
-- disturbing anyone's actual schedule.
--
-- Same posture as the scheduled query: SECURITY DEFINER because it reads across
-- users, and reachable only by service_role.
create or replace function test_reminder_targets(p_email text)
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
  select
    s.user_id,
    s.endpoint,
    s.p256dh,
    s.auth,
    (
      select count(*)
      from user_word_progress p
      where p.user_id = s.user_id
        and p.due_at <= now()
        and not p.mastered
    ) as due_count
  from push_subscriptions s
  join auth.users u on u.id = s.user_id
  where lower(u.email) = lower(p_email);
$$;

revoke all on function test_reminder_targets(text) from public, anon, authenticated;
grant execute on function test_reminder_targets(text) to service_role;
