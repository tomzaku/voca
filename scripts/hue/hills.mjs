// The hills where the emperors lie: a height for every point south of the
// city — a range of peaks along the map's southern edge, mountain masses
// between and beside the tombs, valleys for the tombs themselves and for
// the road that winds past them — and the light on it, from the north-west.
// The terrain is shaded and contoured by it, the forest grows on it (but not
// on the bare rock of the summits), and its canopy is lit by it.

import { noise } from './core/canvas.mjs';
import { H, HILLS_Y, T } from './layout.mjs';

/** Peaks: [x, y, radius, height] in tiles. */
const PEAKS = [
  [52, 101, 8, 0.95],                                        // between Khải Định and Minh Mạng
  [101, 99, 10, 1.05], [113, 110, 9, 1.0],                   // east of Minh Mạng
  [3, 101, 5, 0.6],
  [12, 119, 8, 0.95], [34, 120, 9, 1.05], [58, 119, 10, 1.1], [80, 121, 9, 1.0], [99, 119, 8, 0.95], [117, 119, 7, 0.9],
];
/** Valleys: [x, y, radius, depth] — the tombs sit in them. */
const VALLEYS = [[10, 102, 8, 0.6], [34, 100, 8, 0.6], [79, 99, 10, 0.6]];
/** The tombs' road runs along the foot of the range. */
const ROAD_Y = 110.8;

const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (tx, ty, [x, y, r, h]) => h * Math.exp(-((tx - x) ** 2 + (ty - y) ** 2) / (r * r));

/** The land's height (0 the plain, about 1 a summit) at map pixel (x, y). */
export function height(x, y) {
  const tx = x / T, ty = y / T;
  if (ty < HILLS_Y - 4) return 0;
  let h = smooth(H - 12, H - 1, ty) * 0.35;
  for (const p of PEAKS) h += bump(tx, ty, p);
  for (const v of VALLEYS) h -= bump(tx, ty, v);
  h -= 0.5 * Math.exp(-((ty - ROAD_Y) ** 2) / 3);
  h += (noise(x, y, 70) - 0.5) * 0.18;
  return Math.max(0, h) * smooth(HILLS_Y - 4, HILLS_Y + 2, ty);
}

/** Above this the trees give out to bare rock. */
export const TREELINE = 1.22;

/** How the light falls on the slope at (x, y): about -1 in shadow to 1
 *  facing the light, which comes from the north-west and above. */
export function light(x, y) {
  const d = 6;
  const gx = (height(x + d, y) - height(x - d, y)) / (2 * d / T), gy = (height(x, y + d) - height(x, y - d)) / (2 * d / T);
  return Math.max(-1, Math.min(1, (gx + gy) * -5));
}
