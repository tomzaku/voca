-- Rate limit for AI calls made without an account. Generating a new word is a
-- basic feature, so a visitor may do it too — but `check_ai_rate_limit` keys
-- off auth.uid(), which a visitor doesn't have. This one takes the key from
-- the caller instead: the `word` function passes a hash of the client's IP,
-- and a shared key that caps every visitor together per day, so cost stays
-- bounded however many IPs there are.
--
-- Same fixed-window, check-and-increment-in-one-statement shape as
-- check_ai_rate_limit.

create table if not exists anon_rate_limit (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- Locked down: rows are only ever touched by the function below.
alter table anon_rate_limit enable row level security;

create or replace function check_anon_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into anon_rate_limit as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else r.window_start
    end,
    count = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else r.count + 1
    end
  returning r.count into new_count;

  -- One row per visitor IP accumulates; sweep stale ones now and then rather
  -- than on every call.
  if random() < 0.01 then
    delete from anon_rate_limit where window_start < now() - interval '2 days';
  end if;

  return new_count <= p_limit;
end;
$$;

-- The key is caller-supplied, so only the server may call this — otherwise a
-- client could spend someone else's budget or reset its own with a new key.
revoke execute on function check_anon_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function check_anon_rate_limit(text, int, int) to service_role;
