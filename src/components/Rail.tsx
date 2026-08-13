import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useTheme } from '../hooks/useTheme';
import { useGameMode } from '../hooks/useGameMode';

const NAV_ITEMS = [
  { to: '/', label: 'Learn', icon: 'lucide:sparkles' },
  { to: '/speaking', label: 'Speak', icon: 'lucide:mic' },
  // Sits next to History: both look backwards at what you've studied.
  { to: '/dashboard', label: 'Dashboard', icon: 'lucide:calendar-days' },
  { to: '/history', label: 'History', icon: 'lucide:history' },
  { to: '/companion', label: 'Buddy', icon: 'lucide:paw-print' },
  { to: '/collections', label: 'Collections', icon: 'lucide:library' },
  { to: '/settings', label: 'Settings', icon: 'lucide:settings' },
];

// The World game tab appears only when it's turned on in Settings.
const WORLD_ITEM = { to: '/world', label: 'World', icon: 'lucide:gamepad-2' };

/** The app's only nav surface, on every screen size — collapsed to icons by
 *  default, expands as an overlay on click so page content never reflows.
 *  Account actions (profile, sign out) live on the Navbar pill and the
 *  Profile/Settings pages instead of duplicating them here. */
export function Rail() {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const gameEnabled = useGameMode((s) => s.enabled);

  const navItems = gameEnabled
    ? NAV_ITEMS.flatMap((item) => (item.to === '/collections' ? [item, WORLD_ITEM] : [item]))
    : NAV_ITEMS;

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  return (
    <>
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-[1px]"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-bg-secondary border-r-[3px] border-border overflow-hidden transition-[width] duration-200 ${
          expanded ? 'w-60' : 'w-16'
        }`}
      >
        {/* Border lives on this wrapper, not the h-16 row itself, so it adds
            to the height instead of eating into it — matching how Navbar's
            outer <header> (border) and inner h-16 row (content) are split,
            so the two borders land on the same line. */}
        <div className="shrink-0 border-b-[3px] border-border">
          <Link
            to="/"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-2.5 h-16 px-3.5 hover-wiggle"
          >
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="voca" className="w-9 h-9 rounded-xl shrink-0" />
            {expanded && (
              <span className="font-title text-xl text-accent-cyan tracking-tight leading-none truncate">
                voca
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  active
                    ? 'bg-accent-cyan/15 text-accent-cyan'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <Icon icon={item.icon} className="text-lg shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-2.5 border-t-2 border-border space-y-1 shrink-0">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
          >
            <Icon icon={theme === 'dark' ? 'lucide:sun' : 'lucide:moon'} className="text-lg shrink-0" />
            {expanded && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? 'Collapse menu' : 'Expand menu'}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
          >
            <Icon icon={expanded ? 'lucide:panel-left-close' : 'lucide:panel-left-open'} className="text-lg shrink-0" />
            {expanded && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
