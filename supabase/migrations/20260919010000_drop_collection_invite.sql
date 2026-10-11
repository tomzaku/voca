-- The share-link invite is served by the `collections` edge function now (it
-- reads the owner's name with the service client), so the anon-callable
-- SECURITY DEFINER function from the first attempt isn't needed.
drop function if exists collection_invite(uuid);
