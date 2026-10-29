import { create } from 'zustand';

// Shared between Rail (which renders the toggle) and App (whose <main> needs
// to know the current width to pad around it) — desktop pushes content over
// when expanded, so the padding has to track the same state as the rail.
//
// `mode` is the desktop preference, remembered across visits:
//   auto      — the icon strip, opening over the page while hovered (default:
//               full-width pages, with the labels a hover away)
//   expanded  — open, pushing content over
//   collapsed — the icon strip
// `expanded` is whether the rail is open *and taking up room*: the expanded
// mode on desktop, the open drawer on mobile. Auto's hover-open is local to
// Rail, since it overlays the page rather than pushing it.
export type RailMode = 'expanded' | 'collapsed' | 'auto';

interface RailState {
  mode: RailMode;
  expanded: boolean;
  /** Choose the desktop mode (persisted). */
  setMode: (m: RailMode) => void;
  /** Open/close for now — the mobile drawer, Escape — without changing the
   *  remembered desktop mode. */
  setExpanded: (v: boolean) => void;
  toggle: () => void;
}

// Only the expanded mode starts open on desktop; mobile always starts closed
// and expands as an overlay instead of pushing content.
const DESKTOP_QUERY = '(min-width: 640px)';
const MODE_KEY = 'voca-rail-mode';

function loadMode(): RailMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'expanded' || v === 'collapsed' || v === 'auto') return v;
  } catch { /* private mode */ }
  return 'auto';
}

const initialMode = loadMode();

export const useRailState = create<RailState>((set) => ({
  mode: initialMode,
  expanded: typeof window !== 'undefined'
    && window.matchMedia(DESKTOP_QUERY).matches
    && initialMode === 'expanded',
  setMode: (m) => {
    try { localStorage.setItem(MODE_KEY, m); } catch { /* private mode */ }
    set({ mode: m, expanded: m === 'expanded' });
  },
  setExpanded: (v) => set({ expanded: v }),
  toggle: () => set((s) => ({ expanded: !s.expanded })),
}));
