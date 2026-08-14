-- A short, optional blurb shown in the template picker's detail view —
-- separate from `instructions` (what's actually sent to the AI).
alter table writing_templates add column if not exists description text;
