import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Learn', icon: 'lucide:sparkles' },
    { to: '/speaking', label: 'Speak', icon: 'lucide:mic' },
    { to: '/bookmarks', label: 'History', icon: 'lucide:history' },
  ];

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || '';
  const initial = name[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-10 bg-bg-secondary/85 backdrop-blur border-b-[3px] border-border">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-0.5 hover-wiggle">
          <span className="font-title text-2xl text-accent-cyan drop-shadow-[0_2px_0_var(--btn-lip)] tracking-tight leading-none">
            voca
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-accent-pink mt-2.5 animate-bob" />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1.5">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`btn-3d px-3.5 py-1.5 text-sm font-extrabold transition-all ${
                  active
                    ? 'bg-accent-cyan text-bg-primary'
                    : 'bg-bg-card text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="hidden sm:inline">{link.label}</span>
                <Icon icon={link.icon} className="sm:hidden text-lg" />
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="btn-3d w-9 h-9 rounded-full bg-accent-yellow text-bg-primary flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            <Icon icon={theme === 'dark' ? 'lucide:sun' : 'lucide:moon'} className="text-lg" />
          </button>

          {user ? (
            <Link
              to="/profile"
              title="Profile"
              className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border-[3px] transition-all hover:-translate-y-0.5 ${
                location.pathname === '/profile'
                  ? 'border-accent-cyan'
                  : 'border-border hover:border-accent-cyan/60'
              }`}
              style={{ boxShadow: '0 3px 0 0 var(--btn-lip)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full bg-accent-purple/20 flex items-center justify-center text-sm font-extrabold text-accent-purple">
                  {initial}
                </span>
              )}
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn-3d text-sm px-3.5 py-1.5 bg-accent-green text-bg-primary"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
