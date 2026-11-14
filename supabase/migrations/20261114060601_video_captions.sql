-- Captions of YouTube videos, kept once fetched. The `captions` function gets
-- them from Supadata, a paid transcript service (a credit a video); a video's
-- captions don't change, so the first learner to open one pays for everyone
-- after, and the sample videos open at once.
--
-- Only videos that had captions are stored — "none in this language" is
-- asked again next time, in case some are added. Rows are the function's own
-- client-shaped payload, read back as is.
create table if not exists video_captions (
  video_id   text not null,
  lang       text not null,
  title      text not null default '',
  track      jsonb not null,               -- { lang, name, auto }
  tracks     jsonb not null default '[]',  -- [{ lang, name, auto }]
  lines      jsonb not null,               -- [{ start, end, text }]
  created_at timestamptz not null default now(),
  primary key (video_id, lang)
);

-- RLS on with no policies: only the service role touches it.
alter table video_captions enable row level security;
