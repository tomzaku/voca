import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useWordSearch } from '../hooks/useWordSearch';
import { useHotkey } from '../hooks/useHotkey';
import { isApple } from '../lib/device';
import { Sidebar } from './Sidebar';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestSearch = useWordSearch((s) => s.requestSearch);

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus the field when the search bar opens.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // ⌘K / Ctrl+K from anywhere, and "/" when not already typing. Both land the
  // cursor in the box even if the bar is already open — the focus effect above
  // only runs on the transition, so pressing it twice would otherwise do nothing.
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);
  useHotkey('mod+k', openSearch);
  useHotkey('/', openSearch);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Keep the whole phrase — phrasal verbs and idioms ("go on", "give up")
    // are valid lookups; just collapse stray whitespace.
    const word = query.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!word) return;
    setQuery('');
    setSearchOpen(false);
    navigate('/');          // ensure the flashcard page is mounted
    requestSearch(word);    // FlashCard picks this up and loads the word
  };

  // Mobile keeps the primary tabs (as icons); desktop shows Buddy too.
  // Everything else lives in the sidebar.
  const navLinks: { to: string; label: string; icon: string; desktopOnly?: boolean }[] = [
    { to: '/', label: 'Learn', icon: 'lucide:sparkles' },
    { to: '/history', label: 'History', icon: 'lucide:history' },
    { to: '/collections', label: 'Collections', icon: 'lucide:library' },
    { to: '/companion', label: 'Buddy', icon: 'lucide:paw-print', desktopOnly: true },
  ];

  return (
    <header className="sticky top-0 z-10 bg-bg-secondary/85 backdrop-blur border-b-[3px] border-border pt-[env(safe-area-inset-top)]">
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
                  link.desktopOnly ? 'hidden sm:inline-block' : ''
                } ${
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
            onClick={() => setSearchOpen((o) => !o)}
            className={`btn-3d w-9 h-9 rounded-full flex items-center justify-center ${
              searchOpen ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-card text-text-secondary'
            }`}
            title={`Search a word (${isApple() ? '⌘K' : 'Ctrl+K'})`}
          >
            <Icon icon={searchOpen ? 'lucide:x' : 'lucide:search'} className="text-lg" />
          </button>

          <button
            onClick={() => setMenuOpen(true)}
            className="btn-3d w-9 h-9 rounded-full bg-bg-card text-text-secondary flex items-center justify-center"
            title="Menu"
          >
            <Icon icon="lucide:menu" className="text-lg" />
          </button>
        </div>
      </div>

      {/* Collapsible search bar */}
      {searchOpen && (
        <div className="border-t-2 border-border bg-bg-secondary/95 backdrop-blur animate-fade-in">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto px-4 py-3 relative">
            <Icon
              icon="lucide:search"
              className="absolute left-7 top-1/2 -translate-y-1/2 text-text-muted text-lg pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              placeholder="Search any word…"
              className="w-full bg-bg-card border-[3px] border-border rounded-2xl pl-11 pr-20 py-2.5 text-text-primary font-semibold focus:outline-none focus:border-accent-cyan placeholder:text-text-muted transition-colors"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query.trim() && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <button
                  type="submit"
                  className="btn-3d px-4 py-1 bg-accent-cyan text-bg-primary text-sm"
                >
                  Go!
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
