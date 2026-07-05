import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useWordSearch } from '../hooks/useWordSearch';
import { Sidebar } from './Sidebar';

// The History tab cycles through what lives on that page.
const HISTORY_LABELS = ['History', 'Review', 'Games'];

/** Cycles through `words`, swapping one per second with a fade/slide-up. */
function CyclingLabel({ words, className }: { words: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % words.length), 1000);
    return () => clearInterval(id);
  }, [words.length]);
  return (
    <span className={`inline-flex justify-center ${className ?? ''}`}>
      {/* keyed so each word re-mounts and re-runs the entrance animation */}
      <span key={i} className="inline-block animate-fade-in">{words[i]}</span>
    </span>
  );
}

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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const word = query.trim().toLowerCase().replace(/\s+/g, ' ').split(' ')[0];
    if (!word) return;
    setQuery('');
    setSearchOpen(false);
    navigate('/');          // ensure the flashcard page is mounted
    requestSearch(word);    // FlashCard picks this up and loads the word
  };

  // Mobile keeps just the primary tabs; desktop shows Collections + Buddy too.
  // Everything else lives in the sidebar.
  const navLinks: { to: string; label: string; icon: string; desktopOnly?: boolean }[] = [
    { to: '/', label: 'Learn', icon: 'lucide:sparkles' },
    { to: '/bookmarks', label: 'History', icon: 'lucide:history' },
    { to: '/collections', label: 'Collections', icon: 'lucide:library', desktopOnly: true },
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
                <span className="hidden sm:inline">
                  {link.to === '/bookmarks'
                    ? <CyclingLabel words={HISTORY_LABELS} className="min-w-[3.75rem]" />
                    : link.label}
                </span>
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
            title="Search a word"
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
