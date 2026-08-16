import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { fetchMe } from '../lib/meApi';

// Google sign-in sets `created_at` and `last_sign_in_at` within the same
// request on a brand-new account, so a close match is how we tell "this is
// their first ever session" apart from every sign-in after it.
const NEW_ACCOUNT_WINDOW_MS = 60_000;

function isFirstSession(user: { created_at: string; last_sign_in_at?: string | null }): boolean {
  if (!user.last_sign_in_at) return false;
  const createdAt = new Date(user.created_at).getTime();
  const lastSignInAt = new Date(user.last_sign_in_at).getTime();
  return Math.abs(lastSignInAt - createdAt) < NEW_ACCOUNT_WINDOW_MS;
}

/**
 * Tells a brand-new user they've been started on a 5-day Pro trial — granted
 * server-side by a DB trigger the moment their account is created (see the
 * pro_trial migration), never by this component. Fires once per account.
 */
export function TrialWelcomeToast() {
  const { user, loading } = useAuth();
  const shown = useRef(false);

  useEffect(() => {
    if (loading || !user || shown.current) return;
    const key = `voca-trial-toast-shown-${user.id}`;
    if (localStorage.getItem(key) || !isFirstSession(user)) return;
    shown.current = true;
    void fetchMe().then((me) => {
      if (!me?.isTrial) return;
      toast.success("You're on a 5-day Pro trial — enjoy the full app!", { duration: 6000 });
      try {
        localStorage.setItem(key, 'true');
      } catch {
        /* ignore */
      }
    });
  }, [user, loading]);

  return null;
}
