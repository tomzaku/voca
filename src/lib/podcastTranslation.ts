// Sentence-by-sentence translations of the Listen podcasts, made by
// `npm run podcasts:translate` and bundled with the app: one lazy chunk per
// episode and language, fetched only once the player's Translation toggle is
// on. Static content, like the podcasts themselves — no table, no edge
// function. Keyed by the English sentence, so an edited sentence just shows
// no translation until the script is run again.

import { getMotherLanguage } from './languages';

type Lines = Record<string, string>;

const files = import.meta.glob<{ default: Lines }>('../data/podcastTranslations/*/*.json');

/** Mother languages (as Settings names them) that have translations, → folder. */
const FOLDERS: Record<string, string> = { Vietnamese: 'vi' };

const path = (folder: string, id: string) => `../data/podcastTranslations/${folder}/${id}.json`;

/** The folder for the user's mother language, when this episode has a translation in it. */
export function translationFolder(podcastId: string): string | null {
  const folder = FOLDERS[getMotherLanguage()];
  return folder && files[path(folder, podcastId)] ? folder : null;
}

export async function loadTranslation(folder: string, podcastId: string): Promise<Lines> {
  const load = files[path(folder, podcastId)];
  return load ? (await load()).default : {};
}

const PREF_KEY = 'voca-podcast-translation';

export function translationPref(): boolean {
  try { return localStorage.getItem(PREF_KEY) === 'on'; } catch { return false; }
}

export function setTranslationPref(on: boolean): void {
  try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch { /* per-device nicety only */ }
}
