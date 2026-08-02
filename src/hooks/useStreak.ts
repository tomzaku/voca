// Daily learning streak — consecutive calendar days with at least one graded
// answer, counted in the learner's own timezone.
//
// The count lives server-side (see record_learning_day) so it follows a user
// across devices and can't be inflated by clock-fiddling on one of them. This
// store is a local mirror plus the call that advances it.

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  loadFromRemote: (userId: string) => Promise<void>;
  /** Call on any graded answer. Cheap and idempotent after the first call each day. */
  record: () => Promise<void>;
  reset: () => void;
}

export const useStreak = create<StreakState>()((set, get) => ({
  count: 0,
  longest: 0,
  lastActiveDay: null,

  countedToday: () => get().lastActiveDay === localDateString(),

  loadFromRemote: async (userId) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('user_settings')
      .select('streak_count, longest_streak, last_active_day')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return;
    set({
      count: (data.streak_count as number | null) ?? 0,
      longest: (data.longest_streak as number | null) ?? 0,
      lastActiveDay: (data.last_active_day as string | null) ?? null,
    });
  },

  record: async () => {
    // Skip the round trip once the day is already counted — this fires on every
    // single answer, and only the first one of the day can change anything.
    if (!supabase || get().countedToday()) return;

    const today = localDateString();
    const { data, error } = await supabase.rpc('record_learning_day', {
      p_local_date: today,
    });
    if (error) {
      console.warn('[voca] failed to record learning day:', error.message);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { streak_count: number; longest_streak: number; last_active_day: string }
      | undefined;
    if (!row) return;

    set({
      count: row.streak_count,
      longest: row.longest_streak,
      lastActiveDay: row.last_active_day,
    });
  },

  reset: () => set({ count: 0, longest: 0, lastActiveDay: null }),
}));
