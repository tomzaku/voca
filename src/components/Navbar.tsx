import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStreak, localDateString } from '../hooks/useStreak';
import { useHotkey } from '../hooks/useHotkey';
import { useAuth } from '../hooks/useAuth';
import { useRailState } from '../hooks/useRailState';
import { isApple } from '../lib/device';
import { SearchModal } from './SearchModal';

// Desktop's Rail is always on screen, so this bar is just search + account
// there, offset to clear its fixed-left column. Mobile hides Rail entirely
// for full-width content, so this bar also carries the trigger that opens it.
export function Navbar() {
  const streak = useStreak((s) => s.count);
  const { user } = useAuth();
  const setRailExpanded = useRailState((s) => s.setExpanded);
  // <main> in App.tsx shifts right by the Rail's actual width (pl-16 or
  // pl-60) as it toggles; this header sits outside <main> so it has to
  // mirror that by hand or its content drifts out of alignment with the
  // page body below it once the max-w-page cap centers each independently.
  const railExpanded = useRailState((s) => s.expanded);
  // Subscribe to lastActiveDay rather than calling countedToday(), so the badge
  // re-renders the moment today's first answer lands.
  const countedToday = useStreak((s) => s.lastActiveDay) === localDateString();

  const [searchOpen, setSearchOpen] = useState(false);
  // ⌘K / Ctrl+K from anywhere, and "/" when not already typing.
  useHotkey('mod+k', () => setSearchOpen(true));
  useHotkey('/', () => setSearchOpen(true));

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || '';
  const initial = name[0]?.toUpperCase() ?? '?';

  return (
    <>
      <header className="sticky top-0 z-10 bg-bg-secondary/85 backdrop-blur border-b-[3px] border-border/50 pt-[env(safe-area-inset-top)]">
        {/* Same two-layer offset <main> uses below: an outer gutter matching
            the Rail's current width, then the page's own max-w-page/px on top
            of that — so this row lines up with the body exactly rather than
            approximating it with one combined padding value. */}
        <div className={`transition-[padding] duration-200 ${railExpanded ? 'sm:pl-60' : 'sm:pl-16'}`}>
          <div className="max-w-page mx-auto px-3 sm:px-4 h-16 flex items-center gap-2">
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

            <button
              onClick={() => setSearchOpen(true)}
              className="btn-3d flex items-center gap-1.5 pl-3 pr-3.5 h-9 rounded-full bg-bg-card text-text-secondary hover:text-text-primary shrink-0"
              title={`Search a word (${isApple() ? '⌘K' : 'Ctrl+K'})`}
            >
              <Icon icon="lucide:search" className="text-base" />
              <span className="text-sm font-bold">Search</span>
            </button>

            {/* Account + streak, merged into one control so login state is always
                visible — not tucked behind a menu — and the streak lives right
                next to who it belongs to. */}
            <Link
              to={user ? '/profile' : '/login'}
              aria-label={user ? `View profile — signed in as ${name || 'account'}` : 'Sign in'}
              title={user ? name : 'Sign in'}
              className={`btn-3d flex items-center gap-1.5 pl-1 pr-2.5 h-9 rounded-full transition-colors shrink-0 ${
                user
                  ? countedToday
                    ? 'bg-accent-orange/15'
                    // Dimmed until today counts: the gap between "safe" and "about
                    // to lose it" is the whole point of showing this.
                    : 'bg-bg-card'
                  : 'bg-accent-green/15'
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
        </div>
      </header>
      {/* Rendered as a sibling of <header>, not inside it — <header> has
          backdrop-blur, and a backdrop-filter/filter/transform ancestor
          becomes the containing block for `position: fixed` descendants.
          Nested inside, this modal's "fixed inset-0" would size itself to
          the header's own box instead of the viewport. */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}
