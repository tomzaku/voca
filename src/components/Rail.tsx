import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useTheme, type Theme } from '../hooks/useTheme';
import { useGameMode } from '../hooks/useGameMode';
import { useRailState } from '../hooks/useRailState';

// Matches THEMES' cycle order in useTheme.ts — kept alongside it since
// toggleTheme's own cycling logic lives there and this only needs to preview
// where one more click lands.
const THEME_CYCLE: Theme[] = ['light', 'dark', 'colorful'];
const THEME_LABEL: Record<Theme, string> = { light: 'Light mode', dark: 'Dark mode', colorful: 'Colorful mode' };
const THEME_ICON: Record<Theme, string> = { light: 'lucide:sun', dark: 'lucide:moon', colorful: 'lucide:sparkles' };
function nextTheme(t: Theme): Theme {
  return THEME_CYCLE[(THEME_CYCLE.indexOf(t) + 1) % THEME_CYCLE.length];
}

type NavItem = { to: string; label: string; icon: string };

// The ways you actually study: reading/quizzing, speaking practice, writing.
const LEARN_ITEMS: NavItem[] = [
  { to: '/', label: 'Learn', icon: 'lucide:sparkles' },
  { to: '/speaking', label: 'Speak', icon: 'lucide:mic' },
  { to: '/writing', label: 'Writing', icon: 'lucide:pen-line' },
];

// Your word library and a look back at what you've studied.
const LIBRARY_ITEMS: NavItem[] = [
  { to: '/collections', label: 'Collections', icon: 'lucide:library' },
  { to: '/history', label: 'History', icon: 'lucide:history' },
];

// The World game tab appears only when it's turned on in Settings.
const WORLD_ITEM: NavItem = { to: '/world', label: 'World', icon: 'lucide:gamepad-2' };

// Matches useRailState's own breakpoint — desktop keeps the rail open after a
// nav click (it's pushing content, not overlaying it); mobile dismisses it.
const DESKTOP_QUERY = '(min-width: 640px)';

const itemClasses = (active: boolean) =>
  `group relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
    active
      ? 'bg-accent-cyan/15 text-accent-cyan before:absolute before:-left-1 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:rounded-full before:bg-accent-cyan'
      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
  }`;

// Only needed once the label itself is hidden (collapsed rail) — otherwise
// the visible label already says what the icon means.
function RailTooltip({ label, show }: { label: string; show: boolean }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-bg-primary px-2.5 py-1.5 text-xs font-bold text-text-primary opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-40">
      {label}
    </span>
  );
}

// A text heading when there's room for one; collapsed to icons, there's only
// room for the plain divider it replaces.
function RailGroupLabel({ label, expanded }: { label: string; expanded: boolean }) {
  if (!expanded) return <div className="my-1.5 border-t border-border/60" />;
  return (
    <div className="px-2.5 pt-3 pb-1 text-[10px] font-bold text-text-muted/60 uppercase tracking-wider">
      {label}
    </div>
  );
}

/** The app's only nav surface, on every screen size. Desktop defaults open and
 *  pushes page content over — there's room for it. Mobile defaults collapsed
 *  to icons and expands as a dimmed overlay instead, since there isn't.
 *  Account actions (profile, sign out) live on the Navbar pill and the
 *  Profile/Settings pages instead of duplicating them here. */
export function Rail() {
  const expanded = useRailState((s) => s.expanded);
  const setExpanded = useRailState((s) => s.setExpanded);
  const toggle = useRailState((s) => s.toggle);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const gameEnabled = useGameMode((s) => s.enabled);

  const libraryItems = gameEnabled
    ? LIBRARY_ITEMS.flatMap((item) => (item.to === '/collections' ? [item, WORLD_ITEM] : [item]))
    : LIBRARY_ITEMS;

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, setExpanded]);

  const collapseOnMobile = () => {
    if (!window.matchMedia(DESKTOP_QUERY).matches) setExpanded(false);
  };

  const renderItem = (item: NavItem) => {
    const active = location.pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-label={item.label}
        onClick={collapseOnMobile}
        className={itemClasses(active)}
      >
        <Icon icon={item.icon} className="text-lg shrink-0" />
        {expanded && <span className="truncate">{item.label}</span>}
        <RailTooltip label={item.label} show={!expanded} />
      </Link>
    );
  };

  return (
    <>
      {/* Dimming is a mobile-only concession for the overlay — desktop's
          expanded rail pushes content instead, so nothing needs covering. */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="sm:hidden fixed inset-0 z-20 bg-black/30 backdrop-blur-[1px]"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex-col bg-bg-secondary transition-[width] duration-200 ${
          // Collapsed mobile shows nothing — full width for content — while
          // collapsed desktop keeps the icon-only strip. Expanded shows on both.
          expanded ? 'flex w-60' : 'hidden sm:flex sm:w-16'
        }`}
      >
        {/* Border lives on this wrapper, not the h-16 row itself, so it adds
            to the height instead of eating into it — matching how Navbar's
            outer <header> (border) and inner h-16 row (content) are split,
            so the two borders land on the same line. No border-r here: the
            logo sits beside the header's own (mostly empty) left edge, and a
            vertical line there would look disconnected from it. */}
        <div className="shrink-0 border-b-[3px] border-border/50">
          <Link
            to="/"
            onClick={collapseOnMobile}
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

        {/* border-r starts here, below the header line, instead of running
            the aside's full height. */}
        <div className="flex-1 flex flex-col border-r-[3px] border-border/50">
          <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col p-2.5 gap-1">
            <RailGroupLabel label="Learn" expanded={expanded} />
            {LEARN_ITEMS.map(renderItem)}
            <RailGroupLabel label="Library" expanded={expanded} />
            {libraryItems.map(renderItem)}
          </nav>

          <div className="p-2.5 border-t-2 border-border/50 space-y-1 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label={`Theme: ${THEME_LABEL[theme]} — tap to switch to ${THEME_LABEL[nextTheme(theme)]}`}
              title={`Switch to ${THEME_LABEL[nextTheme(theme)]}`}
              className="group relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
            >
              <Icon icon={THEME_ICON[theme]} className="text-lg shrink-0" />
              {expanded && <span>{THEME_LABEL[theme]}</span>}
              <RailTooltip label={THEME_LABEL[theme]} show={!expanded} />
            </button>
            <button
              onClick={toggle}
              aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
              className="group relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
            >
              <Icon icon={expanded ? 'lucide:panel-left-close' : 'lucide:panel-left-open'} className="text-lg shrink-0" />
              {expanded && <span>Collapse</span>}
              <RailTooltip label="Expand" show={!expanded} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
