// Concrete colors for the canvas, resolved from the app's CSS variables at
// scene-build time so the world follows the active theme. Room grounds are
// world-specific (they don't exist as app variables): each biome has a light
// (day) and dark (night) look.

import type { StationKind, ThemeId } from './types';

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hex(css: string): number {
  return parseInt(css.replace('#', ''), 16);
}

export interface KindColor {
  color: number;
  css: string;
}

export interface ZoneGround {
  base: number;
  wall: number;
  patch: number;
  patchAlpha: number;
  /** CSS rgba for the dot-pattern texture (drawn on a 2D canvas). */
  dotRgba: string;
  labelCss: string;
}

export interface WorldPalette {
  light: boolean;
  /** The emptiness outside the rooms. */
  void: number;
  zones: Record<ThemeId, ZoneGround>;
  card: number;
  cardCss: string;
  border: number;
  track: number;
  textCss: string;
  mutedCss: string;
  kind: Record<StationKind, KindColor>;
  /** Accent for feature buildings (app pages), distinct from the station kinds. */
  poi: KindColor;
}

export function worldPalette(): WorldPalette {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  const card = cssVar('--color-bg-card', light ? '#ffffff' : '#342b80');
  const cyan = cssVar('--color-accent-cyan', '#22d3ee');
  const purple = cssVar('--color-accent-purple', '#b98bff');
  const green = cssVar('--color-accent-green', '#34e39b');
  const orange = cssVar('--color-accent-orange', '#ff9f43');
  const yellow = cssVar('--color-accent-yellow', '#ffd23f');

  return {
    light,
    void: hex(cssVar('--color-bg-primary', light ? '#cfe1ff' : '#1b1246')),
    zones: {
      forest: light
        ? {
            base: 0xa3d87e, wall: 0x6ca94e, patch: 0xffffff, patchAlpha: 0.22,
            dotRgba: 'rgba(60, 125, 60, 0.16)', labelCss: green,
          }
        : {
            base: 0x1e4230, wall: 0x0f2a1d, patch: 0x8ce6aa, patchAlpha: 0.05,
            dotRgba: 'rgba(160, 235, 185, 0.12)', labelCss: green,
          },
      desert: light
        ? {
            base: 0xecd9a3, wall: 0xc29c5c, patch: 0xffffff, patchAlpha: 0.3,
            dotRgba: 'rgba(150, 110, 50, 0.18)', labelCss: orange,
          }
        : {
            base: 0x4a3b26, wall: 0x2c2114, patch: 0xffd98a, patchAlpha: 0.05,
            dotRgba: 'rgba(255, 215, 150, 0.10)', labelCss: orange,
          },
    },
    card: hex(card),
    cardCss: card,
    border: hex(cssVar('--color-border', light ? '#b7c9ef' : '#5a4fc0')),
    track: hex(cssVar('--color-bg-tertiary', light ? '#ebf2ff' : '#2f2472')),
    textCss: cssVar('--color-text-primary', light ? '#262357' : '#ffffff'),
    mutedCss: cssVar('--color-text-muted', light ? '#8d8bb4' : '#9c91da'),
    kind: {
      mine: { color: hex(cyan), css: cyan },
      joined: { color: hex(purple), css: purple },
      level: { color: hex(green), css: green },
    },
    poi: { color: hex(yellow), css: yellow },
  };
}

export const FONT = '"Baloo 2", "Nunito", sans-serif';
