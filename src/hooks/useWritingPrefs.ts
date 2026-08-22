// Display preferences for Improve Writing: which correction categories
// (grammar / vocabulary / rephrase) to show, whether to show the second
// revision, and how each option's change list is ordered. Purely about how
// results are shown — the AI is always asked the same thing regardless of
// these. Device-local and not account data — nothing here is written by the
// server or shared across devices, so it stays in localStorage rather than
// going through the `settings` resource (see CLAUDE.md).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LearningCategory } from '../lib/learningCategories';

export type WritingCorrectionCategory = Extract<LearningCategory, 'grammar' | 'vocabulary' | 'rephrase'>;

export const WRITING_CORRECTION_CATEGORIES: WritingCorrectionCategory[] = ['grammar', 'vocabulary', 'rephrase'];

interface WritingPrefsState {
  visibleCategories: Record<WritingCorrectionCategory, boolean>;
  toggleCategory: (category: WritingCorrectionCategory) => void;
  /** Hide the second revision — most people only ever read one. Default true:
   *  Option 2 is opt-in, shown by unchecking "Don't show Option 2". */
  hideOption2: boolean;
  setHideOption2: (v: boolean) => void;
  /** Order each option's "What changed" list by where the change falls in
   *  the original text, instead of the order the model returned it in. */
  sortChanges: boolean;
  setSortChanges: (v: boolean) => void;
}

export const useWritingPrefs = create<WritingPrefsState>()(
  persist(
    (set) => ({
      visibleCategories: { grammar: true, vocabulary: true, rephrase: true },
      toggleCategory: (category) =>
        set((s) => ({ visibleCategories: { ...s.visibleCategories, [category]: !s.visibleCategories[category] } })),
      hideOption2: true,
      setHideOption2: (v) => set({ hideOption2: v }),
      sortChanges: true,
      setSortChanges: (v) => set({ sortChanges: v }),
    }),
    {
      name: 'voca-writing-prefs',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
