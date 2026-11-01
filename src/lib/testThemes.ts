// How each test theme looks on a student's screen. The server only stores the
// name (supabase/functions/_shared/tests.ts lists the same six); everything
// visual is here.
//
// A themed test is its own little world, so its colours are fixed hex values
// rather than the app's light/dark tokens: an ocean is blue in either mode.
// The question itself still sits on an ordinary card, so it reads the same
// whatever's behind it.

export type TestTheme = 'classic' | 'ocean' | 'space' | 'jungle' | 'candy' | 'castle';
export const TEST_THEMES: TestTheme[] = ['classic', 'ocean', 'space', 'jungle', 'candy', 'castle'];

/** How the background pieces move: bubbles rise, stars twinkle, leaves sway, sweets fall. */
export type DecoMotion = 'rise' | 'twinkle' | 'sway' | 'fall';

export interface ThemeLook {
  /** Shown on the picker. */
  icon: string;
  /** The stage behind the question card. Null keeps the app's own background. */
  background: string | null;
  /** Answer tiles, in order — one colour per option, like four big buttons. */
  tiles: string[];
  /** Things drifting behind the card, and how they move. */
  deco: string[];
  motion: DecoMotion;
  /** Rides along the progress bar. */
  runner: string;
}

const CLASSIC_TILES = ['#22d3ee', '#a78bfa', '#34d399', '#fb923c'];

export const THEME_LOOKS: Record<TestTheme, ThemeLook> = {
  classic: {
    icon: 'lucide:clipboard-check',
    background: null,
    tiles: CLASSIC_TILES,
    deco: [],
    motion: 'rise',
    runner: 'lucide:pencil',
  },
  ocean: {
    icon: 'lucide:fish',
    background: 'linear-gradient(180deg, #38bdf8 0%, #0369a1 55%, #1e3a8a 100%)',
    tiles: ['#f97316', '#22c55e', '#eab308', '#ec4899'],
    deco: ['lucide:fish', 'lucide:shell', 'lucide:circle', 'lucide:waves', 'lucide:circle'],
    motion: 'rise',
    runner: 'lucide:fish',
  },
  space: {
    icon: 'lucide:rocket',
    background: 'radial-gradient(circle at 30% 20%, #4c1d95 0%, #1e1b4b 45%, #020617 100%)',
    tiles: ['#8b5cf6', '#06b6d4', '#f43f5e', '#facc15'],
    deco: ['lucide:star', 'lucide:sparkles', 'lucide:orbit', 'lucide:star', 'lucide:moon'],
    motion: 'twinkle',
    runner: 'lucide:rocket',
  },
  jungle: {
    icon: 'lucide:trees',
    background: 'linear-gradient(180deg, #4ade80 0%, #15803d 50%, #14532d 100%)',
    tiles: ['#f59e0b', '#ef4444', '#3b82f6', '#a855f7'],
    deco: ['lucide:leaf', 'lucide:sprout', 'lucide:bird', 'lucide:leaf', 'lucide:trees'],
    motion: 'sway',
    runner: 'lucide:bird',
  },
  candy: {
    icon: 'lucide:candy',
    background: 'linear-gradient(160deg, #f9a8d4 0%, #f0abfc 45%, #a78bfa 100%)',
    tiles: ['#ec4899', '#8b5cf6', '#14b8a6', '#f97316'],
    deco: ['lucide:candy', 'lucide:lollipop', 'lucide:ice-cream-cone', 'lucide:cake-slice', 'lucide:heart'],
    motion: 'fall',
    runner: 'lucide:lollipop',
  },
  castle: {
    icon: 'lucide:castle',
    background: 'linear-gradient(180deg, #78350f 0%, #451a03 55%, #1c1917 100%)',
    tiles: ['#dc2626', '#2563eb', '#ca8a04', '#16a34a'],
    deco: ['lucide:crown', 'lucide:shield', 'lucide:swords', 'lucide:castle', 'lucide:gem'],
    motion: 'twinkle',
    runner: 'lucide:crown',
  },
};

export function themeLook(theme: string | undefined): ThemeLook {
  return THEME_LOOKS[(TEST_THEMES as string[]).includes(theme ?? '') ? theme as TestTheme : 'classic'];
}
