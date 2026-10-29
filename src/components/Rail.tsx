import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useTheme, type Theme } from '../hooks/useTheme';
import { useGameMode } from '../hooks/useGameMode';
import { useRailState, type RailMode } from '../hooks/useRailState';

// Matches THEMES' cycle order in useTheme.ts — kept alongside it since
// toggleTheme's own cycling logic lives there and this only needs to preview
// where one more click lands.
const THEME_CYCLE: Theme[] = ['light', 'dark'];
const THEME_LABEL_ID: Record<Theme, string> = { light: 'app.themeLight', dark: 'app.themeDark' };
const THEME_ICON: Record<Theme, string> = { light: 'lucide:sun', dark: 'lucide:moon' };
function nextTheme(t: Theme): Theme {
  return THEME_CYCLE[(THEME_CYCLE.indexOf(t) + 1) % THEME_CYCLE.length];
}

// `tab` targets a `?tab=` sub-page rather than a distinct route (Speak only —
// Writing's sub-pages are real paths, `/writing/improve` etc.) — the page
// itself canonicalizes the param, so this exact pair is always what's in the
// URL once it has mounted (see useSpeakingTab), which is what makes the
// `active` check below exact too.
// `labelId` is a message id, formatted at render time.
type NavItem = { to: string; labelId: string; icon: string; tab?: string };

interface NavGroup {
  id: string;
  labelId: string;
  icon: string;
  items: NavItem[];
}

// Every collapsible group in the drawer, in display order. Each is a peer of
// Speak/Writing/World, not a category above them — see RailGroupToggle.
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'vocabulary',
    labelId: 'app.navVocabulary',
    icon: 'lucide:book-open',
    items: [
      { to: '/', labelId: 'app.navFlashcards', icon: 'lucide:sparkles' },
      { to: '/review', labelId: 'app.navReview', icon: 'lucide:swords' },
      { to: '/history', labelId: 'app.navHistory', icon: 'lucide:history' },
      { to: '/collections', labelId: 'app.navCollections', icon: 'lucide:library' },
    ],
  },
  {
    id: 'speak',
    labelId: 'app.navSpeak',
    icon: 'lucide:mic',
    items: [
      { to: '/speaking', tab: 'conversation', labelId: 'app.navConversation', icon: 'lucide:message-square' },
      { to: '/speaking', tab: 'dialogue', labelId: 'app.navDialogue', icon: 'lucide:message-circle' },
      { to: '/speaking', tab: 'ielts', labelId: 'app.navIeltsSpeaking', icon: 'lucide:users' },
      { to: '/speaking', tab: 'read', labelId: 'app.navReadAloud', icon: 'lucide:align-left' },
      { to: '/ipa', labelId: 'app.navIpaSounds', icon: 'lucide:audio-lines' },
    ],
  },
  {
    id: 'listen',
    labelId: 'app.navListen',
    icon: 'lucide:headphones',
    items: [
      { to: '/listening', tab: 'podcast', labelId: 'app.navPodcast', icon: 'lucide:radio' },
      { to: '/listening', tab: 'comprehension', labelId: 'app.navComprehension', icon: 'lucide:ear' },
      { to: '/listening', tab: 'dictation', labelId: 'app.navDictation', icon: 'lucide:text-cursor-input' },
      { to: '/listening', tab: 'ielts', labelId: 'app.navIeltsListening', icon: 'lucide:users' },
    ],
  },
  {
    id: 'writing',
    labelId: 'app.navWriting',
    icon: 'lucide:pen-line',
    items: [
      { to: '/writing/improve', labelId: 'app.navImproveWriting', icon: 'lucide:wand-2' },
      { to: '/writing/ielts', labelId: 'app.navIeltsWriting', icon: 'lucide:users' },
    ],
  },
];

// Desktop rail behaviours, in the order the picker shows them.
const RAIL_MODES: { id: RailMode; labelId: string; icon: string }[] = [
  { id: 'expanded', labelId: 'app.railExpanded', icon: 'lucide:panel-left' },
  { id: 'auto', labelId: 'app.railAuto', icon: 'lucide:mouse-pointer-2' },
  { id: 'collapsed', labelId: 'app.railCollapsed', icon: 'lucide:panel-left-close' },
];

// The World game tab appears only when it's turned on in Settings.
const WORLD_ITEM: NavItem = { to: '/world', labelId: 'app.navWorld', icon: 'lucide:gamepad-2' };

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
// to miss). A click only folds or unfolds the group — it never navigates.
// It used to jump to the group's first page when you weren't already there,
// so opening a group to reach one of its other pages took you somewhere
// first; the pages are the items underneath.
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
 *  pushes page content over — there's room for it — and can instead be kept
 *  as the icon strip, or as the strip that opens over the page while hovered
 *  (see useRailState's modes). Mobile defaults collapsed to icons and expands
 *  as a dimmed overlay instead, since there isn't.
 *  Account actions (profile, sign out) live on the Navbar pill and the
 *  Profile/Settings pages instead of duplicating them here. */
export function Rail() {
  const intl = useIntl();
  const expanded = useRailState((s) => s.expanded);
  const setExpanded = useRailState((s) => s.setExpanded);
  const toggle = useRailState((s) => s.toggle);
  const mode = useRailState((s) => s.mode);
  const setMode = useRailState((s) => s.setMode);

  // Auto mode: open over the page while the pointer (or keyboard focus) is on
  // the rail. A short delay before opening so sweeping the mouse past the
  // left edge on the way somewhere else doesn't flash it open, and a shorter
  // one before closing so a brief slip off the edge doesn't snap it shut.
  const [hoverOpen, setHoverOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoMode = mode === 'auto' && !expanded;
  const scheduleHover = (open: boolean) => {
    if (!autoMode || !window.matchMedia(DESKTOP_QUERY).matches) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverOpen(open), open ? 150 : 250);
  };
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);
  // Leaving auto (or opening for real) drops any hover-open left behind.
  useEffect(() => { if (!autoMode) setHoverOpen(false); }, [autoMode]);
  // Whether labels show — open for real, or hover-opened over the page.
  const wide = expanded || (autoMode && hoverOpen);
  const location = useLocation();
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

  // Escape dismisses whatever is covering the page — the mobile drawer or a
  // hover-opened rail — but never folds away a desktop rail the learner chose
  // to keep open (it used to, whenever Escape closed anything else).
  useEffect(() => {
    if (!expanded && !hoverOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setHoverOpen(false);
      if (!window.matchMedia(DESKTOP_QUERY).matches) setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, hoverOpen, setExpanded]);

  const collapseOnMobile = () => {
    if (!window.matchMedia(DESKTOP_QUERY).matches) setExpanded(false);
  };

  const renderItem = (item: NavItem, opts?: { indent?: boolean }) => {
    const href = item.tab ? `${item.to}?tab=${item.tab}` : item.to;
    const active = isItemActive(item);
    // Only nests visually when there's a label to nest under — collapsed
    // rail lines every icon up flush, indent or not.
    const indent = !!opts?.indent && wide;
    const label = intl.formatMessage({ id: item.labelId });
    return (
      <Link
        key={href}
        to={href}
        aria-label={label}
        // The nav scrolls, so a custom tooltip beside the strip would be
        // clipped by it — the browser's own tooltip isn't.
        title={wide ? undefined : label}
        onClick={collapseOnMobile}
        className={itemClasses(active, indent)}
      >
        <Icon icon={item.icon} className="text-lg shrink-0" />
        {wide && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const flatItems = gameEnabled ? [WORLD_ITEM] : [];
  const themeLabel = intl.formatMessage({ id: THEME_LABEL_ID[theme] });
  const nextThemeLabel = intl.formatMessage({ id: THEME_LABEL_ID[nextTheme(theme)] });

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
        onMouseEnter={() => scheduleHover(true)}
        onMouseLeave={() => scheduleHover(false)}
        onFocus={() => scheduleHover(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) scheduleHover(false); }}
        className={`fixed inset-y-0 left-0 z-30 flex-col bg-bg-secondary transition-[width,box-shadow] duration-200 ${
          // Collapsed mobile shows nothing — full width for content — while
          // collapsed desktop keeps the icon-only strip. Expanded shows on both.
          wide ? 'flex w-60' : 'hidden sm:flex sm:w-16'
        }${
          // Hover-opened, it lies over the page rather than beside it — a
          // shadow says so.
          wide && !expanded ? ' shadow-2xl' : ''
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
            {wide && (
              <span className="font-title font-black text-xl text-accent-cyan tracking-tight leading-none truncate">
                voca
              </span>
            )}
          </Link>
        </div>

        {/* border-r starts here, below the header line, instead of running
            the aside's full height. */}
        <div className="flex-1 flex flex-col border-r-[3px] border-border/50">
          {/* overflow-x-hidden: scrolling one axis makes the other scroll too,
              so the collapsed strip's labels used to spill into a sideways
              scrollbar. */}
          <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col p-2.5 gap-1">
            {NAV_GROUPS.map((group) => {
              // Collapsed rail has no room for the toggle, so it always shows every icon.
              const showItems = !wide || openGroups[group.id];
              return (
                <div key={group.id}>
                  <RailGroupToggle
                    icon={group.icon}
                    label={intl.formatMessage({ id: group.labelId })}
                    expanded={wide}
                    open={openGroups[group.id]}
                    active={group.items.some(isItemActive)}
                    // No collapseOnMobile here: folding a group isn't leaving
                    // the menu, so the mobile drawer stays open to pick a page.
                    onClick={() => toggleGroup(group.id)}
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
              aria-label={intl.formatMessage({ id: 'app.themeAria' }, { current: themeLabel, next: nextThemeLabel })}
              title={intl.formatMessage({ id: 'app.themeSwitchTo' }, { next: nextThemeLabel })}
              className="group relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
            >
              <Icon icon={THEME_ICON[theme]} className="text-lg shrink-0" />
              {wide && <span>{themeLabel}</span>}
              <RailTooltip label={themeLabel} show={!wide} />
            </button>
            {/* Desktop, open: pick how the rail behaves. Collapsed, the strip
                has no room for three choices, so it offers the way back open. */}
            {wide ? (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5">
                <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-text-muted truncate">
                  <FormattedMessage id="app.railMode" />
                </span>
                <div role="radiogroup" aria-label={intl.formatMessage({ id: 'app.railMode' })} className="flex items-center gap-0.5 p-0.5 rounded-lg bg-bg-tertiary">
                  {RAIL_MODES.map((m) => (
                    <button
                      key={m.id}
                      role="radio"
                      aria-checked={mode === m.id}
                      onClick={() => setMode(m.id)}
                      title={intl.formatMessage({ id: m.labelId })}
                      aria-label={intl.formatMessage({ id: m.labelId })}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                        mode === m.id ? 'bg-bg-card text-accent-cyan shadow-sm' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Icon icon={m.icon} className="text-base" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setMode('expanded')}
                aria-label={intl.formatMessage({ id: 'app.expandMenu' })}
                className="group relative hidden sm:flex w-full items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
              >
                <Icon icon="lucide:panel-left-open" className="text-lg shrink-0" />
                <RailTooltip label={intl.formatMessage({ id: 'app.expand' })} show />
              </button>
            )}
            {/* Mobile: the drawer is an overlay, so it only needs closing. */}
            <button
              onClick={toggle}
              aria-label={intl.formatMessage({ id: 'app.collapseMenu' })}
              className="sm:hidden w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
            >
              <Icon icon="lucide:panel-left-close" className="text-lg shrink-0" />
              <span><FormattedMessage id="app.collapse" /></span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
