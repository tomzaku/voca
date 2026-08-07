// Daily learning streak — consecutive calendar days with at least one graded
// answer, counted in the learner's own timezone.
//
// The count lives server-side (see record_learning_day) so it follows a user
// across devices and can't be inflated by clock-fiddling on one of them. This
// store is a local mirror plus the call that advances it.

import { create } from 'zustand';
import { fetchSettings, recordLearningDay } from '../lib/settingsApi';

/** Today as YYYY-MM-DD in the *browser's* zone — not UTC. */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface StreakState {
  count: number;
  longest: number;
  lastActiveDay: string | null;
  /** True once today has been counted — lets the UI celebrate only on the day's first answer. */
  countedToday: () => boolean;
  /** No userId: the settings API identifies the caller from their session. */
  loadFromRemote: () => Promise<void>;
  /** Call on any graded answer. Cheap and idempotent after the first call each day. */
  record: () => Promise<void>;
  reset: () => void;
}

export const useStreak = create<StreakState>()((set, get) => ({
  count: 0,
  longest: 0,
  lastActiveDay: null,

  countedToday: () => get().lastActiveDay === localDateString(),

  loadFromRemote: async () => {
    const settings = await fetchSettings();
    if (!settings) return;
    set({
      count: settings.streakCount ?? 0,
      longest: settings.longestStreak ?? 0,
      lastActiveDay: settings.lastActiveDay,
    });
  },

  record: async () => {
    // Skip the round trip once the day is already counted — this fires on every
    // single answer, and only the first one of the day can change anything.
    if (get().countedToday()) return;

    // The server counts the day (once) and hands back the resulting streak.
    const settings = await recordLearningDay(localDateString());
    if (!settings) return;
    set({
      count: settings.streakCount ?? 0,
      longest: settings.longestStreak ?? 0,
      lastActiveDay: settings.lastActiveDay,
    });
  },

  reset: () => set({ count: 0, longest: 0, lastActiveDay: null }),
}));
