-- Daily learning streak.
--
-- A streak is counted in the learner's OWN calendar days, which is why the
-- client passes its local date in rather than the server using now()::date —
-- for a user in Asia/Saigon, "today" ends 7 hours before it does in UTC, and
-- counting in UTC would break their streak while they're still awake.

alter table user_settings
  add column if not exists streak_count int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists last_active_day date;

/**
 * Record that the signed-in user studied on `p_local_date`, advancing the
 * streak. Idempotent within a day: the app calls it on every graded answer, so
 * the second and later calls must be no-ops.
 *
 * SECURITY DEFINER over auth.uid() rather than taking a user_id: a client must
 * not be able to bump someone else's streak. Row-locked because two devices
 * answering at once would otherwise both read the old count and both write +1.
 */
create or replace function record_learning_day(p_local_date date)
returns table (streak_count int, longest_streak int, last_active_day date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last date;
  v_streak int;
  v_longest int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- A user may have no settings row yet (streaks can start before any
  -- preference is saved).
  insert into user_settings (user_id) values (v_user)
  on conflict (user_id) do nothing;

  select us.last_active_day, us.streak_count, us.longest_streak
    into v_last, v_streak, v_longest
    from user_settings us
   where us.user_id = v_user
     for update;

  if v_last = p_local_date then
    -- Already counted today — leave the streak untouched.
    null;
  elsif v_last = p_local_date - 1 then
    v_streak := v_streak + 1;
  else
    -- First ever day (v_last is null, so both comparisons above are NULL), or
    -- a gap: either way this is day one.
    v_streak := 1;
  end if;

  v_longest := greatest(coalesce(v_longest, 0), v_streak);

  update user_settings us
     set streak_count = v_streak,
         longest_streak = v_longest,
         -- greatest() so a device on a lagging clock (or a traveller crossing
         -- back over a date line) can't drag the last active day backwards.
         last_active_day = greatest(coalesce(us.last_active_day, p_local_date), p_local_date),
         updated_at = now()
   where us.user_id = v_user;

  return query
    select v_streak, v_longest, greatest(coalesce(v_last, p_local_date), p_local_date);
end;
$$;

revoke all on function record_learning_day(date) from public, anon;
grant execute on function record_learning_day(date) to authenticated;
