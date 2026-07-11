-- Pro accounts. A row in this table means the user has (or had) Pro:
-- `expires_at` NULL is a lifetime grant, otherwise Pro lasts until that
-- moment. There is no self-serve upgrade: rows are granted manually from the
-- SQL editor (or with the service role), e.g.
--
--   -- lifetime
--   insert into pro_users (user_id) values ('<auth.users uuid>');
--   -- one year
--   insert into pro_users (user_id, expires_at)
--     values ('<auth.users uuid>', now() + interval '1 year');
--   -- extend / renew an existing grant
--   update pro_users set expires_at = now() + interval '1 year'
--     where user_id = '<auth.users uuid>';
--
-- RLS only lets a user READ their own row — there are deliberately no
-- insert/update/delete policies, so the flag can never be self-granted from
-- the client. The `ai` edge function re-checks this table (including expiry)
-- server-side before running pro-only actions, so hiding the button
-- client-side is cosmetic, not the security boundary.

create table if not exists pro_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  expires_at timestamptz, -- NULL = lifetime
  note text
);

alter table pro_users enable row level security;

create policy "Users can read their own pro status"
  on pro_users
  for select
  using (auth.uid() = user_id);
