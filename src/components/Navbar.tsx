import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useWordSearch } from '../hooks/useWordSearch';
import { useStreak, localDateString } from '../hooks/useStreak';
import { useHotkey } from '../hooks/useHotkey';
import { useAuth } from '../hooks/useAuth';
import { useRailState } from '../hooks/useRailState';
import { isApple } from '../lib/device';
import { getLearnLanguage, getMotherLanguage } from '../lib/languages';

// Desktop's Rail is always on screen, so this bar is just search + account
// there, offset to clear its fixed-left column. Mobile hides Rail entirely
// for full-width content, so this bar also carries the trigger that opens it.
export function Navbar() {
  const navigate = useNavigate();
  const requestSearch = useWordSearch((s) => s.requestSearch);
  const streak = useStreak((s) => s.count);
  const { user } = useAuth();
  const setRailExpanded = useRailState((s) => s.setExpanded);
  // Subscribe to lastActiveDay rather than calling countedToday(), so the badge
  // re-renders the moment today's first answer lands.
  const countedToday = useStreak((s) => s.lastActiveDay) === localDateString();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus the field when it expands.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // ⌘K / Ctrl+K from anywhere, and "/" when not already typing. Both land the
  // cursor in the box even if it's already open — the focus effect above only
  // runs on the transition, so pressing it twice would otherwise do nothing.
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

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || '';
  const initial = name[0]?.toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-10 bg-bg-secondary/85 backdrop-blur border-b-[3px] border-border pt-[env(safe-area-inset-top)]">
      <div className="max-w-page mx-auto pl-3 pr-3 sm:pl-[4.5rem] sm:pr-4 h-16 flex items-center gap-2">
        {/* Mobile-only drawer trigger — desktop's Rail is always visible so it
            doesn't need one. Either icon opens the same overlay. */}
        <div className="flex items-center gap-1.5 sm:hidden">
          <button
            onClick={() => setRailExpanded(true)}
            className="btn-3d w-9 h-9 rounded-full bg-bg-card text-text-secondary flex items-center justify-center"
            title="Open menu"
          >
            <Icon icon="lucide:menu" className="text-lg" />
          </button>
          <button onClick={() => setRailExpanded(true)} className="w-9 h-9 shrink-0" title="Open menu">
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="voca" className="w-full h-full rounded-xl" />
          </button>
        </div>

        <div className="flex-1" />

        {searchOpen ? (
          <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-base pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              onBlur={() => !query.trim() && setSearchOpen(false)}
              placeholder={`Search ${getLearnLanguage()} or ${getMotherLanguage()}…`}
              className="w-full bg-bg-card border-2 border-accent-cyan rounded-full pl-9 pr-9 py-1.5 text-sm text-text-primary font-semibold focus:outline-none placeholder:text-text-muted transition-colors"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary"
              title="Close search"
            >
              <Icon icon="lucide:x" className="text-base" />
            </button>
          </form>
        ) : (
          <button
            onClick={openSearch}
            className="btn-3d w-9 h-9 rounded-full bg-bg-card text-text-secondary flex items-center justify-center"
            title={`Search a word (${isApple() ? '⌘K' : 'Ctrl+K'})`}
          >
            <Icon icon="lucide:search" className="text-lg" />
          </button>
        )}

        {/* Account + streak, merged into one control so login state is always
            visible — not tucked behind a menu — and the streak lives right
            next to who it belongs to. */}
        <Link
          to={user ? '/profile' : '/login'}
          aria-label={user ? `View profile — signed in as ${name || 'account'}` : 'Sign in'}
          title={user ? name : 'Sign in'}
          className={`flex items-center gap-1.5 pl-1 pr-2.5 h-9 rounded-full border-2 transition-colors shrink-0 ${
            user
              ? countedToday
                ? 'bg-accent-orange/15 border-accent-orange/30'
                // Dimmed until today counts: the gap between "safe" and "about
                // to lose it" is the whole point of showing this.
                : 'bg-bg-card border-border'
              : 'bg-accent-green/15 border-accent-green/30'
          }`}
        >
          {user ? (
            <span className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full bg-accent-purple/20 flex items-center justify-center text-xs font-extrabold text-accent-purple">
                  {initial}
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm font-extrabold text-accent-green">Sign in</span>
          )}
          {streak > 0 && (
            <span
              className={`flex items-center gap-0.5 text-sm font-bold tabular-nums ${
                countedToday ? 'text-accent-orange' : 'text-text-muted'
              }`}
            >
              <Icon icon={countedToday ? 'lucide:flame' : 'lucide:flame-kindling'} className="text-base" />
              {streak}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
