// Onboarding preferences, part of the `settings` resource. These are collected
// once by the onboarding popup (see OnboardingModal) and let us tell — across
// devices — whether a user has been set up yet. The app itself still reads
// day-to-day prefs from localStorage; on save we write both places.

import { fetchSettings, saveSettings } from './settingsApi';
import type { TtsEngine } from '../hooks/useTtsSettings';

export interface OnboardingPrefs {
  wordPack: string | null;
  motherLanguage: string | null;
  ttsEngine: TtsEngine | null;
  ttsVoice: string | null;
}

/** The user's onboarding prefs, or null if they can't be reached. */
export async function fetchOnboardingPrefs(): Promise<OnboardingPrefs | null> {
  const settings = await fetchSettings();
  if (!settings) return null;
  return {
    wordPack: settings.wordPack,
    motherLanguage: settings.motherLanguage,
    ttsEngine: settings.ttsEngine as TtsEngine | null,
    ttsVoice: settings.ttsVoice,
  };
}

/**
 * Has the user completed onboarding? True once any of the tracked fields is set
 * — matching "only show the popup if the user hasn't filled any of those fields."
 */
export function hasOnboarded(prefs: OnboardingPrefs | null): boolean {
  if (!prefs) return false;
  return Boolean(prefs.wordPack || prefs.motherLanguage || prefs.ttsEngine || prefs.ttsVoice);
}

/** Persist onboarding prefs. Other settings on the row are left alone. */
export async function saveOnboardingPrefs(prefs: OnboardingPrefs): Promise<void> {
  await saveSettings(prefs);
}
