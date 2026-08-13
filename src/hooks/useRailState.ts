import { create } from 'zustand';

// Shared between Rail (which renders the toggle) and App (whose <main> needs
// to know the current width to pad around it) — desktop pushes content over
// when expanded, so the padding has to track the same state as the rail.
interface RailState {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  toggle: () => void;
}

// Desktop has the room to default open; mobile doesn't, so it starts closed
// and expands as an overlay instead of pushing content.
const DESKTOP_QUERY = '(min-width: 640px)';

export const useRailState = create<RailState>((set) => ({
  expanded: typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  setExpanded: (v) => set({ expanded: v }),
  toggle: () => set((s) => ({ expanded: !s.expanded })),
}));
