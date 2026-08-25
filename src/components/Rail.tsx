import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

// `tab` targets a `?tab=` sub-page rather than a distinct route (Speak only —
// Writing's sub-pages are real paths, `/writing/improve` etc.) — the page
// itself canonicalizes the param, so this exact pair is always what's in the
// URL once it has mounted (see useSpeakingTab), which is what makes the
// `active` check below exact too.
type NavItem = { to: string; label: string; icon: string; tab?: string };

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

// Every collapsible group in the drawer, in display order. Each is a peer of
// Speak/Writing/World, not a category above them — see RailGroupToggle.
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'vocabulary',
    label: 'Vocabulary',
    icon: 'lucide:book-open',
    items: [
      { to: '/', label: 'Flashcards', icon: 'lucide:sparkles' },
      { to: '/review', label: 'Review', icon: 'lucide:swords' },
      { to: '/history', label: 'History', icon: 'lucide:history' },
      { to: '/collections', label: 'Collections', icon: 'lucide:library' },
    ],
  },
  {
    id: 'speak',
    label: 'Speak',
    icon: 'lucide:mic',
    items: [
      { to: '/speaking', tab: 'conversation', label: 'Conversation', icon: 'lucide:message-square' },
      { to: '/speaking', tab: 'dialogue', label: 'Dialogue', icon: 'lucide:message-circle' },
      { to: '/speaking', tab: 'ielts', label: 'IELTS Speaking', icon: 'lucide:users' },
      { to: '/speaking', tab: 'read', label: 'Read Aloud', icon: 'lucide:align-left' },
      { to: '/ipa', label: 'IPA Sounds', icon: 'lucide:audio-lines' },
    ],
  },
  {
    id: 'listen',
    label: 'Listen',
    icon: 'lucide:headphones',
    items: [
      { to: '/listening', tab: 'podcast', label: 'Podcast', icon: 'lucide:radio' },
      { to: '/listening', tab: 'comprehension', label: 'Comprehension', icon: 'lucide:ear' },
      { to: '/listening', tab: 'dictation', label: 'Dictation', icon: 'lucide:text-cursor-input' },
      { to: '/listening', tab: 'ielts', label: 'IELTS Listening', icon: 'lucide:users' },
    ],
  },
  {
    id: 'writing',
    label: 'Writing',
    icon: 'lucide:pen-line',
    items: [
      { to: '/writing/improve', label: 'Improve Writing', icon: 'lucide:wand-2' },
      { to: '/writing/ielts', label: 'IELTS Writing', icon: 'lucide:users' },
    ],
  },
];

// The World game tab appears only when it's turned on in Settings.
const WORLD_ITEM: NavItem = { to: '/world', label: 'World', icon: 'lucide:gamepad-2' };

// Matches useRailState's own breakpoint — desktop keeps the rail open after a
// nav click (it's pushing content, not overlaying it); mobile dismisses it.
const DESKTOP_QUERY = '(min-width: 640px)';

// `indent` nests a group's children under its toggle — only meaningful when
// the rail is expanded; collapsed, every icon lines up the same regardless.
const itemClasses = (active: boolean, indent = false) =>
  `group relative flex items-center gap-3 py-2.5 rounded-xl text-sm font-bold transition-all ${indent ? 'pl-8 pr-2.5' : 'px-2.5'} ${
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

// Styled as a peer of every other nav item — same icon-plus-text row, one
// click target for the whole thing (a real button, not a link split from a
// chevron — a slim separate hit target for the chevron turned out too easy
// to miss). What a click does depends on where you already are, decided by
// the caller: already on the group's first item, it just folds the group
// away; anywhere else, it navigates there and leaves the group open.
//
// `active` only paints the header itself while collapsed — once expanded,
// the current item's own highlight below already says so, and painting both
// would just be the same fact twice.
function RailGroupToggle({ icon, label, expanded, open, active, onClick }: {
  icon: string;
  label: string;
  expanded: boolean;
  open: boolean;
  active: boolean;
  onClick: () => void;
}) {
  if (!expanded) return null;
  const highlight = active && !open;
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className={`group relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
        highlight
          ? 'bg-accent-cyan/15 text-accent-cyan before:absolute before:-left-1 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:rounded-full before:bg-accent-cyan'
          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
      }`}
    >
      <Icon icon={icon} className="text-lg shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      <Icon icon="lucide:chevron-down" className={`text-sm shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
    </button>
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
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const gameEnabled = useGameMode((s) => s.enabled);
  const tabParam = new URLSearchParams(location.search).get('tab');

  // Items without a `tab` ignore search entirely (Flashcards keeps its own
  // `?w=`/`?word=` state there, unrelated to nav) — only a `tab` item needs
  // its query checked too.
  const isItemActive = (item: NavItem) =>
    location.pathname === item.to && (item.tab === undefined || item.tab === tabParam);

  // Each group starts open if the current route is already inside it (so
  // landing on /speaking or /writing shows its sub-pages right away);
  // Vocabulary always starts open since "/" is the app's own landing page.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      state[g.id] = g.id === 'vocabulary' || g.items.some((item) => item.to === location.pathname);
    }
    return state;
  });
  const toggleGroup = (id: string) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, setExpanded]);

  const collapseOnMobile = () => {
    if (!window.matchMedia(DESKTOP_QUERY).matches) setExpanded(false);
  };

  const renderItem = (item: NavItem, opts?: { indent?: boolean }) => {
    const href = item.tab ? `${item.to}?tab=${item.tab}` : item.to;
    const active = isItemActive(item);
    // Only nests visually when there's a label to nest under — collapsed
    // rail lines every icon up flush, indent or not.
    const indent = !!opts?.indent && expanded;
    return (
      <Link
        key={href}
        to={href}
        aria-label={item.label}
        onClick={collapseOnMobile}
        className={itemClasses(active, indent)}
      >
        <Icon icon={item.icon} className="text-lg shrink-0" />
        {expanded && <span className="truncate">{item.label}</span>}
        <RailTooltip label={item.label} show={!expanded} />
      </Link>
    );
  };

  const flatItems = gameEnabled ? [WORLD_ITEM] : [];

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
            {NAV_GROUPS.map((group) => {
              // Collapsed rail has no room for the toggle, so it always shows every icon.
              const showItems = !expanded || openGroups[group.id];
              const first = group.items[0];
              const href = first.tab ? `${first.to}?tab=${first.tab}` : first.to;
              const onFirst = isItemActive(first);
              const handleClick = () => {
                if (onFirst) {
                  // Already there — the click can only mean fold/unfold.
                  toggleGroup(group.id);
                } else {
                  navigate(href);
                  setOpenGroups((s) => ({ ...s, [group.id]: true }));
                }
                collapseOnMobile();
              };
              return (
                <div key={group.id}>
                  <RailGroupToggle
                    icon={group.icon}
                    label={group.label}
                    expanded={expanded}
                    open={openGroups[group.id]}
                    active={group.items.some(isItemActive)}
                    onClick={handleClick}
                  />
                  {showItems && group.items.map((item) => renderItem(item, { indent: true }))}
                </div>
              );
            })}
            {flatItems.map((item) => renderItem(item))}
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
