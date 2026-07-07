// Concrete colors for the canvas, resolved from the app's CSS variables at
// scene-build time so the world follows the active theme. Grass/road tones are
// world-specific (they don't exist as app variables): night clearing in dark
// mode, sunny meadow in light mode.

import type { StationKind } from './types';

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

export interface WorldPalette {
  light: boolean;
  grass: number;
  grassEdge: number;
  patch: number;
  patchAlpha: number;
  /** CSS rgba for the dot-pattern texture (drawn on a 2D canvas). */
  dotRgba: string;
  road: number;
  roadEdge: number;
  dash: number;
  dashAlpha: number;
  card: number;
  cardCss: string;
  border: number;
  track: number;
  textCss: string;
  mutedCss: string;
  bgCss: string;
  kind: Record<StationKind, KindColor>;
}

export function worldPalette(): WorldPalette {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  const card = cssVar('--color-bg-card', light ? '#ffffff' : '#342b80');
  const cyan = cssVar('--color-accent-cyan', '#22d3ee');
  const purple = cssVar('--color-accent-purple', '#b98bff');
  const green = cssVar('--color-accent-green', '#34e39b');

  return {
    light,
    grass: light ? 0xa3d87e : 0x1e4230,
    grassEdge: light ? 0x8fca6a : 0x173325,
    patch: light ? 0xffffff : 0x8ce6aa,
    patchAlpha: light ? 0.22 : 0.05,
    dotRgba: light ? 'rgba(60, 125, 60, 0.16)' : 'rgba(160, 235, 185, 0.12)',
    road: light ? 0xe8cd96 : 0x55482e,
    roadEdge: light ? 0xcfab6e : 0x423821,
    dash: light ? 0xffffff : 0xffebaf,
    dashAlpha: light ? 0.8 : 0.38,
    card: hex(card),
    cardCss: card,
    border: hex(cssVar('--color-border', light ? '#b7c9ef' : '#5a4fc0')),
    track: hex(cssVar('--color-bg-tertiary', light ? '#ebf2ff' : '#2f2472')),
    textCss: cssVar('--color-text-primary', light ? '#262357' : '#ffffff'),
    mutedCss: cssVar('--color-text-muted', light ? '#8d8bb4' : '#9c91da'),
    bgCss: cssVar('--color-bg-primary', light ? '#cfe1ff' : '#1b1246'),
    kind: {
      mine: { color: hex(cyan), css: cyan },
      joined: { color: hex(purple), css: purple },
      level: { color: hex(green), css: green },
    },
  };
}

export const FONT = '"Baloo 2", "Nunito", sans-serif';
