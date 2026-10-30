import { create } from 'zustand';
import { useVocabularyStore } from './useVocabulary';
import { type AnimalId, isAnimalId } from '../lib/companion';
import { fetchSettings, saveSettings } from '../lib/settingsApi';
import { parseLook, type Look } from '../game/wardrobe';

const ANIMAL_KEY = 'voca-companion-animal';
const NAME_KEY = 'voca-companion-name';
const DRESS_KEY = 'voca-companion-dress';

function loadAnimal(): AnimalId | null {
  try {
    const v = localStorage.getItem(ANIMAL_KEY);
    if (isAnimalId(v)) return v;
  } catch { /* ignore */ }
  return null;
}

function loadName(): string {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

function loadDress(): Look | null {
  try {
    const raw = localStorage.getItem(DRESS_KEY);
    return raw ? parseLook(JSON.parse(raw)) : null;
  } catch { return null; }
}

interface CompanionState {
  animalId: AnimalId | null;
  name: string;
  choose: (id: AnimalId) => void;
  rename: (name: string) => void;
  /** What the buddy wears in the world; null until the first visit to the
   *  tailor's, which is what opens the world on the tailor's shop. */
  dress: Look | null;
  setDress: (look: Look) => void;
  /** Pull the buddy from Supabase on login (remote wins; pushes local up if remote is empty). */
  /** No userId: the settings API identifies the caller from their session. */
  loadFromRemote: () => Promise<void>;
}

export const useCompanion = create<CompanionState>((set, get) => ({
  animalId: loadAnimal(),
  name: loadName(),
  dress: loadDress(),

  choose: (id) => {
    try { localStorage.setItem(ANIMAL_KEY, id); } catch { /* ignore */ }
    set({ animalId: id });
    syncCompanion(id, get().name);
  },

  rename: (name) => {
    const clean = name.slice(0, 24);
    try { localStorage.setItem(NAME_KEY, clean); } catch { /* ignore */ }
    set({ name: clean });
    syncCompanion(get().animalId, clean);
  },

  setDress: (look) => {
    try { localStorage.setItem(DRESS_KEY, JSON.stringify(look)); } catch { /* ignore */ }
    set({ dress: look });
    void saveSettings({ companionDress: { ...look } });
  },

  loadFromRemote: async () => {
    const settings = await fetchSettings();
    // The look syncs on its own: remote wins, else the local one goes up.
    if (settings?.companionDress) {
      const dress = parseLook(settings.companionDress);
      try { localStorage.setItem(DRESS_KEY, JSON.stringify(dress)); } catch { /* ignore */ }
      set({ dress });
    } else if (settings && get().dress) {
      void saveSettings({ companionDress: { ...get().dress! } });
    }
    const remoteAnimal = isAnimalId(settings?.companionAnimal) ? settings!.companionAnimal as AnimalId : null;
    if (remoteAnimal) {
      const remoteName = settings?.companionName ?? '';
      try {
        localStorage.setItem(ANIMAL_KEY, remoteAnimal);
        localStorage.setItem(NAME_KEY, remoteName);
      } catch { /* ignore */ }
      set({ animalId: remoteAnimal, name: remoteName });
    } else if (get().animalId) {
      // Nothing (or nothing valid) on the server yet — push the local choice up.
      syncCompanion(get().animalId, get().name);
    }
  },
}));

/** Save the buddy onto the user's settings (fire-and-forget).
 *  Signed out, the call is a no-op and the choice stays in localStorage. */
function syncCompanion(animalId: AnimalId | null, name: string) {
  if (!animalId) return;
  void saveSettings({ companionAnimal: animalId, companionName: name || null });
}

/** Words marked known — what a buddy grows on (see lib/companion's growth). */
export function useWordsKnown(): number {
  return useVocabularyStore((s) => Object.values(s.progress).filter((e) => e.status === 'known').length);
}
