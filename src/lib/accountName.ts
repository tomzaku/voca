import type { User } from '@supabase/supabase-js';

/** The name on the account you signed in with — Google's full name, else the
 *  part of the email before the @ — or '' signed out. */
export function accountName(user: User | null | undefined): string {
  if (!user) return '';
  const meta = user.user_metadata ?? {};
  const full = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
  return (full.trim() || user.email?.split('@')[0] || '').slice(0, 24);
}
