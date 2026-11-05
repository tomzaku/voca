import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { MAX_ACCOUNT_NAME } from '../lib/accountName';
import { useVocabularyStore } from './useVocabulary';
import { useCompanion } from './useCompanion';
import { useCollections } from './useCollections';
import { useGuessGame } from './useGuessGame';
import { useStreak } from './useStreak';
import { useDailyGoal } from './useDailyGoal';
import { useTeams } from './useTeams';
import { useActivity } from './useActivity';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Change the name others see you by; '' goes back to your Google name. */
  renameAccount: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  renameAccount: async () => {},
});

// True when the current URL looks like an in-progress OAuth callback — a PKCE
// `?code=` param or an implicit-flow `#access_token=` fragment. Used to avoid
// finalizing a not-yet-parsed (null) session on the OAuth return.
function isOAuthRedirectPending(): boolean {
  if (typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  return hash.includes('access_token=') || new URLSearchParams(search).has('code');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      // During a Google OAuth redirect the session isn't parsed from the URL
      // yet, so getSession() returns null momentarily. Skip and let
      // onAuthStateChange (SIGNED_IN, fired once the URL is processed) finalize.
      if (!session && isOAuthRedirectPending()) return;
      setSession(session);
      setUser(session?.user ?? null);
      // Pull saved/known/skipped word progress from Supabase so History is
      // populated on a fresh browser (writes sync up; this brings it back down).
      if (session?.user) {
        useVocabularyStore.getState().loadFromRemote();
        useCompanion.getState().loadFromRemote();
        useCollections.getState().loadFromRemote();
        useGuessGame.getState().loadFromRemote();
        useStreak.getState().loadFromRemote();
        useDailyGoal.getState().loadFromRemote();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Defer Supabase calls out of the auth callback. Supabase holds an internal
      // lock for the duration of this callback; awaiting another Supabase call
      // here deadlocks it and hangs every subsequent Supabase request.
      setTimeout(() => {
        // A rename changes the user, not whose data is on screen.
        if (session?.user && event !== 'USER_UPDATED') {
          useVocabularyStore.getState().loadFromRemote();
          useCompanion.getState().loadFromRemote();
          useCollections.getState().loadFromRemote();
          useGuessGame.getState().loadFromRemote();
          useStreak.getState().loadFromRemote();
          useDailyGoal.getState().loadFromRemote();
        }
        setLoading(false);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        // Always show Google's account picker instead of silently reusing
        // the last-used account, so users can sign in with a different email.
        queryParams: { prompt: 'select_account' },
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    // The streak lives only in memory, so without this it would still be on
    // screen for whoever signs in next.
    useStreak.getState().reset();
    // Same reason: the board (and whether *this* user shares to it) would
    // otherwise carry over to the next person signing in on this device.
    useTeams.getState().reset();
    // And the answer feed the dashboard draws — someone else's answers.
    useActivity.getState().reset();
    // 'local', not the default 'global': global revokes every session this
    // user has, so signing out on a laptop logged the phone out too.
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  // Written as `display_name`, never over `full_name`: Supabase re-copies the
  // Google profile into full_name on each sign-in, which would undo a rename.
  // Throws on failure so the caller can say so.
  const renameAccount = useCallback(async (name: string) => {
    if (!supabase) return;
    const trimmed = name.trim().slice(0, MAX_ACCOUNT_NAME);
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed || null } });
    if (error) throw error;
  }, []);

  return (
    <AuthContext value={{ user, session, loading, signInWithGoogle, signOut, renameAccount }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
