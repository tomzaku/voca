// A person's name, as every function shows it: the one they chose in the app
// (`display_name`), else their Google profile name, else their email's local
// part. `display_name` is separate from `full_name` because Supabase re-copies
// the Google profile into the metadata on each sign-in — see the
// account_display_name migration, whose account_name() SQL mirrors this, as
// does src/lib/accountName.ts.

interface NamedUser {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

export function accountName(user: NamedUser | null | undefined, max = 60): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  for (const key of ['display_name', 'full_name', 'name']) {
    const v = meta[key];
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, max);
  }
  return user.email?.split('@')[0]?.slice(0, max) || null;
}
