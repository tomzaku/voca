import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

const NAV_ITEMS = [
  { to: '/', label: 'Learn', icon: 'lucide:sparkles' },
  { to: '/speaking', label: 'Speak', icon: 'lucide:mic' },
  { to: '/history', label: 'History', icon: 'lucide:history' },
  { to: '/companion', label: 'Buddy', icon: 'lucide:paw-print' },
  { to: '/collections', label: 'Collections', icon: 'lucide:library' },
  { to: '/settings', label: 'Settings', icon: 'lucide:settings' },
];

/** Slide-in drawer holding the secondary navigation and account controls, so the
 *  top bar can stay down to Learn / History / Search. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || '';
  const initial = name[0]?.toUpperCase() ?? '?';

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-bg-secondary border-l-[3px] border-border shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header: account + close */}
        <div className="flex items-center justify-between gap-2 p-4 border-b-2 border-border">
          {user ? (
            <Link to="/profile" onClick={onClose} className="flex items-center gap-3 min-w-0 group">
              <span className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border-[3px] border-border shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full bg-accent-purple/20 flex items-center justify-center text-sm font-extrabold text-accent-purple">
                    {initial}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-text-primary truncate group-hover:text-accent-cyan transition-colors">{name || 'Profile'}</span>
                <span className="block text-xs text-text-muted">View profile</span>
              </span>
            </Link>
          ) : (
            <Link to="/login" onClick={onClose} className="btn-3d text-sm px-4 py-1.5 bg-accent-green text-bg-primary">
              Sign in
            </Link>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full bg-bg-card text-text-secondary flex items-center justify-center hover:text-text-primary"
            title="Close"
          >
            <Icon icon="lucide:x" className="text-lg" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  active
                    ? 'bg-accent-cyan/15 text-accent-cyan'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <Icon icon={item.icon} className="text-lg shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer: theme + sign out */}
        <div className="p-3 border-t-2 border-border space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
          >
            <Icon icon={theme === 'dark' ? 'lucide:sun' : 'lucide:moon'} className="text-lg shrink-0" />
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          {user && (
            <button
              onClick={() => { onClose(); signOut(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-text-muted hover:bg-accent-red/10 hover:text-accent-red transition-all"
            >
              <Icon icon="lucide:log-out" className="text-lg shrink-0" />
              Sign out
            </button>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
