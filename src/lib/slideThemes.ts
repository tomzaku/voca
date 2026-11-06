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

export type SlideThemeId =
  | 'app' | 'paper' | 'chalk' | 'night' | 'sunny' | 'ocean'
  | 'school' | 'travel' | 'garden' | 'kitchen' | 'city'
  | 'photo';

export type SlideDecorKind = Exclude<SlideThemeId, 'app'> | 'none';

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
  /** The title and end slides' stage: a bolder take on `background`, the way
   *  a deck's cover differs from its pages. Same light/dark as the theme, so
   *  its colours read on it unchanged. Without one, a wash of the accent. */
  cover?: string;
  decor: SlideDecorKind;
  /** The headword's face, when the theme has a hand of its own. */
  wordFont?: string;
  accent?: SlideAccent;
  /** The accent's colour, where the theme wants its own. */
  accentColor?: string;
  /** Only offered when the collection has a cover photo. */
  needsPhoto?: boolean;
  /** Built-in topics this theme suits — offered first, and used when the
   *  presenter hasn't picked a theme of their own yet. */
  topics?: string[];
}

/** One touch on the headword: a marker swipe, a chalk line, a travel route. */
export type SlideAccent = 'highlight' | 'chalk' | 'route';

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
    cover: 'linear-gradient(135deg, #f3e2bb 0%, #f9efd7 45%, #fbf7ee 100%)',
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
    cover: 'radial-gradient(90% 70% at 50% 45%, #33604b 0%, #1c372b 65%, #10221a 100%)',
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
    cover: 'radial-gradient(80% 70% at 50% 55%, #2c3c8c 0%, #141d4a 50%, #060917 100%)',
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
    cover: 'radial-gradient(90% 80% at 50% 0%, #ffcf5c 0%, #ffe39a 40%, #fff4d6 100%)',
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
    cover: 'radial-gradient(100% 80% at 50% 100%, #0e7f9e 0%, #075985 45%, #082f49 100%)',
    vars: tokens({
      bg: '#075985', card: '#0b4f78', tertiary: '#0e5f8c', border: '#3b8fbf',
      text: '#f0fbff', secondary: '#cdeefc', muted: '#9fd3ea',
      cyan: '#7df9ff', purple: '#ffc9e3', yellow: '#ffe17a',
    }),
  },
  // ── Topic themes — each pairs with the built-in topics it suits.
  {
    id: 'school', labelId: 'collections.slidesThemeSchool', icon: 'lucide:graduation-cap', dark: false,
    decor: 'school', accent: 'highlight', accentColor: 'rgba(255,214,102,0.6)',
    topics: ['topic-school'],
    background: 'linear-gradient(180deg, #eef8f2 0%, #f6fbf7 60%, #fdf8ec 100%)',
    cover: 'linear-gradient(160deg, #d3eedd 0%, #eaf6ef 50%, #fff0cc 100%)',
    vars: tokens({
      bg: '#f3faf6', card: '#ffffff', tertiary: '#e3f1e8', border: '#c9e1d2',
      text: '#23324a', secondary: '#45546e', muted: '#7a8798',
      cyan: '#2a8fd6', purple: '#7b5cd6', yellow: '#d99a00',
    }),
  },
  {
    id: 'travel', labelId: 'collections.slidesThemeTravel', icon: 'lucide:plane', dark: false,
    decor: 'travel', accent: 'route', accentColor: '#b5523b',
    topics: ['topic-travel', 'topic-transport'],
    background: 'radial-gradient(120% 100% at 50% 40%, #f8f1df 0%, #f1e6cc 70%, #e8d9b8 100%)',
    cover: 'radial-gradient(90% 80% at 50% 45%, #fbf4e2 0%, #e9d6aa 65%, #d6bb86 100%)',
    vars: tokens({
      bg: '#f4ecd8', card: '#fbf6e9', tertiary: '#ebdfc3', border: '#d6c49c',
      text: '#2f2a22', secondary: '#54493a', muted: '#857761',
      cyan: '#1e7fa8', purple: '#b5523b', yellow: '#c98a00',
    }),
  },
  {
    id: 'garden', labelId: 'collections.slidesThemeGarden', icon: 'lucide:flower-2', dark: false,
    decor: 'garden', accent: 'highlight', accentColor: 'rgba(167,224,140,0.6)',
    topics: ['topic-nature', 'topic-animals', 'topic-weather'],
    background: 'linear-gradient(180deg, #eaf6e3 0%, #f3faee 55%, #f7fbf2 100%)',
    cover: 'radial-gradient(110% 80% at 50% 100%, #c6e6b2 0%, #e2f2d6 50%, #f3faee 100%)',
    vars: tokens({
      bg: '#eef7e6', card: '#fbfef8', tertiary: '#dfeed4', border: '#bfdcae',
      text: '#23361f', secondary: '#425a3c', muted: '#73886c',
      cyan: '#2f8f4e', purple: '#b0558d', yellow: '#c98f00',
    }),
  },
  {
    id: 'kitchen', labelId: 'collections.slidesThemeKitchen', icon: 'lucide:chef-hat', dark: false,
    decor: 'kitchen', accent: 'highlight', accentColor: 'rgba(255,170,140,0.5)',
    topics: ['topic-food', 'topic-cooking'],
    background: 'linear-gradient(180deg, #fff6ec 0%, #fffaf4 70%)',
    cover: 'linear-gradient(160deg, #ffd9b8 0%, #ffeedd 50%, #fffaf4 100%)',
    vars: tokens({
      bg: '#fff7ef', card: '#fffdf9', tertiary: '#fbe8d6', border: '#efcfae',
      text: '#3b2618', secondary: '#5f4330', muted: '#8f725d',
      cyan: '#c4572a', purple: '#7a4a8c', yellow: '#c98a00',
    }),
  },
  {
    id: 'city', labelId: 'collections.slidesThemeCity', icon: 'lucide:building-2', dark: true,
    decor: 'city',
    topics: ['topic-city', 'topic-shopping'],
    background: 'linear-gradient(180deg, #141a36 0%, #262150 55%, #43305e 100%)',
    cover: 'linear-gradient(180deg, #0a0d24 0%, #2a1f55 50%, #74406f 100%)',
    vars: tokens({
      bg: '#1b2140', card: '#232a4f', tertiary: '#2c3360', border: '#48508a',
      text: '#ffffff', secondary: '#d6daf3', muted: '#9aa1c8',
      cyan: '#ffd479', purple: '#ff9ecb', yellow: '#ffd479',
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

/** A theme id from outside — a link's `?theme=` — or undefined if it isn't one. */
export function asSlideThemeId(v: string | null | undefined): SlideThemeId | undefined {
  return SLIDE_THEMES.find((t) => t.id === v)?.id;
}

/** The theme made for a built-in topic, if there is one. */
export function suggestedSlideTheme(collectionId: string): SlideThemeId | undefined {
  return SLIDE_THEMES.find((t) => t.topics?.includes(collectionId))?.id;
}

/**
 * The presenter's last pick — a per-device convenience, so storage may fail.
 * Null until they've picked one, so a topic can open in its own theme.
 */
export function loadSlideTheme(): SlideThemeId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (SLIDE_THEMES.some((t) => t.id === v)) return v as SlideThemeId;
  } catch { /* storage unavailable */ }
  return null;
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

/** A cover for a theme without its own (the app's): its accent, washed in
 *  from the top over its page colour — so it follows the app's light/dark. */
const DEFAULT_COVER =
  'radial-gradient(120% 85% at 50% 0%, color-mix(in srgb, var(--color-accent-cyan) 22%, var(--color-bg-primary)) 0%, var(--color-bg-primary) 75%)';

/** Inline style for the deck's root — on the title and end slides, `cover`. */
export function slideThemeStyle(t: SlideTheme, cover = false): CSSProperties | undefined {
  const background = cover ? t.cover ?? DEFAULT_COVER : t.background;
  if (!t.vars && !background) return undefined;
  return { ...(t.vars as CSSProperties | undefined), ...(background ? { background } : {}) };
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
