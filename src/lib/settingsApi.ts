// Client for the `settings` resource — everything the app remembers about a
// user that isn't word progress. Nothing else should touch `user_settings`
// (see CLAUDE.md).
//
//   GET   /settings          → { settings }
//   PATCH /settings   { … }  → { settings }   only the keys you send
//   POST  /settings/streak   → { settings }   counts today, once
//
// Quiet throughout: every caller keeps the value locally (localStorage, or a
// store) and treats the server as the copy that follows you between devices.
// A failed save is warned about and the local choice stands.

import { request } from './api';

/**
 * The whole row, as the client sees it. Every field is present on a read —
 * null means "never set", never "missing".
 *
 * The three streak fields are read-only: they move only through
 * `recordLearningDay`, which enforces "one day counts once" server-side.
 */
export interface UserSettings {
  wordPack: string | null;
  motherLanguage: string | null;
  ttsEngine: string | null;
  ttsVoice: string | null;
  companionAnimal: string | null;
  companionName: string | null;
  activeCollection: string | null;
  guessGame: string | null;
  reminderEnabled: boolean | null;
  reminderTimezone: string | null;
  reminderTimes: number[] | null;
  reminderDays: number[] | null;
  notifyStreak: boolean | null;
  notifyReview: boolean | null;
  streakCount: number | null;
  longestStreak: number | null;
  lastActiveDay: string | null;
}

/** What a caller may write — the streak is the server's to keep. */
export type SettingsPatch = Partial<Omit<UserSettings, 'streakCount' | 'longestStreak' | 'lastActiveDay'>>;

/** The user's settings, or null if they can't be reached. */
export async function fetchSettings(): Promise<UserSettings | null> {
  const res = await request.get<{ settings: UserSettings }>('/settings', { quiet: true });
  return res?.settings ?? null;
}

/**
 * Save some settings. Only the keys present in `patch` are written, so two
 * features saving at once leave each other's fields alone.
 */
export async function saveSettings(patch: SettingsPatch): Promise<UserSettings | null> {
  const res = await request.patch<{ settings: UserSettings }>('/settings', patch, { quiet: true });
  return res?.settings ?? null;
}

/**
 * Count today towards the learning streak. `day` is the caller's LOCAL date
 * (YYYY-MM-DD) so the streak follows the learner's calendar, not UTC's.
 * Counting a day twice is a no-op server-side.
 */
export async function recordLearningDay(day: string): Promise<UserSettings | null> {
  const res = await request.post<{ settings: UserSettings }>('/settings/streak', { day }, { quiet: true });
  return res?.settings ?? null;
}
