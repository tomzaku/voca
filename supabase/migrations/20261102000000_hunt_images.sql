-- A hunt's pictures: the doodle a "which word is this?" question shows.
--
-- Apart from `hunts.stations` on purpose. A student's phone asks for its
-- team's state every few seconds and that read loads the stations, so thirty
-- inline images (~15 KB each) would ride along on every poll for every phone
-- in the room. Here a picture is fetched once, by an opaque key — not by its
-- word, which is the answer.
--
-- Same lock as the other hunt tables: RLS on, no policies, reached only
-- through the `hunts` edge function.

create table if not exists hunt_images (
  hunt_id uuid not null references hunts on delete cascade,
  key text not null,
  -- A data: URI (image/png, jpeg or webp), as the doodle cache stores them.
  data text not null,
  primary key (hunt_id, key)
);

alter table hunt_images enable row level security;
