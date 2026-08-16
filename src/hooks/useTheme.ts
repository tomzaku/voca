import { create } from 'zustand';

export type Theme = 'dark' | 'light' | 'colorful';

/** Cycle order for the quick-toggle control (Rail). */
const THEME_CYCLE: Theme[] = ['light', 'dark', 'colorful'];

const THEME_KEY = 'voca-theme';

// The solid palettes "Colorful" rotates through — see the
// [data-theme="colorful"][data-hue="…"] blocks in index.css. Every consumer
// of the theme (Rail's toggle, Settings, FlashCard) reads this same store, so
// a hue picked from one component is visible everywhere at once — a plain
// per-component useState here would let each mounted instance drift out of
// sync with the others.
export const COLORFUL_HUES = ['coral', 'sky', 'mint', 'grape', 'sunshine', 'bubblegum'] as const;
export type ColorfulHue = typeof COLORFUL_HUES[number];

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'colorful') return stored;
  } catch { /* ignore */ }
  return 'light';
}

function randomHue(exclude?: ColorfulHue): ColorfulHue {
  const pool = exclude ? COLORFUL_HUES.filter((h) => h !== exclude) : COLORFUL_HUES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function applyDom(theme: Theme, hue: ColorfulHue) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-hue', hue);
}

interface ThemeState {
  theme: Theme;
  /** Which solid Colorful variant is showing — irrelevant, but harmless, outside that theme. */
  hue: ColorfulHue;
  setTheme: (t: Theme) => void;
  /** Steps to the next theme in THEME_CYCLE — the single-button Rail control. */
  toggleTheme: () => void;
  /**
   * Jump to a different solid colour. No-op outside the Colorful theme, so
   * callers can call it unconditionally on every new question (see
   * FlashCard.tsx) without checking which theme is active themselves.
   */
  rotateHue: () => void;
}

const initialTheme = typeof window === 'undefined' ? 'light' : loadTheme();
const initialHue = randomHue();
applyDom(initialTheme, initialHue);

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  hue: initialHue,
  setTheme: (t) => {
    try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
    applyDom(t, get().hue);
    set({ theme: t });
  },
  toggleTheme: () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(get().theme) + 1) % THEME_CYCLE.length];
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
    applyDom(next, get().hue);
    set({ theme: next });
  },
  rotateHue: () => {
    if (get().theme !== 'colorful') return;
    const next = randomHue(get().hue);
    applyDom(get().theme, next);
    set({ hue: next });
  },
}));
