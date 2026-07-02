import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { initApiKeyStorage } from '../lib/apiKeyStorage';
import { useVocabularyStore } from './useVocabulary';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  keysLoaded: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  keysLoaded: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

// True when the current URL looks like an in-progress OAuth callback — a PKCE
// `?code=` param or an implicit-flow `#access_token=` fragment. Used to avoid
// finalizing keys from a not-yet-parsed (null) session on the OAuth return.
function isOAuthRedirectPending(): boolean {
  if (typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  return hash.includes('access_token=') || new URLSearchParams(search).has('code');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [keysLoaded, setKeysLoaded] = useState(false);

  useEffect(() => {
    if (!supabase) {
      initApiKeyStorage(null);
      setKeysLoaded(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // During a Google OAuth redirect the session isn't parsed from the URL
      // yet, so getSession() returns null momentarily. Loading keys now would
      // use the logged-out/local set and let vocabulary generate before the
      // account's synced API keys arrive. Skip and let onAuthStateChange
      // (SIGNED_IN, fired once the URL is processed) load the account keys.
      if (!session && isOAuthRedirectPending()) return;
      setSession(session);
      setUser(session?.user ?? null);
      await initApiKeyStorage(session?.user ?? null);
      // Pull saved/known/skipped word progress from Supabase so History is
      // populated on a fresh browser (writes sync up; this brings it back down).
      if (session?.user) useVocabularyStore.getState().loadFromRemote(session.user.id);
      setKeysLoaded(true);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setKeysLoaded(false);
      setSession(session);
      setUser(session?.user ?? null);
      // Defer Supabase calls out of the auth callback. Supabase holds an internal
      // lock for the duration of this callback; awaiting another Supabase call
      // (initApiKeyStorage → fetchFromSupabase) here deadlocks it and hangs every
      // subsequent Supabase request, including the storage-mode switch.
      setTimeout(async () => {
        await initApiKeyStorage(session?.user ?? null);
        if (session?.user) useVocabularyStore.getState().loadFromRemote(session.user.id);
        setKeysLoaded(true);
        setLoading(false);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext value={{ user, session, loading, keysLoaded, signInWithGoogle, signOut }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
