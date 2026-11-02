import { create } from 'zustand';
import { festiveActive, type FestiveMode } from '../lib/festive';

// The festive-decorations setting — Auto (the season's dates), On or Off —
// kept per device like the light/dark theme (useTheme). While it's active,
// <html> carries data-festive="lunar": the app's small touches key off that
// in CSS, and the world watches it to hang its lanterns.

const KEY = 'voca-festive';

function load(): FestiveMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'auto' || v === 'on' || v === 'off') return v;
  } catch { /* ignore */ }
  return 'auto';
}

function applyDom(active: boolean) {
  if (typeof document === 'undefined') return;
  if (active) document.documentElement.setAttribute('data-festive', 'lunar');
  else document.documentElement.removeAttribute('data-festive');
}

interface FestiveState {
  mode: FestiveMode;
  /** Whether decorations are up right now — the mode, read against today's date. */
  active: boolean;
  setMode: (m: FestiveMode) => void;
}

const initialMode = typeof window === 'undefined' ? 'auto' : load();
const initialActive = festiveActive(initialMode, new Date());
applyDom(initialActive);

export const useFestive = create<FestiveState>((set) => ({
  mode: initialMode,
  active: initialActive,
  setMode: (mode) => {
    try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
    const active = festiveActive(mode, new Date());
    applyDom(active);
    set({ mode, active });
  },
}));
