// The hills where the emperors lie: a height for every point south of the
// city — a range of peaks along the map's southern edge, mountain masses
// between and beside the tombs, the road winding along their foot — and the
// light on it, from the north-west. The tombs stand up on the mountain: each
// on a level plateau, the land falling away round it in terraces.
//
// The land rises in terraces, a cliff where each one steps up: the cliff's
// rock face shows on its south side, towards you, a lip of grass along its
// top and a shadow at its foot. Pines grow
// on the terraces (fill/greenery.mjs); above the tree line it's bare rock.

import { noise } from './core/canvas.mjs';
import { H, HILLS_Y, PH, PW, T } from './layout.mjs';

/** Peaks: [x, y, radius, height] in tiles. */
const PEAKS = [
  [52, 101, 8, 0.95],                                        // between Khải Định and Minh Mạng
  [101, 99, 10, 1.05], [113, 110, 9, 1.0],                   // east of Minh Mạng
  [3, 101, 5, 0.6],
  [12, 119, 8, 0.95], [34, 120, 9, 1.05], [58, 119, 10, 1.1], [80, 121, 9, 1.0], [99, 119, 8, 0.95], [117, 119, 7, 0.9],
];
/** The tombs' plateaus: [x0, y0, x1, y1] in tiles — Tự Đức's, Khải Định's,
 *  Minh Mạng's — level at PLATEAU, the land falling from their edges over
 *  FALL tiles. */
const PLATEAUS = [[2, 94, 19, 110], [27, 89, 42, 110], [70, 90, 89, 110]];
const PLATEAU = 0.86, FALL = 4;
/** The tombs' road runs along the foot of the range. */
const ROAD_Y = 114.8;
/** How much height makes one terrace, and how tall (map px) a cliff face is. */
const STEP = 0.24, CLIFF = 12;

const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (tx, ty, [x, y, r, h]) => h * Math.exp(-((tx - x) ** 2 + (ty - y) ** 2) / (r * r));

function rawHeight(x, y) {
  const tx = x / T, ty = y / T;
  if (ty < HILLS_Y - 4) return 0;
  let h = smooth(H - 12, H - 1, ty) * 0.35;
  for (const p of PEAKS) h += bump(tx, ty, p);
  h -= 0.5 * Math.exp(-((ty - ROAD_Y) ** 2) / 3);
  h += (noise(x, y, 70) - 0.5) * 0.18;
  h = Math.max(0, h) * smooth(HILLS_Y - 4, HILLS_Y + 2, ty);
  for (const [x0, y0, x1, y1] of PLATEAUS) {
    const d = Math.max(x0 - tx, tx - x1, y0 - ty, ty - y1);   // ≤ 0 inside
    if (d <= 0) return PLATEAU;
    h = Math.max(h, PLATEAU * (1 - smooth(0, FALL, d)));
  }
  return h;
}

// Worked out once, a value per map pixel from the hills down.
const Y0 = (HILLS_Y - 4) * T;
let grid = null;
const heights = () => {
  if (!grid) {
    grid = new Float32Array(PW * (PH - Y0));
    for (let y = Y0; y < PH; y++) for (let x = 0; x < PW; x++) grid[(y - Y0) * PW + x] = rawHeight(x + 0.5, y + 0.5);
  }
  return grid;
};

/** The land's height (0 the plain, about 1 a summit) at map pixel (x, y). */
export function height(x, y) {
  const xi = Math.max(0, Math.min(PW - 1, Math.floor(x))), yi = Math.min(PH - 1, Math.floor(y));
  if (yi < Y0) return 0;
  return heights()[(yi - Y0) * PW + xi];
}

/** Which terrace (0 the plain) the point at map pixel (x, y) is on. */
export const level = (x, y) => Math.floor(height(x, y) / STEP);

/** Above this the trees give out to bare rock. */
export const TREELINE = 1.22;

/** How the light falls on the slope at (x, y): about -1 in shadow to 1
 *  facing the light, which comes from the north-west and above. */
export function light(x, y) {
  const d = 6;
  const gx = (height(x + d, y) - height(x - d, y)) / (2 * d / T), gy = (height(x, y + d) - height(x, y - d)) / (2 * d / T);
  return Math.max(-1, Math.min(1, (gx + gy) * -5));
}

/** What the ground is at (x, y) where terraces meet: the rock face of a
 *  cliff (how far down it, 0–1), the shadow at a cliff's foot, the lip of
 *  grass along a terrace's top — or nothing. */
export function cliff(x, y) {
  if (y < Y0) return null;
  const here = level(x, y);
  for (let d = 1; d <= CLIFF; d++) if (level(x, y - d) > here) return { face: (CLIFF - d) / CLIFF };
  for (let d = CLIFF + 1; d <= CLIFF + 3; d++) if (level(x, y - d) > here) return { shadow: 1 - (d - CLIFF) / 4 };
  if (level(x, y + 1) < here || level(x - 1, y) < here || level(x + 1, y) < here) return { lip: true };
  return null;
}

/** Wooden ladders up the cliffs, one every LADDER_EVERY tiles or so along
 *  each: their columns. */
const LADDER_EVERY = 6;
const isLadder = (tx) => (tx * 7 + 3) % LADDER_EVERY === 0;

/** Mark the cliffs' tiles as blocking — where the face crosses a tile's
 *  middle — except where `open(tx, ty)` (a road, a tomb's grounds) or a
 *  ladder climbs it. Returns the ladders' tiles, for drawing them and
 *  keeping trees off them. */
export function markCliffs(solid, open) {
  const ladders = [];
  for (let ty = Math.floor(Y0 / T); ty < solid.length; ty++) for (let tx = 0; tx < solid[ty].length; tx++) {
    if (solid[ty][tx] || open(tx, ty)) continue;
    if (cliff(tx * T + 8, ty * T + 8)?.face === undefined) continue;
    if (isLadder(tx)) ladders.push([tx, ty]);
    else solid[ty][tx] = true;
  }
  return ladders;
}

/** A wooden ladder down the cliff faces in a ladder tile: two rails and
 *  rungs, over the rock wherever the face is. */
export function drawLadder(ground, tx, ty, drawn) {
  drawn?.push({ type: 'ladder', tx, ty, x: tx * T, y: ty * T - 4 });
  const x0 = tx * T + 4, x1 = tx * T + 11;
  for (let y = ty * T - 4; y < (ty + 1) * T + 4; y++) {
    if (cliff(tx * T + 8, y)?.face === undefined) continue;
    ground.set(x0, y, [104, 70, 44]); ground.set(x0 + 1, y, [140, 98, 62]);
    ground.set(x1, y, [104, 70, 44]); ground.set(x1 - 1, y, [140, 98, 62]);
    if (y % 3 === 0) for (let x = x0 + 2; x < x1 - 1; x++) ground.set(x, y, [168, 122, 80]);
    ground.set(x1 + 1, y + 1, [0, 0, 0], 0.25);
  }
}
