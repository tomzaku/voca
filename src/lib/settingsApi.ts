// Client for the `settings` resource — everything the app remembers about a
// user that isn't word progress. Nothing else should touch `user_settings`
// (see CLAUDE.md).
//
//   GET   /settings          → { settings }
//   PATCH /settings   { … }  → { settings }   only the keys you send
//
// Preferences only — the learning streak is stored on the same row but has its
// own resource (streakApi.ts), because it's earned rather than chosen.
//
// Quiet throughout: every caller keeps the value locally (localStorage, or a
// store) and treats the server as the copy that follows you between devices.
// A failed save is warned about and the local choice stands.

import { request } from './api';

/**
 * The whole row, as the client sees it. Every field is present on a read —
 * null means "never set", never "missing".
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
}

/** Every field is writable — this resource is preferences, all the way down. */
export type SettingsPatch = Partial<UserSettings>;

/**
 * Shared in-flight request. Four stores ask for settings at sign-in — companion,
 * guess-game, collections, streak's neighbours — all within the same tick, and
 * they want the same row. Without this they'd each fetch it.
 *
 * Only the in-flight promise is shared, not the result: once it settles the
 * next call goes to the server again, so nothing is ever served stale.
 */
let inFlight: Promise<UserSettings | null> | null = null;

/** The user's settings, or null if they can't be reached. */
export function fetchSettings(): Promise<UserSettings | null> {
  if (inFlight) return inFlight;
  inFlight = request
    .get<{ settings: UserSettings }>('/settings', { quiet: true })
    .then((res) => res?.settings ?? null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Save some settings. Only the keys present in `patch` are written, so two
 * features saving at once leave each other's fields alone.
 */
export async function saveSettings(patch: SettingsPatch): Promise<UserSettings | null> {
  const res = await request.patch<{ settings: UserSettings }>('/settings', patch, { quiet: true });
  return res?.settings ?? null;
}

