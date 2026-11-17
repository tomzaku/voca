-- The course a learner signed up for on the first-visit picker: which goal
-- (everyday English or IELTS), where they started, where they're aiming, and
-- the day they began. The plan itself — stages, daily tasks, finish date — is
-- derived from this on the client, so it can change without a migration.
--
-- One JSON value rather than five columns: it's written and read as a unit,
-- and the `settings` function cleans it to known keys before it's stored.
-- Null = no course chosen; the app still works, just without a plan.
alter table user_settings add column if not exists course jsonb;
