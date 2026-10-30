// The map being built: its three image layers and the tile grids that track
// what blocks, what's a deck over water, and what's already taken — plus
// `place`, which puts a structure on all of them at once.

import { Canvas } from './canvas.mjs';
import { P } from './palette.mjs';
import { H, PH, PW, T, W } from '../layout.mjs';

export const ground = new Canvas(PW, PH);
export const over = new Canvas(PW, PH);
/** Lights that only show in dark mode, added on top of the dimmed map. */
export const night = new Canvas(PW, PH);
/** A soft light: a bright core with a halo around it. */
export const glow = (x, y, c, r = 2) => {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy);
      if (d <= r) night.set(x + dx, y + dy, c, d < 1 ? 1 : 0.35 * (1 - d / (r + 1)));
    }
  }
};
/** Tiles that block movement, beyond water (which is derived per pixel). */
export const solid = Array.from({ length: H }, () => new Array(W).fill(false));
/** Tiles that are walkable whatever lies under them (bridges, pier). */
export const deck = Array.from({ length: H }, () => new Array(W).fill(false));
/** Tiles something is already built on — keeps scattered trees out of the way. */
export const used = Array.from({ length: H }, () => new Array(W).fill(false));
export const mark = (grid, x, y, w, h, v = true) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (grid[j]?.[i] !== undefined) grid[j][i] = v;
};

/** Everything drawn onto the map from its own canvas — structures, trees —
 *  and the small street furniture, with where it went: for the detailed
 *  renders (../hd), which redraw some of them finer in the same place.
 *  `x, y` is the canvas's top-left in map px; `overTo` how many of its rows
 *  went on the over layer too. */
export const drawn = [];

/** Soft drop shadow to the east and south of a footprint. */
export function dropShadow(px, py, pw, ph) {
  for (let y = 0; y < ph; y++) for (let x = 0; x < 4; x++) ground.set(px + pw + x, py + y + 3, P.shadow, 0.22 - x * 0.04);
  for (let x = 0; x < pw; x++) for (let y = 0; y < 3; y++) ground.set(px + x + 3, py + ph + y, P.shadow, 0.2 - y * 0.05);
}

/**
 * Place a structure canvas with its top-left at tile (tx, ty). `solidRows`
 * tiles at the bottom block movement (minus `gaps`, walkable tile columns such
 * as a gate's arch); everything above them is drawn over the buddy as well.
 */
export function place(cv, tx, ty, solidRows, { gaps = [], shadow = true } = {}) {
  const wT = Math.ceil(cv.w / T), hT = Math.ceil(cv.h / T);
  const solidFrom = hT - solidRows;
  if (shadow) dropShadow(tx * T, (ty + solidFrom) * T, cv.w, solidRows * T);
  ground.blit(cv, tx * T, ty * T);
  over.blit(cv, tx * T, ty * T, [0, solidFrom * T]);
  drawn.push({ type: 'structure', cv, x: tx * T, y: ty * T, overTo: solidFrom * T, tx, ty, solidRows });
  for (let j = solidFrom; j < hT; j++) {
    for (let i = 0; i < wT; i++) if (!gaps.includes(tx + i)) solid[ty + j][tx + i] = true;
  }
  mark(used, tx - 1, ty - 1, wT + 2, hT + 2);
}
