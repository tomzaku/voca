-- Per-family monthly speech budgets. Google's free allowance is per pricing
-- SKU — Chirp 3 HD, Neural2, and WaveNet+Standard (one SKU between them) each
-- get their own monthly allowance — so with a voice picker in Settings, each
-- family needs its own ceiling, or trying one family would spend another's.
--
-- Same table as before; the key becomes 'YYYY-MM:<family>'. Replaces the
-- two-argument reserve_speech_chars, which only the speech function called.

drop function if exists reserve_speech_chars(int, bigint);

create or replace function reserve_speech_chars(p_family text, p_chars int, p_limit bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  k text := to_char(now() at time zone 'utc', 'YYYY-MM') || ':' || p_family;
  ok boolean;
begin
  if p_chars <= 0 or p_chars > p_limit or coalesce(p_family, '') = '' then
    return false;
  end if;

  insert into speech_usage as u (month, chars)
  values (k, p_chars)
  on conflict (month) do update set chars = u.chars + excluded.chars
    where u.chars + excluded.chars <= p_limit
  returning true into ok;

  return coalesce(ok, false);
end;
$$;

revoke all on function reserve_speech_chars(text, int, bigint) from public, anon, authenticated;
grant execute on function reserve_speech_chars(text, int, bigint) to service_role;
