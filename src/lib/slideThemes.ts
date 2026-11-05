import type { CSSProperties } from 'react';

// Looks for the collection slide deck (CollectionSlides). A theme does three
// things, all kept out of the way of the word:
//
//   colours — re-points the app's own tokens on the deck's root; Tailwind's
//             utilities read `var(--color-…)`, so every `text-text-primary`
//             inside follows without the deck knowing which theme is on.
//   decor   — a still or very slow backdrop at the edges (SlideDecor): ruled
//             paper, a chalk tray, stars. Never behind the word itself, never
//             fast, and frozen under prefers-reduced-motion — a class is
//             reading, not watching.
//   accent  — one touch on the word: a highlighter swipe, a chalk underline.
//
// Unlike test themes (testThemes.ts), nothing drifts across the middle.

export type SlideThemeId = 'app' | 'paper' | 'chalk' | 'night' | 'sunny' | 'ocean' | 'photo';

export type SlideDecorKind = 'none' | 'paper' | 'chalk' | 'night' | 'sunny' | 'ocean' | 'photo';

export interface SlideTheme {
  id: SlideThemeId;
  labelId: string;
  /** The picker's icon. */
  icon: string;
  /** Dark background: doodles (dark ink on transparent) are inverted to show. */
  dark: boolean;
  vars?: Record<string, string>;
  /** The stage behind everything — a gradient, under the decor. */
  background?: string;
  decor: SlideDecorKind;
  /** The headword's face, when the theme has a hand of its own. */
  wordFont?: string;
  accent?: 'highlight' | 'chalk';
  /** Only offered when the collection has a cover photo. */
  needsPhoto?: boolean;
}

const tokens = (t: {
  bg: string; card: string; tertiary: string; border: string;
  text: string; secondary: string; muted: string;
  cyan: string; purple: string; yellow: string;
}): Record<string, string> => ({
  '--color-bg-primary': t.bg,
  '--color-bg-card': t.card,
  '--color-bg-tertiary': t.tertiary,
  '--color-border': t.border,
  '--color-border-light': t.border,
  '--color-text-primary': t.text,
  '--color-text-secondary': t.secondary,
  '--color-text-muted': t.muted,
  '--color-accent-cyan': t.cyan,
  '--color-accent-purple': t.purple,
  '--color-accent-yellow': t.yellow,
});

const HAND = '"Patrick Hand", var(--font-body)';

export const SLIDE_THEMES: SlideTheme[] = [
  // Whatever the app is in — no overrides, no decor.
  { id: 'app', labelId: 'collections.slidesThemeApp', icon: 'lucide:monitor', dark: false, decor: 'none' },
  {
    id: 'paper', labelId: 'collections.slidesThemePaper', icon: 'lucide:notebook-pen', dark: false,
    decor: 'paper', wordFont: HAND, accent: 'highlight',
    vars: tokens({
      bg: '#fbf7ee', card: '#fffdf7', tertiary: '#f1ebdc', border: '#ddd3bd',
      text: '#2b2a33', secondary: '#4f4a5c', muted: '#857d90',
      cyan: '#0e8fa8', purple: '#7c4ddb', yellow: '#c98a00',
    }),
  },
  {
    id: 'chalk', labelId: 'collections.slidesThemeChalk', icon: 'lucide:presentation', dark: true,
    decor: 'chalk', wordFont: HAND, accent: 'chalk',
    background: 'radial-gradient(120% 90% at 50% 40%, #2a4a3b 0%, #1f3a2e 60%, #182e24 100%)',
    vars: tokens({
      bg: '#1f3a2e', card: '#24453a', tertiary: '#2a4a3b', border: '#4a7060',
      text: '#f5f3e8', secondary: '#dcd8c4', muted: '#a9bba9',
      cyan: '#ffe58a', purple: '#f7a8c4', yellow: '#ffe58a',
    }),
  },
  {
    id: 'night', labelId: 'collections.slidesThemeNight', icon: 'lucide:moon-star', dark: true,
    decor: 'night',
    background: 'radial-gradient(130% 100% at 80% 0%, #1d2a5c 0%, #0f1736 45%, #080c1f 100%)',
    vars: tokens({
      bg: '#0b1026', card: '#121a3a', tertiary: '#1a2148', border: '#2f3a70',
      text: '#ffffff', secondary: '#c9d1f5', muted: '#8e98c8',
      cyan: '#5ee6ff', purple: '#c4a6ff', yellow: '#ffd54f',
    }),
  },
  {
    id: 'sunny', labelId: 'collections.slidesThemeSunny', icon: 'lucide:sun', dark: false,
    decor: 'sunny',
    background: 'linear-gradient(180deg, #ffe9b0 0%, #fff4d6 45%, #fff8e6 100%)',
    vars: tokens({
      bg: '#fff4d6', card: '#fffaeb', tertiary: '#ffe7a8', border: '#f2c95c',
      text: '#3a2a12', secondary: '#5e4723', muted: '#8f7344',
      cyan: '#e8562a', purple: '#d63f75', yellow: '#d99400',
    }),
  },
  {
    id: 'ocean', labelId: 'collections.slidesThemeOcean', icon: 'lucide:waves', dark: true,
    decor: 'ocean',
    background: 'linear-gradient(180deg, #0c4a6e 0%, #075985 50%, #0b3b5c 100%)',
    vars: tokens({
      bg: '#075985', card: '#0b4f78', tertiary: '#0e5f8c', border: '#3b8fbf',
      text: '#f0fbff', secondary: '#cdeefc', muted: '#9fd3ea',
      cyan: '#7df9ff', purple: '#ffc9e3', yellow: '#ffe17a',
    }),
  },
  {
    id: 'photo', labelId: 'collections.slidesThemePhoto', icon: 'lucide:image', dark: true,
    decor: 'photo', needsPhoto: true,
    vars: tokens({
      bg: '#111318', card: '#1b1e26', tertiary: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.25)',
      text: '#ffffff', secondary: 'rgba(255,255,255,0.88)', muted: 'rgba(255,255,255,0.7)',
      cyan: '#7ee8fa', purple: '#d8c6ff', yellow: '#ffd54f',
    }),
  },
];

const STORAGE_KEY = 'voca-slides-theme';

/** The themes this deck can offer — Photo only with a photo to show. */
export function availableSlideThemes(hasPhoto: boolean): SlideTheme[] {
  return SLIDE_THEMES.filter((t) => hasPhoto || !t.needsPhoto);
}

export function slideTheme(id: SlideThemeId, hasPhoto: boolean): SlideTheme {
  return availableSlideThemes(hasPhoto).find((t) => t.id === id) ?? SLIDE_THEMES[0];
}

/** The presenter's last pick — a per-device convenience, so storage may fail. */
export function loadSlideTheme(): SlideThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (SLIDE_THEMES.some((t) => t.id === v)) return v as SlideThemeId;
  } catch { /* storage unavailable */ }
  return 'app';
}

export function saveSlideTheme(id: SlideThemeId): void {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage unavailable */ }
}

const EXAMPLE_TRANSLATIONS_KEY = 'voca-slides-example-translations';

/** Whether the deck shows examples' translations — on unless turned off here. */
export function loadShowExampleTranslations(): boolean {
  try { return localStorage.getItem(EXAMPLE_TRANSLATIONS_KEY) !== 'off'; } catch { return true; }
}

export function saveShowExampleTranslations(on: boolean): void {
  try { localStorage.setItem(EXAMPLE_TRANSLATIONS_KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ }
}

/** Inline style for the deck's root. */
export function slideThemeStyle(t: SlideTheme): CSSProperties | undefined {
  if (!t.vars && !t.background) return undefined;
  return { ...(t.vars as CSSProperties | undefined), ...(t.background ? { background: t.background } : {}) };
}

/**
 * The doodle's filter. The app theme keeps the shared `doodle-ink` class (it
 * follows the app's light/dark); a slide theme sets its own, since the class
 * reads the app's theme, not the deck's.
 */
export function doodleFilter(t: SlideTheme): string | undefined {
  if (t.id === 'app') return undefined;
  return t.dark ? 'invert(1) hue-rotate(180deg)' : 'none';
}
