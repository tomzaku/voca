import { create } from 'zustand';
import { type AnimalId, isAnimalId } from '../lib/companion';
import { supabase } from '../lib/supabase';

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
  loadFromRemote: (userId: string) => Promise<void>;
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

  loadFromRemote: async (userId) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('user_settings')
      .select('companion_animal, companion_name')
      .eq('user_id', userId)
      .maybeSingle();

    const remoteAnimal = isAnimalId(data?.companion_animal) ? data!.companion_animal as AnimalId : null;
    if (remoteAnimal) {
      const remoteName = (data?.companion_name as string | null) ?? '';
      try {
        localStorage.setItem(ANIMAL_KEY, remoteAnimal);
        localStorage.setItem(NAME_KEY, remoteName);
      } catch { /* ignore */ }
      set({ animalId: remoteAnimal, name: remoteName });
    } else if (get().animalId) {
      // Nothing (or nothing valid) on the server yet — push the local choice up.
      syncCompanion(get().animalId, get().name, userId);
    }
  },
}));

/** Upsert the buddy onto the user's settings row (fire-and-forget). */
function syncCompanion(animalId: AnimalId | null, name: string, userId?: string) {
  if (!supabase || !animalId) return;
  const client = supabase;
  (async () => {
    let uid = userId;
    if (!uid) {
      const { data } = await client.auth.getSession();
      uid = data.session?.user.id;
    }
    if (!uid) return; // not signed in — stays in localStorage until next sync
    const { error } = await client.from('user_settings').upsert({
      user_id: uid,
      companion_animal: animalId,
      companion_name: name || null,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('[voca] companion sync error:', error.message);
  })();
}
