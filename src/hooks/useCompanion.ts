import { create } from 'zustand';
import { type AnimalId, isAnimalId } from '../lib/companion';
import { fetchSettings, saveSettings } from '../lib/settingsApi';

const ANIMAL_KEY = 'voca-companion-animal';
const NAME_KEY = 'voca-companion-name';

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

interface CompanionState {
  animalId: AnimalId | null;
  name: string;
  choose: (id: AnimalId) => void;
  rename: (name: string) => void;
  /** Pull the buddy from Supabase on login (remote wins; pushes local up if remote is empty). */
  /** No userId: the settings API identifies the caller from their session. */
  loadFromRemote: () => Promise<void>;
}

export const useCompanion = create<CompanionState>((set, get) => ({
  animalId: loadAnimal(),
  name: loadName(),

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

  loadFromRemote: async () => {
    const settings = await fetchSettings();
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
