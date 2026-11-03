import type { User } from '@supabase/supabase-js';

/** Longest name a learner can choose for themselves. */
export const MAX_ACCOUNT_NAME = 40;

/** The name on the account: the one chosen in the app (`display_name`), else
 *  Google's full name, else the part of the email before the @ — or ''
 *  signed out. The chosen name has its own key because Supabase re-copies the
 *  Google profile over `full_name` on every sign-in; the server reads names
 *  the same way (account_name() in SQL, _shared/accountName.ts). */
export function accountName(
  user: Pick<User, 'email' | 'user_metadata'> | null | undefined,
  max = 24,
): string {
  if (!user) return '';
  const meta = user.user_metadata ?? {};
  for (const key of ['display_name', 'full_name', 'name']) {
    const v = meta[key];
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, max);
  }
  return (user.email?.split('@')[0] || '').slice(0, max);
}
