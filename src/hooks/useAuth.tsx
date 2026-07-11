import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useVocabularyStore } from './useVocabulary';
import { useCompanion } from './useCompanion';
import { useCollections } from './useCollections';
import { useGuessGame } from './useGuessGame';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
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
        useVocabularyStore.getState().loadFromRemote(session.user.id);
        useCompanion.getState().loadFromRemote(session.user.id);
        useCollections.getState().loadFromRemote(session.user.id);
        useGuessGame.getState().loadFromRemote(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Defer Supabase calls out of the auth callback. Supabase holds an internal
      // lock for the duration of this callback; awaiting another Supabase call
      // here deadlocks it and hangs every subsequent Supabase request.
      setTimeout(() => {
        if (session?.user) {
          useVocabularyStore.getState().loadFromRemote(session.user.id);
          useCompanion.getState().loadFromRemote(session.user.id);
          useCollections.getState().loadFromRemote(session.user.id);
          useGuessGame.getState().loadFromRemote(session.user.id);
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
      options: { redirectTo: window.location.href },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
