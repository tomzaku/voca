-- Cached speech clips for the `speech` edge function (Google Cloud TTS).
--
-- Each clip is synthesized once and kept here, keyed by voice + a hash of the
-- text, so the same word or sentence is never paid for twice — whoever asks
-- for it next gets the stored file. Public read: a clip is the spoken form of
-- text that's already public study material, and a plain URL is what lets an
-- <audio> element on a phone play it straight from the CDN.
--
-- No insert/update policies on purpose: only the function's service-role
-- client writes, so a client can't plant audio under someone else's text.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speech', 'speech', true, 1048576, array['audio/mpeg'])
on conflict (id) do nothing;
