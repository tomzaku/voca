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
  panel: FabPanel;
  practiceSeed: PracticeSeed | null;
  closePanel: () => void;
  startPractice: (seed: PracticeSeed) => void;
  clearPracticeSeed: () => void;
}

export const useFabStore = create<FabState>((set) => ({
  panel: 'none',
  practiceSeed: null,

  closePanel: () => set({ panel: 'none' }),
  startPractice: (seed) => set({ panel: 'englishPractice', practiceSeed: seed }),
  clearPracticeSeed: () => set({ practiceSeed: null }),
}));
