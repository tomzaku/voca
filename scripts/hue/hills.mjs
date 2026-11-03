// The hills where the emperors lie: a height for every point south of the
// city. A highland, its front a tall cliff of rock over the valley where
// the tombs' road runs; mesas of rock stand higher on it — each tomb up on
// one of its own, its stairs climbing the cliff — and past the road the
// mountains rise to the map's edge.
//
// A cliff shows where the land steps up: its rock face on the south side,
// towards you, grass hanging over its lip and a shadow at its foot. Where
// land steps up away from you, only a band of shade shows. Pines grow on the terraces right up to the
// summits (fill/greenery.mjs), as they do on the hills round the tombs —
// the green only deepening as the land climbs.

import { noise } from './core/canvas.mjs';
import { H, HILLS_Y, PH, PW, T } from './layout.mjs';

/** The tomb hills come in a few big levels, the way a pixel-art map shows
 *  height — not a slope of thin terraces. The highland the tombs stand on
 *  (HIGH), its front a tall rock cliff above the valley the tombs' road
 *  runs along; rock mesas standing higher on it (TOP); and the mountains
 *  rising past the road along the map's southern edge. A level is a whole
 *  number of STEPs, so each change of level is one cliff. */
const HIGH = 0.96, TOP = 1.92;
/** Where each tomb's wall is, the cliff runs straight at TOMB_FRONT (tiles)
 *  so the wall stands on it; between the tombs it wanders. */
const TOMB_SPANS = [[1, 21], [25, 44], [69, 91]];
const TOMB_FRONT = 110;
/** Rock mesas on the highland: [x0, y0, x1, y1] in tiles, edges roughened. */
const MESAS = [[46, 93, 61, 104], [94, 92, 117, 105]];
/** Each tomb stands up on a mesa of its own, a little wider than its walls,
 *  its front straight along TOMB_FRONT so the stairs climb one clean cliff:
 *  Tự Đức's, Khải Định's, Minh Mạng's. */
const TOMB_MESAS = [[1, 92.6, 20.6], [25.6, 87.6, 43.4], [68.8, 88.6, 90.2]];
/** The highland's back edge, towards the city (its slope faces away). */
const BACK_Y = 91.5;
/** The mountains past the road start about here. */
const RANGE_Y = 118.6;
/** How much height makes one level, and how tall (map px) a cliff face is
 *  in the hills — two tiles of rock — and on Ngự Bình's terraces. */
const STEP = 0.24, CLIFF = 26, CLIFF_NB = 12;
/** The steps between one hill level and the next. */
const LEVEL_STEPS = Math.round(HIGH / STEP);
/** How wide (map px) the rock shows down a level's east and west edges. */
const SIDE = 6;

/** The row (tiles) the highland's cliff stands on, at column tx. */
function frontY(tx) {
  let d = Infinity;
  for (const [a, b] of TOMB_SPANS) d = Math.min(d, tx < a ? a - tx : tx > b ? tx - b : 0);
  const wander = 0.6 + Math.sin(tx * 0.42) * 0.7 + (noise(tx * T, 3, 50) - 0.5) * 1.4;
  return TOMB_FRONT + wander * smooth(0, 3, d);
}
/** Ngự Bình, the "royal screen" the Citadel faces across the river: a
 *  long, flat-topped hill standing on its own in the plain north of the
 *  range, higher than the tombs' plateaus — its summit [x0, y0, x1, y1] in
 *  tiles, level at `top`, the land falling from its edge over `fall` tiles
 *  in terraces. Stone stairs climb its north face (roads.mjs) to the
 *  pavilion on top (places/southBank.mjs). */
export const NGU_BINH = { x0: 51, y0: 87.5, x1: 63, y1: 90.5, top: 1.2, fall: 5 };
/** The terrain starts here (tiles): Ngự Bình's foot, above the range's. */
const TOP_Y = 81;

const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Ngự Bình's height at tile (tx, ty): its summit, then the slopes, the
 *  edge wandering a little so the terraces aren't drawn with a compass. */
function nguBinh(tx, ty, x, y) {
  const { x0, y0, x1, y1, top, fall } = NGU_BINH;
  const dx = Math.max(x0 - tx, 0, tx - x1), dy = Math.max(y0 - ty, 0, ty - y1);
  const d = Math.hypot(dx, dy) + (dx || dy ? (noise(x, y, 40) - 0.5) * 1.6 : 0);
  return top * (1 - smooth(0, fall, d));
}

function rawHeight(x, y) {
  const tx = x / T, ty = y / T;
  const nb = nguBinh(tx, ty, x, y);
  if (ty < HILLS_Y - 4) return nb;
  const rough = (noise(x, y, 24) - 0.5) * 1.6;
  let h = 0;
  if (ty > BACK_Y + rough * 0.6 && ty < frontY(tx)) h = HIGH;
  for (const [x0, y0, x1, y1] of MESAS) {
    if (tx > x0 + rough && tx < x1 - rough && ty > y0 + rough && ty < y1 + rough * 0.5) h = TOP;
  }
  for (const [x0, y0, x1] of TOMB_MESAS) {
    if (tx > x0 + rough * 0.3 && tx < x1 - rough * 0.3 && ty > y0 + rough * 0.4 && ty < TOMB_FRONT) h = TOP;
  }
  if (ty > RANGE_Y + Math.sin(tx * 0.3) * 0.8 + rough) h = ty > RANGE_Y + 2.4 + rough ? TOP : HIGH;
  return Math.max(nb, h);
}

// Worked out once, a value per map pixel from the hills down.
const Y0 = TOP_Y * T;
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

/** How the light falls on the slope at (x, y): about -1 in shadow to 1
 *  facing the light, which comes from the north-west and above. */
export function light(x, y) {
  if (y >= (HILLS_Y - 4) * T) return 0;                 // level ground; its cliffs are drawn as cliffs
  const d = 6;
  const gx = (height(x + d, y) - height(x - d, y)) / (2 * d / T), gy = (height(x, y + d) - height(x, y - d)) / (2 * d / T);
  return Math.max(-1, Math.min(1, (gx + gy) * -5));
}

/** What the ground is at (x, y) where terraces meet: the rock face of a
 *  cliff (how far down it, 0–1), the shadow at a cliff's foot, the lip of
 *  grass along a terrace's top, the shade below a step facing away — or
 *  nothing. */
export function cliff(x, y) {
  if (y < Y0) return null;
  const here = level(x, y);
  // The face is as tall as the drop: a mesa falling straight to the valley
  // (two levels) shows twice the rock of a single step.
  const base = y >= (HILLS_Y - 2) * T ? CLIFF : CLIFF_NB;
  for (let d = 1; d <= base * 2 + 5; d++) {
    const above = level(x, y - d);
    if (above <= here) continue;
    const C = base === CLIFF ? Math.round(base * Math.min(2, Math.max(1, (above - here) / LEVEL_STEPS))) : base;
    if (d <= C) return { face: (C - d) / C, d: d / C, h: C };
    if (d <= C + 5) return { shadow: 1 - (d - C) / 6 };
    break;
  }
  // Beside a higher level's east or west edge, the edge of its rock shows,
  // turned half away — a narrow band, in shade, so a mesa reads as a block.
  if (y >= (HILLS_Y - 2) * T) for (let d = 1; d <= SIDE; d++) {
    if (level(x - d, y) > here || level(x + d, y) > here) return { side: 1 - (d - 1) / SIDE, d: d / SIDE };
  }
  if (level(x, y + 1) < here || level(x - 1, y) < here || level(x + 1, y) < here) return { lip: true };
  // Where the land steps up to the south, the step's face is turned away
  // from you — only a band of shade at its foot shows, so a slope facing
  // the city still reads as terraces.
  for (let d = 1; d <= 4; d++) if (level(x, y + d) > here) return { back: 1 - (d - 1) / 4 };
  return null;
}

/** Wooden ladders up the cliffs, one every LADDER_EVERY tiles or so along
 *  each: their columns. */
const LADDER_EVERY = 9;
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
  // Wooden stairs, really: treads between two rails.
  const x0 = tx * T + 3, x1 = tx * T + 12;
  for (let y = ty * T - 4; y < (ty + 1) * T + 4; y++) {
    if (cliff(tx * T + 8, y)?.face === undefined) continue;
    for (let x = x0 + 1; x < x1; x++) ground.set(x, y, y % 3 === 0 ? [206, 160, 106] : y % 3 === 1 ? [158, 112, 72] : [92, 62, 40]);
    ground.set(x0, y, [64, 42, 28]); ground.set(x1, y, [64, 42, 28]);
    ground.set(x1 + 1, y + 1, [0, 0, 0], 0.25);
  }
}
