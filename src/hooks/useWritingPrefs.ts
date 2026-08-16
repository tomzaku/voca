// Display-only preference for Improve Writing: which correction categories
// (grammar / vocabulary / rephrase) to show under the revised options.
// Device-local and not account data — nothing here is written by the server
// or shared across devices, so it stays in localStorage rather than going
// through the `settings` resource (see CLAUDE.md).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LearningCategory } from '../lib/learningCategories';

export type WritingCorrectionCategory = Extract<LearningCategory, 'grammar' | 'vocabulary' | 'rephrase'>;

export const WRITING_CORRECTION_CATEGORIES: WritingCorrectionCategory[] = ['grammar', 'vocabulary', 'rephrase'];

interface WritingPrefsState {
  visibleCategories: Record<WritingCorrectionCategory, boolean>;
  toggleCategory: (category: WritingCorrectionCategory) => void;
}

export const useWritingPrefs = create<WritingPrefsState>()(
  persist(
    (set) => ({
      visibleCategories: { grammar: true, vocabulary: true, rephrase: true },
      toggleCategory: (category) =>
        set((s) => ({ visibleCategories: { ...s.visibleCategories, [category]: !s.visibleCategories[category] } })),
    }),
    {
      name: 'voca-writing-prefs',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
