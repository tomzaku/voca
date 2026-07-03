import { create } from 'zustand';
import { type AnimalId, isAnimalId } from '../lib/companion';

const ANIMAL_KEY = 'voca-companion-animal';
const NAME_KEY = 'voca-companion-name';

function loadAnimal(): AnimalId | null {
  try {
    const v = localStorage.getItem(ANIMAL_KEY);
    if (isAnimalId(v)) return v;
  } catch { /* ignore */ }
  return null;
}

interface CompanionState {
  animalId: AnimalId | null;
  name: string;
  choose: (id: AnimalId) => void;
  rename: (name: string) => void;
}

export const useCompanion = create<CompanionState>((set) => ({
  animalId: loadAnimal(),
  name: (() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } })(),

  choose: (id) => {
    try { localStorage.setItem(ANIMAL_KEY, id); } catch { /* ignore */ }
    set({ animalId: id });
  },

  rename: (name) => {
    const clean = name.slice(0, 24);
    try { localStorage.setItem(NAME_KEY, clean); } catch { /* ignore */ }
    set({ name: clean });
  },
}));
