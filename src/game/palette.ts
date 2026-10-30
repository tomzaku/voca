// Concrete colors for the canvas, resolved from the app's CSS variables at
// scene-build time so the world follows the active theme. Room grounds are
// world-specific (they don't exist as app variables): each biome has a light
// (day) and dark (night) look.

import type { ThemeId } from './types';

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
  /** Accent for the keepers. */
  poi: KindColor;
}

export function worldPalette(): WorldPalette {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  const card = cssVar('--color-bg-card', light ? '#ffffff' : '#1c2340');
  const cyan = cssVar('--color-accent-cyan', '#3dd9f0');
  const green = cssVar('--color-accent-green', '#4ade9b');
  const orange = cssVar('--color-accent-orange', '#ffa94d');
  const yellow = cssVar('--color-accent-yellow', '#ffd54f');

  return {
    light,
    void: hex(cssVar('--color-bg-primary', light ? '#f0f2f5' : '#0d1120')),
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
      snow: light
        ? {
            base: 0xeceaf2, wall: 0xbcb8cc, patch: 0xffffff, patchAlpha: 0.35,
            dotRgba: 'rgba(120, 130, 170, 0.16)', labelCss: cyan,
          }
        : {
            base: 0x2c3050, wall: 0x1a1d33, patch: 0xdfe6ff, patchAlpha: 0.06,
            dotRgba: 'rgba(210, 225, 255, 0.12)', labelCss: cyan,
          },
    },
    card: hex(card),
    // Name tags on the map are HUD, not app: dark plates with light text in
    // both themes, matching the pixel kit (src/components/worldgames/pixel).
    cardCss: 'rgba(20, 16, 13, 0.9)',
    border: hex(cssVar('--color-border', light ? '#dddfe2' : '#46528c')),
    track: hex(cssVar('--color-bg-tertiary', light ? '#f0f2f5' : '#242c4c')),
    textCss: '#f6ecd6',
    mutedCss: '#b8a88e',
    poi: { color: hex(yellow), css: yellow },
  };
}

/** The HUD's condensed face, so map tags read like the pixel kit. */
export const FONT = '"Barlow Condensed", sans-serif';
