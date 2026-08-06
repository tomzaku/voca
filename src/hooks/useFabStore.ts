import { create } from 'zustand';
import type { PracticeMode, TopicContext, TopicId } from './useEnglishChat';

type FabPanel = 'none' | 'englishPractice';

/**
 * A conversation requested from elsewhere in the app (the /speaking page):
 * the practice drawer opens on it directly, skipping mode & topic setup.
 */
export interface PracticeSeed {
  topicId: TopicId;
  mode: PracticeMode;
  context: TopicContext;
}

interface FabState {
  expanded: boolean;
  panel: FabPanel;
  practiceSeed: PracticeSeed | null;
  expand: () => void;
  toggleExpanded: () => void;
  collapse: () => void;
  openPanel: (panel: FabPanel) => void;
  closePanel: () => void;
  startPractice: (seed: PracticeSeed) => void;
  clearPracticeSeed: () => void;
}

export const useFabStore = create<FabState>((set) => ({
  expanded: false,
  panel: 'none',
  practiceSeed: null,

  expand: () => set({ expanded: true }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  collapse: () => set({ expanded: false }),
  openPanel: (panel) => set({ panel, expanded: false }),
  closePanel: () => set({ panel: 'none' }),
  startPractice: (seed) => set({ panel: 'englishPractice', expanded: false, practiceSeed: seed }),
  clearPracticeSeed: () => set({ practiceSeed: null }),
}));
