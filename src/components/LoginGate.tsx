import { useEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { fetchInvite, type CollectionInvite } from '../lib/collectionsApi';
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
 * only see an empty shell. A user collection's share link (UUID id) gets the
 * invite card instead; built-in collections have slug ids and stay open.
 */
const PRIVATE_ROUTES = ['/profile', '/dashboard', '/quizzes'];

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * The collection id in a share link, if that's where we are — the detail page
 * (`/collections/<id>`), or the older `/collections?c=<id>` form.
 */
function inviteId(pathname: string, search: string): string | null {
  const c = matchPath('/collections/:id', pathname)?.params.id
    ?? (matchPath('/collections', pathname) ? new URLSearchParams(search).get('c') : null);
  return c && UUID.test(c) ? c : null;
}

/** Google's "G", shared by both cards. */
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
 * The gate for someone who followed a collection's share link while signed
 * out. It's the only thing they see — no dismiss, no generic "sign in" — so
 * the copy must hold up even when the lookup is slow or fails (private,
 * deleted, offline): the details fill in if they arrive, and the invite and
 * its button are there either way.
 */
function InviteCard({ id, onSignIn }: { id: string; onSignIn: () => void }) {
  const intl = useIntl();
  const [invite, setInvite] = useState<CollectionInvite | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInvite(id).then((res) => { if (!cancelled) setInvite(res); });
    return () => { cancelled = true; };
  }, [id]);

  const owner = invite?.ownerName ?? intl.formatMessage({ id: 'auth.someone' });

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card shadow-2xl p-8 text-center">
      <div className="text-4xl mb-5 font-display font-bold">
        voca<span className="text-accent-cyan">.</span>
      </div>

      {invite?.ownerAvatarUrl ? (
        <img
          src={invite.ownerAvatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-14 h-14 rounded-full mx-auto mb-3 border-2 border-accent-purple/40"
        />
      ) : (
        <div className="w-14 h-14 rounded-full mx-auto mb-3 bg-accent-purple/15 text-accent-purple flex items-center justify-center text-xl font-display font-bold">
          {owner.charAt(0).toUpperCase()}
        </div>
      )}

      <h2 className="text-xl font-display font-bold text-text-primary mb-2">
        <FormattedMessage
          id="auth.invitedYou"
          values={{ owner, name: (chunks) => <span className="text-accent-purple">{chunks}</span> }}
        />
      </h2>
      {invite ? (
        <div className="mb-7 rounded-xl border border-border bg-bg-tertiary/40 p-4 text-left">
          <div className="font-display font-bold text-text-primary">{invite.name}</div>
          <div className="text-xs text-text-muted mt-0.5">
            <FormattedMessage id="common.wordCount" values={{ count: invite.wordCount }} />
            {invite.memberCount > 0 && <> · <FormattedMessage id="auth.learnerCount" values={{ count: invite.memberCount }} /></>}
          </div>
          {invite.description && <p className="text-xs text-text-muted mt-2">{invite.description}</p>}
          {invite.sampleWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {invite.sampleWords.map((w) => (
                <span key={w} className="text-[11px] px-2 py-0.5 rounded-full bg-bg-card border border-border text-text-primary">
                  {w}
                </span>
              ))}
              {invite.wordCount > invite.sampleWords.length && (
                <span className="text-[11px] px-1 py-0.5 text-text-muted"><FormattedMessage id="common.more" values={{ count: invite.wordCount - invite.sampleWords.length }} /></span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-7" />
      )}

      <button
        onClick={onSignIn}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
      >
        <GoogleG />
        <FormattedMessage id="auth.takeIt" />
      </button>
    </div>
  );
}

/**
 * Sign-in gate. Overlays the app when there's no signed-in user on a route that
 * can't work without one — see PRIVATE_ROUTES, plus a user collection's share
 * link, which gets an invite card. Hidden while auth is still resolving
 * (including the OAuth redirect) and when there's no backend to sign into.
 *
 * Everywhere else the way in is the sidebar's "Sign in", not this.
 */
export function LoginGate() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { pathname, search } = useLocation();

  if (!supabase || loading || user) return null;
  const invite = inviteId(pathname, search);
  if (!invite && !PRIVATE_ROUTES.some((route) => matchPath(route, pathname))) return null;

  if (invite) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
        <InviteCard id={invite} onSignIn={signInWithGoogle} />
      </div>
    );
  }

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
