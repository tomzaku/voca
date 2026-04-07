import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initial = name[0]?.toUpperCase() ?? '?';

  if (!user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
        <p className="text-text-muted text-sm">You're not signed in.</p>
        <Link
          to="/login"
          className="px-4 py-2 rounded-lg bg-accent-cyan/10 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/20 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10 flex flex-col gap-6">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-6">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-accent-purple/15 border-2 border-accent-purple/20 flex items-center justify-center text-2xl font-semibold text-accent-purple">
            {initial}
          </div>
        )}
        <div className="text-center">
          <p className="font-medium text-text-primary">{name}</p>
          {email && <p className="text-sm text-text-muted">{email}</p>}
        </div>
      </div>

      {/* Menu */}
      <div className="rounded-xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
        <Link
          to="/settings"
          className="flex items-center justify-between px-4 py-3.5 text-sm text-text-primary hover:bg-bg-hover transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted text-base">⚙</span>
            <span>Settings</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 rounded-xl border border-border bg-bg-card text-sm text-accent-red hover:bg-accent-red/5 hover:border-accent-red/30 transition-colors font-medium"
      >
        Sign out
      </button>
    </div>
  );
}
