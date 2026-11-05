// Daily goal — how many words a day the learner means to review, and how many
// they have so far today.
//
// The goal is a preference (the `settings` resource, mirrored in localStorage
// so a visitor without an account keeps theirs). Today's count isn't stored
// anywhere: it's the words whose last graded review fell on today's local
// date, read straight off the progress store. That follows a user between
// devices for free (lastReviewedAt syncs with progress) and can't drift from
// what the learner actually did.

import { create } from 'zustand';
import { fetchSettings, saveSettings } from '../lib/settingsApi';
import { useVocabularyStore } from './useVocabulary';
import { localDateString } from './useStreak';
import type { WordProgress } from '../types';

/** The goals offered on the start card and in Settings. */
export const GOAL_OPTIONS = [5, 10, 20, 30] as const;
export const DEFAULT_GOAL = 10;
const MAX_GOAL = 100;

const KEY = 'voca.dailyGoal';

function clean(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 1 ? Math.min(r, MAX_GOAL) : null;
}

function loadLocal(): number | null {
  try { return clean(localStorage.getItem(KEY)); } catch { return null; }
}

interface DailyGoalState {
  goal: number;
  /** Whether the learner ever picked one, rather than living with the default. */
  chosen: boolean;
  setGoal: (goal: number) => void;
  /** No userId: the settings API identifies the caller from their session. */
  loadFromRemote: () => Promise<void>;
}

export const useDailyGoal = create<DailyGoalState>((set) => {
  const local = loadLocal();
  return {
    goal: local ?? DEFAULT_GOAL,
    chosen: local !== null,

    setGoal: (goal) => {
      const g = clean(goal) ?? DEFAULT_GOAL;
      set({ goal: g, chosen: true });
      try { localStorage.setItem(KEY, String(g)); } catch { /* private mode */ }
      // Quiet: signed out it's a no-op, and the local copy stands either way.
      void saveSettings({ dailyGoal: g });
    },

    loadFromRemote: async () => {
      const remote = clean((await fetchSettings())?.dailyGoal);
      if (remote === null) {
        // Chosen on this device before signing in — carry it up to the account.
        const local = loadLocal();
        if (local !== null) void saveSettings({ dailyGoal: local });
        return;
      }
      set({ goal: remote, chosen: true });
      try { localStorage.setItem(KEY, String(remote)); } catch { /* private mode */ }
    },
  };
});

/** Words given a graded answer on `today` (local YYYY-MM-DD). */
export function countReviewedOn(progress: Record<string, WordProgress>, today: string): number {
  let n = 0;
  for (const p of Object.values(progress)) {
    if (p.lastReviewedAt && localDateString(new Date(p.lastReviewedAt)) === today) n++;
  }
  return n;
}

/**
 * Today's count. Returns a number, so components re-render only when it
 * changes, not on every progress write.
 */
export function useWordsToday(): number {
  return useVocabularyStore((s) => countReviewedOn(s.progress, localDateString()));
}
