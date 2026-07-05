-- Track who studies a shared collection, so we can show "N learners" on it.
-- Membership rows are private (only your own are readable); the public-facing
-- number is a denormalized member_count on the collections row, maintained by
-- the join_collection() function below.
create table if not exists collection_members (
  collection_id uuid not null references collections on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  joined_at     timestamptz not null default now(),
  primary key (collection_id, user_id)
);

alter table collection_members enable row level security;

create policy "read own memberships"
  on collection_members for select
  using (auth.uid() = user_id);

alter table collections
  add column if not exists member_count int not null default 0;

-- Record that the current user studies a collection (idempotent). SECURITY
-- DEFINER so it can write the membership + counter regardless of RLS; it keys
-- off auth.uid() and only works on collections the caller can actually see.
create or replace function join_collection(cid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not exists (
    select 1 from collections where id = cid and (is_public or owner_id = auth.uid())
  ) then
    return;
  end if;

  insert into collection_members (collection_id, user_id)
  values (cid, auth.uid())
  on conflict do nothing;

  if found then
    update collections set member_count = member_count + 1 where id = cid;
  end if;
end;
$$;

grant execute on function join_collection(uuid) to authenticated;
