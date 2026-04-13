import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Learn', icon: '✦' },
    { to: '/speaking', label: 'Speak', icon: '🎙' },
    { to: '/bookmarks', label: 'Saved', icon: '★' },
  ];

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || '';
  const initial = name[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="font-display text-lg font-bold text-text-primary tracking-tight">
          voca
          <span className="text-accent-cyan">.</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-accent-cyan/10 text-accent-cyan font-medium'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <span className="hidden sm:inline">{link.label}</span>
                <span className="sm:hidden">{link.icon}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {user ? (
            <Link
              to="/profile"
              title="Profile"
              className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ring-2 transition-all ${
                location.pathname === '/profile'
                  ? 'ring-accent-cyan'
                  : 'ring-border hover:ring-accent-cyan/50'
              }`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full bg-accent-purple/15 flex items-center justify-center text-xs font-semibold text-accent-purple">
                  {initial}
                </span>
              )}
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-xs px-3 py-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 transition-colors font-medium"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
