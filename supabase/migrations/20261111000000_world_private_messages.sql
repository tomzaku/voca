-- Private messages in the world: each signed-in player listens on their own
-- private Realtime channel, `inbox:<their user id>`, and only they may.
--
-- Nobody sends to an inbox directly — there's deliberately no INSERT policy.
-- The `messages` edge function broadcasts with the service role (which skips
-- these policies), stamping the sender from their session, so a message can't
-- claim to be from someone it isn't. Nothing is stored: a message reaches
-- whoever is listening at that moment, like the world's open chat.
--
-- The open world channel (`world:hue`) is public and untouched by this.

create policy "world inbox: only its owner listens"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'inbox:' || (select auth.uid())::text
  );
