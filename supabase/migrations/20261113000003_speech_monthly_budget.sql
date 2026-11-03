-- A hard monthly ceiling on characters sent to Google Cloud TTS by the
-- `speech` function, so the cloud voice stays inside Google's free allowance.
-- Google's own budgets only alert — they never stop spending — so the stop
-- has to live here. Past the ceiling the function answers 429 and the app
-- reads with the device voice until the month turns over.
--
-- Counted per UTC calendar month. Only new clips are counted; a cached clip
-- costs Google nothing.

create table if not exists speech_usage (
  month text primary key,          -- 'YYYY-MM', UTC
  chars bigint not null default 0
);

-- Locked down: only the function below touches it.
alter table speech_usage enable row level security;

-- Reserve p_chars against this month's budget. True if it fit (and is now
-- counted); false if it would cross p_limit, in which case nothing changes.
-- One statement, so concurrent callers can't both squeeze past the ceiling.
create or replace function reserve_speech_chars(p_chars int, p_limit bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m text := to_char(now() at time zone 'utc', 'YYYY-MM');
  ok boolean;
begin
  if p_chars <= 0 or p_chars > p_limit then
    return false;
  end if;

  insert into speech_usage as u (month, chars)
  values (m, p_chars)
  on conflict (month) do update set chars = u.chars + excluded.chars
    where u.chars + excluded.chars <= p_limit
  returning true into ok;

  return coalesce(ok, false);
end;
$$;

-- Server-only: the speech function calls it with the service role. A client
-- able to call it could burn the month's budget for everyone.
revoke all on function reserve_speech_chars(int, bigint) from public, anon, authenticated;
grant execute on function reserve_speech_chars(int, bigint) to service_role;
