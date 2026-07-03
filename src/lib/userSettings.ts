// Onboarding preferences stored in `user_settings`. These are collected once by
// the onboarding popup (see OnboardingModal) and let us tell — across devices —
// whether a user has been set up yet. The app itself still reads day-to-day
// prefs from localStorage; on save we write both places.

import { supabase } from './supabase';
import type { TtsEngine } from '../hooks/useTtsSettings';

export interface OnboardingPrefs {
  word_pack: string | null;
  mother_language: string | null;
  tts_engine: TtsEngine | null;
  tts_voice: string | null;
}

/** Fetch the user's onboarding prefs, or null if there's no row / no backend. */
export async function fetchOnboardingPrefs(userId: string): Promise<OnboardingPrefs | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_settings')
    .select('word_pack, mother_language, tts_engine, tts_voice')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[voca] failed to load settings:', error.message);
    return null;
  }
  return (data as OnboardingPrefs | null) ?? null;
}

/**
 * Has the user completed onboarding? True once any of the tracked fields is set
 * — matching "only show the popup if the user hasn't filled any of those fields."
 */
export function hasOnboarded(prefs: OnboardingPrefs | null): boolean {
  if (!prefs) return false;
  return Boolean(prefs.word_pack || prefs.mother_language || prefs.tts_engine || prefs.tts_voice);
}

/** Persist onboarding prefs (upsert — keeps other columns like api_keys_encrypted). */
export async function saveOnboardingPrefs(userId: string, prefs: OnboardingPrefs): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() });
  if (error) console.warn('[voca] failed to save settings:', error.message);
}
