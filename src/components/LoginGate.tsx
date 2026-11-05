import { matchPath, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

/**
 * Routes a visitor without an account can't use. Everything else is open.
 *
 * The app works without an account: progress, settings and the active
 * collection are kept on the device (every API call that reads them is quiet
 * and falls back to local state), and `word` serves anything already in the
 * shared cache. So a stranger can try nearly all of it before deciding to sign
 * up — what needs an account says so when it's used (AI features answer
 * "Please sign in." from `api.ts`), rather than walling off the whole page.
 *
 * What's left here are pages that are nothing *but* account data — a profile,
 * a cross-device dashboard, the quizzes you've shared — where a visitor would
 * only see an empty shell. Collections are open, a user's included: a public
 * list's page and slides read fine signed out, and studying it asks for an
 * account where it's offered.
 */
const PRIVATE_ROUTES = ['/profile', '/dashboard', '/quizzes'];

/** Google's "G". */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/**
 * Sign-in gate. Overlays the app when there's no signed-in user on a route that
 * can't work without one — see PRIVATE_ROUTES. Hidden while auth is still resolving
 * (including the OAuth redirect) and when there's no backend to sign into.
 *
 * Everywhere else the way in is the sidebar's "Sign in", not this.
 */
export function LoginGate() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { pathname } = useLocation();

  if (!supabase || loading || user) return null;
  if (!PRIVATE_ROUTES.some((route) => matchPath(route, pathname))) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card shadow-2xl p-8 text-center">
        <div className="text-4xl mb-5 font-display font-bold">
          voca<span className="text-accent-cyan">.</span>
        </div>

        <h2 className="text-xl font-display font-bold text-text-primary mb-2">
          <FormattedMessage id="auth.gateTitle" />
        </h2>
        <p className="text-sm text-text-muted mb-7">
          <FormattedMessage id="auth.gateBody" />
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
        >
          <GoogleG />
          <FormattedMessage id="auth.continueGoogle" />
        </button>
      </div>
    </div>
  );
}
