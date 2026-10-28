import { create } from 'zustand';

export type Theme = 'dark' | 'light';

/** Cycle order for the quick-toggle control (Rail). */
const THEME_CYCLE: Theme[] = ['light', 'dark'];

const THEME_KEY = 'voca-theme';

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    // Anything else — including the retired "colorful" theme, which was a
    // light-surface palette — lands on light.
  } catch { /* ignore */ }
  return 'light';
}

function applyDom(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.removeAttribute('data-hue');
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Steps to the next theme in THEME_CYCLE — the single-button Rail control. */
  toggleTheme: () => void;
}

const initialTheme = typeof window === 'undefined' ? 'light' : loadTheme();
applyDom(initialTheme);

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  setTheme: (t) => {
    try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
    applyDom(t);
    set({ theme: t });
  },
  toggleTheme: () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(get().theme) + 1) % THEME_CYCLE.length];
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
    applyDom(next);
    set({ theme: next });
  },
}));
