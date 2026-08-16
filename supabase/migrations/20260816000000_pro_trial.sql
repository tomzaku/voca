-- New accounts get a 5-day Pro trial automatically, granted the moment
-- `auth.users` gets a row — no client call, so it can't be skipped or
-- re-triggered by refreshing the signup page.
--
-- `note = 'trial'` distinguishes this from a manually-granted (paid/lifetime)
-- row with the same `expires_at` shape, so `me` can tell the client "you're on
-- a trial" instead of just "you're Pro" (see supabase/functions/me/index.ts).
create or replace function grant_pro_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pro_users (user_id, expires_at, note)
  values (new.id, now() + interval '5 days', 'trial')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_trial on auth.users;

create trigger on_auth_user_created_grant_trial
  after insert on auth.users
  for each row execute function grant_pro_trial();
