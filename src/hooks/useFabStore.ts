import { create } from 'zustand';

type FabPanel = 'none' | 'englishPractice';

interface FabState {
  expanded: boolean;
  panel: FabPanel;
  expand: () => void;
  toggleExpanded: () => void;
  collapse: () => void;
  openPanel: (panel: FabPanel) => void;
  closePanel: () => void;
}

export const useFabStore = create<FabState>((set) => ({
  expanded: false,
  panel: 'none',

  expand: () => set({ expanded: true }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  collapse: () => set({ expanded: false }),
  openPanel: (panel) => set({ panel, expanded: false }),
  closePanel: () => set({ panel: 'none' }),
}));
