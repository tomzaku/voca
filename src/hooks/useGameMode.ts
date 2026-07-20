import { create } from 'zustand';

// Whether the standalone World game (the /world hub) is turned on. Device-local
// like the companion avatar (useCompanion.avatar) — it only changes navigation
// and which page is reachable, so there's no need to sync it to the server.
const KEY = 'voca-game-mode';

function load(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

interface GameModeState {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
}

/** The World-game toggle, configured only from Settings. */
export const useGameMode = create<GameModeState>((set) => ({
  enabled: load(),
  setEnabled: (on) => {
    try { localStorage.setItem(KEY, String(on)); } catch { /* ignore */ }
    set({ enabled: on });
  },
}));
