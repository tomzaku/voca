#!/usr/bin/env node
// Generates the Huế world template: public/game/maps/hue.tmj plus the images
// it paints with — hue-ground.png (everything, under the buddy), hue-over.png
// (roofs, tower tops and tree crowns, drawn over the buddy so it can walk
// behind them) and hue-night.png (bridge lights, shown only in dark mode —
// Trường Tiền's six spans each glow their own colour). Every pixel is drawn here in code; there is no tileset
// art to license or keep in sync.
//
//   node scripts/generate-hue-map.mjs [preview.png]
//
// The optional preview composites both layers with station slots marked, for
// checking a change without starting the app.
//
// Same contract as every world template (see src/game/scenes/WorldScene.ts):
//   - `walls` tile layer — any tile blocks movement (hidden, collision only)
//   - `meta` object layer — `spawn`, `label`, and `station` points with a
//     `region` (public | system | feature) and `slot`. Feature stations here
//     also name their `feature` id and a `place`, so the building a page lives
//     in is decided by the map, not by list order.
// Plus two image layers, `ground` and `over`, which WorldScene draws below and
// above the buddy.
//
// The city, north → south, with the Hương River flowing west → east through it:
//
//   NORTH BANK   Thiên Mụ pagoda (Review) · the Citadel, its moat, Kỳ Đài flag
//                tower and Ngọ Môn gate, with the seven level halls inside ·
//                Đông Ba market (Learn) · Tịnh Tâm lotus lake · Gia Hội houses
//   RIVER        four bridges, each drawn after its real signature — Nguyễn
//                Hoàng (one imperial-yellow arch on V piers), Dã Viên (across
//                Dã Viên islet), Phú Xuân (plain concrete spans and lamps),
//                Trường Tiền (six silver arches) · Cồn Hến islet (Speak) ·
//                a moored dragon boat by its pier (Listening)
//   SOUTH BANK   Quốc Học school (Quizzes) · Ngự Bình hill (Level test) ·
//                Khải Định tomb (History) · your home (Buddy) · eight garden
//                houses for your collections
//
// Deliberately quiet: one muted palette, no animated scenery, and only the
// landmarks you can enter get strong colour.

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const W = 80; // map size in tiles
const H = 56;
const T = 16; // tile size px (WorldScene draws the map at 2×)
const PW = W * T;
const PH = H * T;

const MAPS = new URL('../public/game/maps/', import.meta.url);
const mapFile = (name) => fileURLToPath(new URL(name, MAPS));

// Deterministic PRNG (mulberry32) so regeneration is stable.
let seed = 1802; // the year Huế became the capital
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** Stable per-pixel hash in [0, 1), for texture that doesn't depend on draw order. */
const hash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Smooth value noise in [0, 1) at feature size `s` px. */
const noise = (x, y, s) => {
  const gx = x / s, gy = y / s;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// ── Palette ── muted on purpose; saturated colour is kept for landmarks.
const P = {
  grass: [124, 166, 100], grassLight: [131, 172, 105], grassDark: [117, 159, 95],
  fleckLight: [146, 184, 114], fleckDark: [104, 144, 86],
  dirt: [214, 194, 156], dirtEdge: [186, 164, 128], dirtSpeck: [199, 178, 140],
  stone: [204, 198, 186], stoneJoint: [184, 178, 166], stoneEdge: [158, 152, 142],
  water: [88, 152, 154], waterDeep: [74, 137, 144], waterShallow: [114, 172, 168], glint: [170, 212, 204],
  embank: [178, 172, 160], embankDark: [126, 120, 110],
  lotusPad: [94, 146, 88], lotusPad2: [112, 160, 98], lotus: [236, 150, 178],
  wallTop: [156, 146, 124], wallFace: [118, 108, 94], wallLine: [96, 88, 76], moss: [112, 132, 92],
  shadow: [24, 40, 36],
};

// Roof palettes: base, tile line, eave highlight, eave shadow, ridge.
const ROOF = {
  imperial: { base: [226, 178, 64], line: [204, 154, 50], light: [244, 206, 116], eave: [146, 98, 40], ridge: [178, 116, 38] },
  glazed:   { base: [96, 142, 122], line: [84, 126, 108], light: [128, 170, 148], eave: [54, 88, 76], ridge: [68, 106, 90] },
  dark:     { base: [114, 100, 90], line: [98, 86, 78], light: [142, 126, 112], eave: [70, 60, 54], ridge: [84, 72, 64] },
  terra:    { base: [170, 104, 76], line: [150, 90, 66], light: [194, 130, 98], eave: [108, 62, 46], ridge: [126, 72, 52] },
  moss:     { base: [118, 122, 98], line: [104, 108, 86], light: [144, 148, 120], eave: [72, 76, 60], ridge: [86, 90, 70] },
  slate:    { base: [94, 94, 104], line: [82, 82, 92], light: [120, 120, 130], eave: [56, 56, 64], ridge: [68, 68, 76] },
  plum:     { base: [120, 92, 104], line: [104, 80, 92], light: [146, 116, 128], eave: [72, 54, 62], ridge: [88, 66, 76] },
};

// ── A tiny RGBA canvas ──
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, c, a = 1) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4, d = this.d;
    if (a >= 1) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return; }
    const da = d[i + 3] / 255, oa = a + da * (1 - a);
    for (let k = 0; k < 3; k++) d[i + k] = (c[k] * a + d[i + k] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }
  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  rect(x, y, w, h, c, a = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  ellipse(cx, cy, rx, ry, c, a = 1) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
      }
    }
  }
  /** Composite `src` at (dx, dy); `rows` limits which source rows are copied. */
  blit(src, dx, dy, rows = [0, src.h]) {
    for (let y = rows[0]; y < rows[1]; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        const a = src.d[i + 3];
        if (a) this.set(dx + x, dy + y, [src.d[i], src.d[i + 1], src.d[i + 2]], a / 255);
      }
    }
  }
  png(file) {
    return sharp(Buffer.from(this.d.buffer), { raw: { width: this.w, height: this.h, channels: 4 } })
      .png({ compressionLevel: 9, palette: false })
      .toFile(file);
  }
}

// ── Layout (tile units) ──

// River banks as smooth curves (px). The north bank stays clear of the road;
// the south bank swells a little around Cồn Hến.
const ISLET = { cx: 69.5 * T, cy: 29.7 * T, rx: 5.5 * T, ry: 1.8 * T };    // Cồn Hến
const DA_VIEN = { cx: 20.5 * T, cy: 29.5 * T, rx: 4.6 * T, ry: 1.3 * T };  // Dã Viên islet
const ISLETS = [ISLET, DA_VIEN];
const northEdge = (x) => 26 * T + 0.35 * T * (1 + Math.sin(x / (9 * T) + 0.4));
const southEdge = (x) => Math.min(
  32.95 * T,
  32.1 * T + 0.35 * T * Math.sin(x / (11 * T) + 1) + 0.7 * T * Math.exp(-(((x - ISLET.cx) / (6 * T)) ** 2)),
);
const isletE = (i, x, y) => ((x - i.cx) / i.rx) ** 2 + ((y - i.cy) / i.ry) ** 2;
const onIslet = (x, y) => ISLETS.some((i) => isletE(i, x, y) <= 1);

// The Citadel: moat ring, wall ring, interior — centred on x = 32 tiles.
const MOAT = { x0: 17, y0: 1, x1: 47, y1: 24 };     // outer edge, exclusive
const WALL = { x0: 18, y0: 2, x1: 46, y1: 23 };
const GATES = [23, 39];                              // left column of each 2-wide south gate
const BASTION = { x0: 29, x1: 35, y0: 22, y1: 24 };  // Kỳ Đài, in the wall + moat line

const LAKES = [
  { kind: 'ellipse', cx: 56 * T, cy: 7.5 * T, rx: 6 * T, ry: 3.2 * T },  // Tịnh Tâm
  { kind: 'rect', x: 23, y: 10, w: 4, h: 3 },                            // palace lotus ponds
  { kind: 'rect', x: 37, y: 10, w: 4, h: 3 },
];

const inMoat = (x, y) => {
  const tx = x / T, ty = y / T;
  const outer = tx >= MOAT.x0 && tx < MOAT.x1 && ty >= MOAT.y0 && ty < MOAT.y1;
  const inner = tx >= WALL.x0 && tx < WALL.x1 && ty >= WALL.y0 && ty < WALL.y1;
  const bastion = tx >= BASTION.x0 && tx < BASTION.x1 && ty >= BASTION.y0;
  return outer && !inner && !bastion;
};
const inLake = (x, y) => LAKES.some((l) => l.kind === 'ellipse'
  ? ((x - l.cx) / l.rx) ** 2 + ((y - l.cy) / l.ry) ** 2 <= 1
  : x >= l.x * T && x < (l.x + l.w) * T && y >= l.y * T && y < (l.y + l.h) * T);
const inRiver = (x, y) => y > northEdge(x) && y < southEdge(x) && !onIslet(x, y);
const isWater = (x, y) => inRiver(x, y) || inMoat(x, y) || inLake(x, y);

// Paved surfaces: [x, y, w, h, material] in tiles. Purely visual — anything
// that isn't a wall is walkable — but they show where the city expects you.
const ROADS = [
  // North bank
  [0, 24, 80, 2, 'dirt'],          // riverside road
  [3, 22, 13, 2, 'stone'],         // Thiên Mụ forecourt
  [49, 22, 14, 2, 'stone'],        // Đông Ba forecourt
  [19, 20, 26, 2, 'stone'],        // esplanade inside the south wall
  [31, 12, 2, 8, 'stone'],         // the imperial axis, up to Thái Hòa
  [20, 12, 24, 1, 'stone'],        // cross walk in front of Thái Hòa
  [21, 8, 2, 4, 'stone'], [41, 8, 2, 4, 'stone'],
  [20, 18, 4, 2, 'stone'], [40, 18, 4, 2, 'stone'],
  [23, 22, 2, 2, 'stone'], [39, 22, 2, 2, 'stone'], // through the gates
  [47, 14, 3, 10, 'dirt'],         // up past the moat to the lake
  [48, 11, 16, 2, 'dirt'],
  [62, 22, 18, 2, 'dirt'],         // Gia Hội lane
  // South bank
  [0, 33, 80, 2, 'stone'],         // Lê Lợi riverside promenade
  [14, 42, 66, 2, 'dirt'],         // the inland street
  [48, 49, 32, 2, 'dirt'],         // garden-house lane
  [47, 35, 3, 16, 'dirt'],         // on from Trường Tiền
  [26, 35, 3, 7, 'dirt'],          // on from Phú Xuân
  [15, 35, 2, 20, 'dirt'],         // west road down to the tombs
  [2, 52, 15, 2, 'dirt'],          // tomb approach
  [34, 41, 12, 1, 'stone'],        // Quốc Học forecourt
];

// ── Canvases and collision ──
const ground = new Canvas(PW, PH);
const over = new Canvas(PW, PH);
/** Lights that only show in dark mode, added on top of the dimmed map. */
const night = new Canvas(PW, PH);
/** A soft light: a bright core with a halo around it. */
const glow = (x, y, c, r = 2) => {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy);
      if (d <= r) night.set(x + dx, y + dy, c, d < 1 ? 1 : 0.35 * (1 - d / (r + 1)));
    }
  }
};
/** Tiles that block movement, beyond water (which is derived per pixel). */
const solid = Array.from({ length: H }, () => new Array(W).fill(false));
/** Tiles that are walkable whatever lies under them (bridges, pier). */
const deck = Array.from({ length: H }, () => new Array(W).fill(false));
/** Tiles something is already built on — keeps scattered trees out of the way. */
const used = Array.from({ length: H }, () => new Array(W).fill(false));
const mark = (grid, x, y, w, h, v = true) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (grid[j]?.[i] !== undefined) grid[j][i] = v;
};
for (const [x, y, w, h] of ROADS) mark(used, x - 1, y - 1, w + 2, h + 2);

// ── 1. Grass ──
for (let y = 0; y < PH; y++) {
  for (let x = 0; x < PW; x++) {
    const n = noise(x, y, 40) * 0.7 + noise(x, y, 11) * 0.3;
    let c = n < 0.38 ? P.grassDark : n > 0.62 ? P.grassLight : P.grass;
    const h = hash(x, y);
    if (h < 0.006) c = P.fleckLight;
    else if (h < 0.011) c = P.fleckDark;
    ground.set(x, y, c);
  }
}

// ── 2. Roads ──
const paintRoad = (tx, ty, tw, th, mat) => {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let c;
      if (mat === 'stone') {
        const joint = (y % 8 === 0) || ((x + (Math.floor(y / 8) % 2) * 6) % 12 === 0);
        c = joint ? P.stoneJoint : mix(P.stone, P.stoneJoint, hash(x, y) * 0.25);
      } else {
        c = hash(x, y) < 0.05 ? P.dirtSpeck : mix(P.dirt, P.dirtSpeck, noise(x, y, 6) * 0.5);
      }
      ground.set(x, y, c);
    }
  }
};
for (const r of ROADS) paintRoad(...r);
// Soft edges where a road meets grass: one darker pixel line.
{
  const isRoad = (x, y) => ROADS.some(([tx, ty, tw, th]) =>
    x >= tx * T && x < (tx + tw) * T && y >= ty * T && y < (ty + th) * T);
  const roadMask = new Uint8Array(PW * PH);
  for (const [tx, ty, tw, th] of ROADS) {
    for (let y = ty * T; y < (ty + th) * T; y++) for (let x = tx * T; x < (tx + tw) * T; x++) roadMask[y * PW + x] = 1;
  }
  for (let y = 1; y < PH - 1; y++) {
    for (let x = 1; x < PW - 1; x++) {
      if (!roadMask[y * PW + x]) continue;
      if (!roadMask[y * PW + x - 1] || !roadMask[y * PW + x + 1] || !roadMask[(y - 1) * PW + x] || !roadMask[(y + 1) * PW + x]) {
        ground.set(x, y, P.dirtEdge, 0.7);
      }
    }
  }
  void isRoad;
}

// ── 3. Water: river, moat, lakes ──
const waterMask = new Uint8Array(PW * PH);
for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (isWater(x + 0.5, y + 0.5)) waterMask[y * PW + x] = 1;
const wet = (x, y) => x >= 0 && y >= 0 && x < PW && y < PH && waterMask[y * PW + x] === 1;
/** Distance (px, capped) to the nearest dry pixel — drives the shallows. */
const shoreDist = (x, y, cap = 6) => {
  for (let r = 1; r <= cap; r++) {
    if (!wet(x - r, y) || !wet(x + r, y) || !wet(x, y - r) || !wet(x, y + r)) return r;
  }
  return cap + 1;
};
for (let y = 0; y < PH; y++) {
  for (let x = 0; x < PW; x++) {
    if (!wet(x, y)) continue;
    const d = shoreDist(x, y);
    let c = d <= 2 ? P.waterShallow : d <= 5 ? P.water : mix(P.water, P.waterDeep, noise(x, y, 30));
    ground.set(x, y, c);
  }
}
// Embankment: a stone lip on every dry pixel touching water, darker below.
for (let y = 0; y < PH; y++) {
  for (let x = 0; x < PW; x++) {
    if (wet(x, y)) continue;
    const near = wet(x, y + 1) || wet(x, y - 1) || wet(x + 1, y) || wet(x - 1, y);
    const near2 = wet(x, y + 2) || wet(x, y - 2) || wet(x + 2, y) || wet(x - 2, y);
    if (near) ground.set(x, y, wet(x, y + 1) ? P.embankDark : P.embank);
    else if (near2) ground.set(x, y, P.embank, 0.6);
  }
}
// A few slow glints — sparse, so the water reads as calm.
for (let i = 0; i < 260; i++) {
  const x = Math.floor(rand() * PW), y = Math.floor(rand() * PH);
  const len = 3 + Math.floor(rand() * 5);
  if (!wet(x, y) || !wet(x + len, y) || shoreDist(x, y) < 4) continue;
  for (let k = 0; k < len; k++) ground.set(x + k, y, P.glint, k === 0 || k === len - 1 ? 0.4 : 0.75);
}
// Lotus: pads and a few pink flowers on the moat, the ponds and Tịnh Tâm.
const lotusAt = (x, y) => {
  ground.ellipse(x, y, 3, 2, rand() < 0.5 ? P.lotusPad : P.lotusPad2);
  ground.set(x + 1, y - 1, P.fleckDark);
  if (rand() < 0.35) { ground.rect(x - 1, y - 2, 2, 2, P.lotus); ground.set(x, y - 3, [250, 196, 210]); }
};
for (let i = 0; i < 2600; i++) {
  const x = Math.floor(rand() * PW), y = Math.floor(rand() * PH);
  if (!(inMoat(x, y) || inLake(x, y)) || shoreDist(x, y, 4) < 3) continue;
  if (hash(Math.floor(x / 20), Math.floor(y / 20)) < 0.45) continue; // clumps, not carpet
  if (rand() < 0.25) lotusAt(x, y);
}

// ── 4. Islets: Cồn Hến and Dã Viên ──
for (let y = 0; y < PH; y++) {
  for (let x = 0; x < PW; x++) {
    const isl = ISLETS.find((i) => isletE(i, x + 0.5, y + 0.5) <= 1);
    if (!isl) continue;
    const e = isletE(isl, x + 0.5, y + 0.5);
    ground.set(x, y, e > 0.82 ? [206, 190, 150] : mix(P.grass, P.grassLight, noise(x, y, 9)));
  }
}

// ── 5. Bridges, pier, boat ──
function plainBridge(tx, tw, y0, y1, deckC, railC) {
  const x0 = tx * T, x1 = (tx + tw) * T;
  for (let y = y0; y < y1; y++) {
    ground.set(x1, y + 2, P.shadow, 0.35);       // shadow on the water, east side
    ground.set(x1 + 1, y + 2, P.shadow, 0.2);
    for (let x = x0; x < x1; x++) {
      const edge = x === x0 || x === x1 - 1;
      ground.set(x, y, edge ? railC : (y % 6 === 0 ? mix(deckC, railC, 0.3) : deckC));
    }
  }
  mark(deck, tx, Math.floor(y0 / T), tw, Math.ceil(y1 / T) - Math.floor(y0 / T));
}

/** Street lamps along both rails: a short post rising from the rail (drawn
 *  upward, as height reads in this view) with a warm head. */
function lamps(x0, x1, y0, y1, step) {
  for (let y = y0 + step / 2; y < y1 - 4; y += step) {
    for (const x of [x0, x1 - 1]) {
      ground.rect(x, y - 5, 1, 5, [86, 86, 92]);
      ground.rect(x - 1, y - 7, 3, 2, [250, 222, 150]);
      glow(x, y - 6, [255, 214, 140], 3);
    }
  }
}

// Phú Xuân: the plain one — even concrete spans on square piers, sidewalks
// along both edges and a steady line of lamps.
{
  const tx = 26, tw = 3, y0 = 25.6 * T, y1 = 33.2 * T;
  const x0 = tx * T, x1 = (tx + tw) * T;
  for (let y = northEdge(x0) + 8; y < southEdge(x0) - 4; y += 18) {
    ground.rect(x0 - 3, y, 3, 5, [150, 146, 140]);   // pier heads either side
    ground.rect(x1, y, 3, 5, [150, 146, 140]);
    ground.rect(x1 + 3, y + 2, 3, 5, P.shadow, 0.25);
  }
  plainBridge(tx, tw, y0, y1, [192, 188, 180], [150, 146, 140]);
  for (let y = y0; y < y1; y++) {
    ground.rect(x0 + 1, y, 3, 1, [212, 208, 200]);  // sidewalks
    ground.rect(x1 - 4, y, 3, 1, [212, 208, 200]);
  }
  lamps(x0, x1, y0, y1, 16);
}

// Dã Viên: a long concrete deck that touches down on Dã Viên islet midstream —
// the islet showing on both sides is what makes it this bridge.
{
  const tx = 19, tw = 3, y0 = 25.6 * T, y1 = 33.2 * T;
  const x0 = tx * T, x1 = (tx + tw) * T;
  plainBridge(tx, tw, y0, y1, [184, 182, 176], [120, 126, 134]);
  for (let y = y0; y < y1; y++) {
    if (Math.floor(y) % 10 === 0) ground.rect(x0 + 2, y, tw * T - 4, 1, [168, 166, 160]); // expansion joints
  }
  lamps(x0, x1, y0, y1, 22);
}

// Nguyễn Hoàng: the new crossing by Thiên Mụ — a wide deck under one great
// arch in imperial yellow, hung on cables, standing on V-shaped piers.
{
  const tx = 11, tw = 4, y0 = 25.4 * T, y1 = 33.3 * T;
  const x0 = tx * T, x1 = (tx + tw) * T, cx = (x0 + x1) / 2;
  // V piers in the water, either side of the deck.
  for (const py of [northEdge(cx) + 22, (northEdge(cx) + southEdge(cx)) / 2, southEdge(cx) - 26]) {
    for (const [sx, dir] of [[x0 - 2, -1], [x1 + 1, 1]]) {
      for (let k = 0; k < 5; k++) {
        ground.set(sx + dir * k, py - k, [220, 196, 120]);
        ground.set(sx + dir * k, py + k, [220, 196, 120]);
        ground.set(sx + dir * k, py + k + 1, [168, 140, 76]);
      }
    }
  }
  plainBridge(tx, tw, y0, y1, [116, 118, 124], [212, 184, 96]);
  for (let y = y0; y < y1; y++) {
    ground.rect(x0 + 1, y, 6, 1, [206, 200, 188]);              // walkways
    ground.rect(x1 - 7, y, 6, 1, [206, 200, 188]);
    if (Math.floor(y) % 8 < 4) ground.set(cx - 7, y, [236, 236, 230]); // lane dashes
    if (Math.floor(y) % 8 < 4) ground.set(cx + 6, y, [236, 236, 230]);
    ground.rect(cx - 1, y, 2, 1, [96, 98, 104]);                 // median
  }
  // The arch springs from the median at both banks and leans out west over
  // the water, so its full sweep reads from above. Cables hang back to the deck.
  const gold = [232, 186, 64], goldLight = [250, 222, 128], goldDark = [176, 126, 40];
  const ay0 = y0 + 6, ay1 = y1 - 6, reach = 66;
  for (let y = ay0; y <= ay1; y++) {
    const t = (y - ay0) / (ay1 - ay0);
    const ax = cx - Math.sin(t * Math.PI) * reach;
    if (Math.floor(y) % 5 === 0 && ax < cx - 2) {
      for (let x = Math.ceil(ax) + 3; x < cx; x++) ground.set(x, y, [236, 232, 220], 0.4);
    }
    ground.set(ax - 1, y, goldDark);
    ground.set(ax, y, gold);
    ground.set(ax + 1, y, goldLight);
    if (Math.floor(y) % 2 === 0) glow(ax, y, [255, 200, 90], 2);
    ground.set(ax + 2, y, gold);
    ground.set(ax - 2, y, goldDark);
    ground.set(ax - 4, y + 3, P.shadow, 0.25);
    ground.set(ax - 5, y + 3, P.shadow, 0.15);
  }
}

// Trường Tiền: the deck, flanked by six silver-white truss arches. By day
// it's all silver; at night its lighting gives each span its own colour.
{
  const tx = 47, tw = 3;
  const x0 = tx * T, x1 = (tx + tw) * T;
  const y0 = 25.4 * T, y1 = 33.3 * T;
  plainBridge(tx, tw, y0, y1, [172, 168, 160], [132, 130, 126]);
  const spans = 6, spanLen = (y1 - y0) / spans;
  const steel = [226, 232, 236], steelShade = [158, 170, 180];
  // Huế purple first, then round the colour wheel, one per span.
  const spanLights = [[186, 120, 255], [96, 140, 255], [64, 214, 240], [96, 236, 150], [255, 220, 90], [255, 120, 180]];
  for (const side of [-1, 1]) {
    const base = side < 0 ? x0 - 1 : x1;
    for (let s = 0; s < spans; s++) {
      const sy = y0 + s * spanLen;
      for (let k = 0; k <= spanLen; k++) {
        // Arch bulging outward, drawn in oblique so it reads from above.
        const t = k / spanLen;
        const bulge = Math.round(Math.sin(t * Math.PI) * 6);
        const x = base + side * bulge;
        ground.set(x, sy + k, steel);
        ground.set(x + side, sy + k, steelShade);
        glow(x, sy + k, spanLights[s], k % 3 === 0 ? 2 : 1);
        night.set(x + side, sy + k, spanLights[s]);
        // Lattice: diagonals from the deck rail out to the arch.
        if (k % 4 === 0) for (let b = 0; b < bulge; b++) ground.set(base + side * b, sy + k + (b % 2), steelShade, 0.85);
      }
      ground.rect(base - 1, Math.floor(sy) - 1, 3, 3, steelShade); // pier cap where arches meet
    }
    for (let y = y0; y < y1; y++) ground.set(base, y, steel);   // rail chord
  }
}

// Cồn Hến footbridge: weathered planks, two tiles wide.
{
  const x0 = 67 * T, x1 = 69 * T, y0 = 25.8 * T, y1 = 28.9 * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const plank = Math.floor((y - y0) / 3) % 2 === 0;
      ground.set(x, y, x === x0 || x === x1 - 1 ? [106, 76, 50] : plank ? [160, 118, 78] : [146, 106, 70]);
    }
    ground.set(x1, y + 2, P.shadow, 0.3);
  }
  mark(deck, 67, 26, 2, 3);
}

// Dragon-boat pier.
{
  const x0 = 58 * T, x1 = 60 * T, y0 = 29 * T, y1 = 33 * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const plank = Math.floor((x - x0) / 4) % 2 === 0;
      ground.set(x, y, plank ? [162, 120, 80] : [148, 108, 72]);
    }
    ground.set(x1, y + 2, P.shadow, 0.3);
  }
  for (const [px, py] of [[x0, y0], [x1 - 2, y0], [x0, y1 - 6], [x1 - 2, y1 - 6]]) ground.rect(px, py, 2, 3, [96, 66, 44]);
  mark(deck, 58, 29, 2, 4);
}

// The dragon boat, moored west of the pier, bow (and dragon) facing west.
{
  const bx = 52 * T, by = 29.4 * T, bw = 88, bh = 18;
  // Hull.
  for (let x = 0; x < bw; x++) {
    const taper = x < 10 ? Math.round((10 - x) * 0.5) : x > bw - 8 ? Math.round((x - (bw - 8)) * 0.6) : 0;
    for (let y = 6 + taper; y < bh; y++) {
      ground.set(bx + x, by + y, y > bh - 4 ? [120, 40, 32] : y > bh - 7 ? [196, 160, 64] : [178, 52, 40]);
    }
  }
  ground.rect(bx + 6, by + bh, bw - 10, 2, P.shadow, 0.3);
  // Cabin with a little curved roof.
  ground.rect(bx + 24, by + 2, 40, 8, [150, 44, 36]);
  for (let x = 20; x < 68; x++) ground.set(bx + x, by + 1 + (x < 24 || x > 63 ? 0 : 1), ROOF.imperial.base);
  for (let x = 22; x < 66; x++) ground.set(bx + x, by, ROOF.imperial.light);
  for (let x = 28; x < 62; x += 6) ground.rect(bx + x, by + 4, 3, 4, [244, 214, 140]); // lanterns/windows
  // Dragon head and tail.
  ground.rect(bx - 6, by + 2, 6, 8, [196, 160, 64]);
  ground.rect(bx - 9, by + 4, 4, 3, [196, 160, 64]);
  ground.set(bx - 4, by + 4, [40, 30, 30]);
  ground.rect(bx - 3, by, 2, 2, [178, 52, 40]);
  ground.rect(bx + bw - 2, by + 4, 3, 3, [196, 160, 64]);
  ground.rect(bx + bw, by + 2, 2, 3, [196, 160, 64]);
}

// ── 6. Structures ──
// A structure is drawn into its own canvas, then split: rows from `solidFrom`
// down are its footprint (blocked, painted on the ground), rows above it are
// its upper part (painted again on `over`, so the buddy passes behind them).

/** A curved Vietnamese roof: tile stripes, upturned eaves and ridge ends. */
function roof(cv, x, y, w, h, pal, inset = Math.min(6, Math.floor(h * 0.5))) {
  for (let r = 0; r < h; r++) {
    const ins = Math.round(inset * (1 - r / Math.max(1, h - 1)));
    for (let c = ins; c < w - ins; c++) {
      let col = (c - ins) % 3 === 0 ? pal.line : pal.base;
      if (c < w / 2) col = mix(col, pal.light, 0.12);
      if (r === h - 2) col = pal.light;
      if (r === h - 1) col = pal.eave;
      cv.set(x + c, y + r, col);
    }
  }
  // Ridge with upturned ends.
  cv.rect(x + inset - 1, y - 2, w - 2 * inset + 2, 2, pal.ridge);
  cv.rect(x + inset - 3, y - 4, 2, 2, pal.ridge);
  cv.rect(x + w - inset + 1, y - 4, 2, 2, pal.ridge);
  // Upturned eave corners.
  cv.rect(x - 2, y + h - 3, 2, 2, pal.eave);
  cv.rect(x + w, y + h - 3, 2, 2, pal.eave);
  cv.set(x - 3, y + h - 4, pal.eave);
  cv.set(x + w + 2, y + h - 4, pal.eave);
}

/** The front wall of a building: colour, pillars, plinth, a door, windows. */
function facade(cv, x, y, w, h, o) {
  cv.rect(x, y, w, h, o.wall);
  cv.rect(x, y, w, 2, mix(o.wall, [0, 0, 0], 0.25)); // under-eave shade
  if (o.pillar) for (let px = x + 1; px < x + w; px += o.pillarStep ?? 8) cv.rect(px, y + 2, 2, h - 4, o.pillar);
  if (o.windows) {
    for (let wx = x + 5; wx + 4 < x + w - 4; wx += o.windowStep ?? 10) {
      if (Math.abs(wx + 2 - (x + w / 2)) < 8) continue; // keep the door clear
      cv.rect(wx, y + 4, 5, 5, o.windowFrame ?? [236, 226, 200]);
      cv.rect(wx + 1, y + 5, 3, 3, o.glass ?? [58, 66, 70]);
    }
  }
  cv.rect(x - 1, y + h - 2, w + 2, 2, o.plinth ?? [170, 162, 150]);
  if (o.door !== false) {
    const dw = o.doorW ?? 6, dh = Math.min(h - 3, o.doorH ?? 9);
    const dx = Math.round(x + w / 2 - dw / 2);
    cv.rect(dx - 1, y + h - 2 - dh - 1, dw + 2, dh + 1, o.doorFrame ?? [72, 44, 32]);
    cv.rect(dx, y + h - 2 - dh, dw, dh, o.doorFill ?? [44, 30, 26]);
  }
}

/** Soft drop shadow to the east and south of a footprint. */
function dropShadow(px, py, pw, ph) {
  for (let y = 0; y < ph; y++) for (let x = 0; x < 4; x++) ground.set(px + pw + x, py + y + 3, P.shadow, 0.22 - x * 0.04);
  for (let x = 0; x < pw; x++) for (let y = 0; y < 3; y++) ground.set(px + x + 3, py + ph + y, P.shadow, 0.2 - y * 0.05);
}

/**
 * Place a structure canvas with its top-left at tile (tx, ty). `solidRows`
 * tiles at the bottom block movement (minus `gaps`, walkable tile columns such
 * as a gate's arch); everything above them is drawn over the buddy as well.
 */
function place(cv, tx, ty, solidRows, { gaps = [], shadow = true } = {}) {
  const wT = Math.ceil(cv.w / T), hT = Math.ceil(cv.h / T);
  const solidFrom = hT - solidRows;
  if (shadow) dropShadow(tx * T, (ty + solidFrom) * T, cv.w, solidRows * T);
  ground.blit(cv, tx * T, ty * T);
  over.blit(cv, tx * T, ty * T, [0, solidFrom * T]);
  for (let j = solidFrom; j < hT; j++) {
    for (let i = 0; i < wT; i++) if (!gaps.includes(tx + i)) solid[ty + j][tx + i] = true;
  }
  mark(used, tx - 1, ty - 1, wT + 2, hT + 2);
}

/** A hall: roof over a facade. */
function hall({ w, h, roofRows, roofPal, wall, ...o }) {
  const cv = new Canvas(w * T, h * T);
  const roofH = roofRows * T;
  facade(cv, 2, roofH - 2, w * T - 4, h * T - roofH + 2, { wall, ...o });
  roof(cv, 2, 5, w * T - 4, roofH - 5, roofPal);
  return cv;
}

/** A hall with a second, smaller roof tier above the first. */
function palace({ w, h, roofPal, wall, pillar }) {
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const bodyY = Math.round(ph * 0.55);
  facade(cv, 3, bodyY, pw - 6, ph - bodyY, { wall, pillar, pillarStep: 7, doorW: 10, doorH: 14, doorFill: [60, 30, 24] });
  roof(cv, 2, Math.round(ph * 0.32), pw - 4, bodyY - Math.round(ph * 0.32), roofPal);
  // Upper tier: a band of red pillars, then a smaller roof.
  const upW = Math.round(pw * 0.62), upX = Math.round((pw - upW) / 2);
  const upY = Math.round(ph * 0.24);
  cv.rect(upX, upY, upW, Math.round(ph * 0.08) + 1, wall);
  for (let px = upX + 2; px < upX + upW - 1; px += 6) cv.rect(px, upY, 2, Math.round(ph * 0.08) + 1, pillar);
  roof(cv, upX - 2, 6, upW + 4, upY - 6, roofPal, 5);
  return cv;
}

// ── The Citadel: walls, gates, Kỳ Đài, Ngọ Môn and the halls ──

// Wall ring, with a crenellated top and a darker south-facing face.
for (let ty = WALL.y0; ty < WALL.y1; ty++) {
  for (let tx = WALL.x0; tx < WALL.x1; tx++) {
    const ring = ty === WALL.y0 || ty === WALL.y1 - 1 || tx === WALL.x0 || tx === WALL.x1 - 1;
    if (!ring) continue;
    const gate = ty === WALL.y1 - 1 && GATES.some((g) => tx === g || tx === g + 1);
    const bastion = ty === WALL.y1 - 1 && tx >= BASTION.x0 && tx < BASTION.x1;
    if (gate || bastion) continue;
    solid[ty][tx] = true;
    const horizontal = ty === WALL.y0 || ty === WALL.y1 - 1;
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        const px = tx * T + x, py = ty * T + y;
        let c;
        if (horizontal && y >= 9) {
          // Face: brick courses.
          c = (y % 3 === 0 || (x + (y % 6 < 3 ? 0 : 3)) % 6 === 0) ? P.wallLine : P.wallFace;
        } else {
          c = hash(px, py) < 0.08 ? P.moss : P.wallTop;
          if (horizontal && y < 2 && x % 4 < 2) c = P.wallFace;           // merlons
          if (!horizontal && (x < 2 || x > 13)) c = P.wallFace;
        }
        ground.set(px, py, c);
      }
    }
  }
}
// Moat bridges at the two south gates.
for (const g of GATES) {
  for (let y = (MOAT.y1 - 1) * T; y < MOAT.y1 * T; y++) {
    for (let x = g * T; x < (g + 2) * T; x++) ground.set(x, y, x === g * T || x === (g + 2) * T - 1 ? P.stoneEdge : P.stone);
  }
  mark(deck, g, MOAT.y1 - 1, 2, 1);
}
// Gate houses straddling the wall: a little yellow roof over each arch.
for (const g of GATES) {
  const cv = new Canvas(4 * T, 3 * T);
  cv.rect(0, 26, 64, 22, P.wallFace);
  for (let y = 26; y < 48; y += 3) for (let x = 0; x < 64; x++) if ((x + y) % 6 === 0) cv.set(x, y, P.wallLine);
  cv.rect(17, 30, 30, 18, [40, 32, 28]);         // arch
  cv.rect(19, 28, 26, 2, [40, 32, 28]);
  roof(cv, 6, 12, 52, 12, ROOF.imperial, 4);
  cv.rect(10, 22, 44, 4, [160, 50, 40]);
  place(cv, g - 1, WALL.y1 - 3, 1, { gaps: [g, g + 1], shadow: false });
}

// Ngọ Môn: a stone base with three arches under the Five Phoenix pavilion.
{
  const w = 12, h = 6;
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const baseY = ph - 40;
  const stone = [170, 162, 150], stoneLine = [146, 138, 128];
  cv.rect(0, baseY, pw, 40, stone);
  for (let y = baseY + 4; y < ph; y += 5) for (let x = 0; x < pw; x++) if ((x + (y % 10 < 5 ? 0 : 6)) % 12 === 0) cv.set(x, y, stoneLine);
  for (let y = baseY + 4; y < ph; y += 5) for (let x = 0; x < pw; x++) cv.set(x, y, stoneLine, 0.35);
  cv.rect(0, baseY, pw, 3, [190, 182, 170]);
  // Arches: the centre one is the passage the buddy walks through.
  const archAt = (cx, aw, ah) => {
    cv.rect(cx - aw / 2, ph - ah, aw, ah, [44, 36, 32]);
    cv.rect(cx - aw / 2 + 2, ph - ah - 2, aw - 4, 2, [44, 36, 32]);
  };
  archAt(pw / 2, 18, 22);
  archAt(pw / 2 - 40, 10, 16);
  archAt(pw / 2 + 40, 10, 16);
  // Lầu Ngũ Phụng: a long pavilion with red columns and a two-tier roof
  // (yellow in the middle, glazed green on the wings, as on the real gate).
  const pavY = baseY - 12;
  cv.rect(10, pavY, pw - 20, 12, [150, 46, 38]);
  for (let x = 12; x < pw - 12; x += 6) cv.rect(x, pavY, 2, 12, [196, 64, 50]);
  roof(cv, 6, pavY - 14, 52, 14, ROOF.glazed, 4);
  roof(cv, pw - 58, pavY - 14, 52, 14, ROOF.glazed, 4);
  roof(cv, 58, pavY - 18, pw - 116, 18, ROOF.imperial, 5);
  cv.rect(70, pavY - 26, pw - 140, 8, [150, 46, 38]);
  roof(cv, 64, 8, pw - 128, pavY - 34, ROOF.imperial, 5);
  place(cv, 26, 14, 3, { gaps: [31, 32] });
}

// Kỳ Đài: a three-tier brick bastion with the flag on a tall pole. Drawn
// after Ngọ Môn because it stands in front of it.
{
  const bw = (BASTION.x1 - BASTION.x0) * T;
  const cv = new Canvas(bw, 9 * T);            // 7 rows of pole above 2 rows of base
  const baseY = 7 * T;
  const brick = [148, 90, 72], brickTop = [176, 116, 92], brickLine = [120, 70, 56];
  for (let tier = 0; tier < 3; tier++) {
    const ins = tier * 9, top = baseY + tier * 7;
    cv.rect(ins, top, bw - ins * 2, 2 * T - tier * 7, brick);
    cv.rect(ins, top, bw - ins * 2, 3, brickTop);
    for (let y = top + 5; y < 2 * T + baseY; y += 4) for (let x = ins; x < bw - ins; x++) if (x % 7 === (y % 8 < 4 ? 0 : 3)) cv.set(x, y, brickLine);
  }
  const poleX = bw / 2 - 1;
  cv.rect(poleX, 4, 2, baseY + 16, [214, 214, 210]);
  cv.set(poleX, 3, [236, 200, 90]); cv.set(poleX + 1, 3, [236, 200, 90]);
  // The flag: red with a yellow star, on the east side of the pole.
  cv.rect(poleX + 2, 6, 22, 14, [204, 42, 38]);
  const star = [[11, 9], [12, 9], [13, 9], [10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [11, 11], [12, 11], [13, 11], [11, 12], [13, 12], [12, 8], [10, 12], [14, 12]];
  for (const [sx, sy] of star) cv.set(poleX + 2 + sx, 6 + sy - 2, [250, 214, 70]);
  place(cv, BASTION.x0, BASTION.y0 - 7, 2);
}

// Thái Hòa palace — the curated collection — and the six CEFR halls.
place(palace({ w: 8, h: 5, roofPal: ROOF.imperial, wall: [150, 46, 38], pillar: [196, 70, 52] }), 28, 7, 3);
const HALL = (roofPal = ROOF.imperial) => hall({
  w: 4, h: 4, roofRows: 2, roofPal, wall: [128, 52, 40], pillar: [176, 66, 50], pillarStep: 7, doorW: 8, doorFill: [56, 30, 24],
});
const SYSTEM_HALLS = [
  // [x, y, roof] in the order the levels fill them: A1, A2 near the gate,
  // then B1–C2 deeper inside.
  [20, 14, ROOF.imperial], [40, 14, ROOF.imperial],
  [20, 4, ROOF.glazed], [24, 4, ROOF.imperial], [36, 4, ROOF.imperial], [40, 4, ROOF.glazed],
];
for (const [x, y, pal] of SYSTEM_HALLS) place(HALL(pal), x, y, 2);

// ── North bank: Thiên Mụ, Đông Ba, Gia Hội, Tịnh Tâm ──

// Thiên Mụ: the seven-storey Phước Duyên tower beside its temple hall.
{
  const w = 4, h = 10;
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const brick = [204, 140, 112], brickShade = [176, 112, 88], ledge = [96, 82, 76], ledgeLight = [126, 110, 100];
  cv.rect(2, ph - 8, pw - 4, 8, [178, 172, 162]);           // stone platform
  cv.rect(2, ph - 8, pw - 4, 2, [200, 194, 184]);
  let y = ph - 8;
  for (let tier = 0; tier < 7; tier++) {
    const tw = 44 - tier * 4, th = 15 - tier;
    const x = Math.round((pw - tw) / 2);
    y -= th;
    cv.rect(x, y, tw, th, brick);
    cv.rect(x + tw - 5, y, 5, th, brickShade);               // octagon: shaded east facet
    cv.rect(x + 4, y, 2, th, mix(brick, [255, 255, 255], 0.12));
    const ww = 4, wh = Math.max(4, th - 7);
    cv.rect(Math.round(pw / 2 - ww / 2), y + th - wh - 2, ww, wh, [60, 44, 40]); // arched niche
    // Overhanging ledge with upturned tips.
    cv.rect(x - 3, y - 3, tw + 6, 3, ledge);
    cv.rect(x - 3, y - 3, tw + 6, 1, ledgeLight);
    cv.set(x - 4, y - 4, ledge); cv.set(x + tw + 3, y - 4, ledge);
    y -= 3;
  }
  // Finial.
  cv.rect(pw / 2 - 2, y - 6, 4, 6, [210, 170, 80]);
  cv.rect(pw / 2 - 1, y - 10, 2, 4, [230, 196, 100]);
  place(cv, 5, 12, 2);
}
place(hall({ w: 5, h: 5, roofRows: 3, roofPal: ROOF.dark, wall: [226, 214, 186], pillar: [150, 60, 46], pillarStep: 10 }), 10, 17, 2);

// Đông Ba market: a long cream hall with stall awnings and the clock gable.
{
  const w = 12, h = 7;
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const bodyY = ph - 40;
  facade(cv, 2, bodyY, pw - 4, 40, { wall: [232, 220, 192], windows: true, windowStep: 12, glass: [70, 80, 84], doorW: 14, doorH: 16, doorFill: [70, 54, 44] });
  roof(cv, 2, bodyY - 26, pw - 4, 26, ROOF.terra, 7);
  // Awnings: muted stripes along the front, one per stall.
  const awn = [[176, 92, 80], [92, 140, 130], [212, 178, 92], [140, 108, 150]];
  for (let x = 6, i = 0; x < pw - 10; x += 14, i++) {
    if (Math.abs(x + 6 - pw / 2) < 18) continue;
    const c = awn[i % awn.length];
    for (let ax = 0; ax < 12; ax++) {
      cv.rect(x + ax, bodyY + 18, 1, 6, ax % 4 < 2 ? c : mix(c, [255, 255, 255], 0.35));
    }
  }
  // The clock gable in the middle, rising above the roof.
  const gx = pw / 2 - 20, gy = bodyY - 40;
  cv.rect(gx, gy + 6, 40, 38, [238, 228, 204]);
  cv.rect(gx, gy + 6, 40, 2, [206, 194, 168]);
  for (let i = 0; i < 20; i++) cv.rect(gx + i, gy + 6 - Math.floor(i / 3), 40 - i * 2, 1, [238, 228, 204]); // pediment
  cv.rect(gx + 18, gy - 2, 4, 2, [176, 92, 80]);
  cv.ellipse(pw / 2, gy + 18, 7, 7, [92, 80, 70]);
  cv.ellipse(pw / 2, gy + 18, 6, 6, [250, 246, 236]);
  cv.rect(pw / 2, gy + 13, 1, 6, [40, 36, 34]);
  cv.rect(pw / 2, gy + 18, 4, 1, [40, 36, 34]);
  cv.rect(gx + 8, gy + 30, 24, 4, [176, 92, 80]);  // name board
  place(cv, 50, 15, 4);
}

// Gia Hội: three old shophouses, purely scenery.
[[63, ROOF.dark], [71, ROOF.terra], [75, ROOF.moss]].forEach(([x, pal]) => {
  place(hall({ w: 4, h: 4, roofRows: 2, roofPal: pal, wall: [214, 198, 170], windows: true, windowStep: 9, doorW: 6 }), x, 18, 2);
});

// A small pavilion on Tịnh Tâm lake.
{
  const cv = new Canvas(3 * T, 3 * T);
  cv.rect(4, 36, 40, 12, [184, 176, 164]);
  for (let x = 8; x < 42; x += 8) cv.rect(x, 26, 2, 10, [160, 50, 40]);
  roof(cv, 6, 12, 36, 14, ROOF.imperial, 4);
  place(cv, 55, 5, 3, { shadow: false });
}

// ── South bank ──

// Quốc Học: the maroon colonial school with white trim and a portico.
{
  const w = 12, h = 5;
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const bodyY = ph - 44;
  facade(cv, 2, bodyY, pw - 4, 44, {
    wall: [156, 60, 52], windows: true, windowStep: 11, windowFrame: [240, 236, 226], glass: [64, 104, 88], door: false,
  });
  for (let x = 2; x < pw - 2; x += 22) cv.rect(x, bodyY + 2, 2, 40, [236, 230, 218]); // pilasters
  cv.rect(2, bodyY + 20, pw - 4, 2, [236, 230, 218]);                                    // storey band
  for (let wx = 7; wx < pw - 10; wx += 11) {
    if (Math.abs(wx - pw / 2) < 20) continue;
    cv.rect(wx, bodyY + 25, 5, 8, [240, 236, 226]);
    cv.rect(wx + 1, bodyY + 26, 3, 6, [64, 104, 88]);
  }
  roof(cv, 2, bodyY - 30, pw - 4, 30, ROOF.slate, 8);
  // Portico: white columns and a triangular pediment over the entrance.
  const px = pw / 2 - 18;
  cv.rect(px, bodyY - 4, 36, 48, [156, 60, 52]);
  for (let x = px + 2; x < px + 36; x += 8) cv.rect(x, bodyY + 6, 3, 36, [244, 240, 232]);
  for (let i = 0; i < 12; i++) cv.rect(px + i * 1.5, bodyY - 4 - i, 36 - i * 3, 1, [240, 236, 226]);
  cv.rect(px - 2, bodyY + 4, 40, 3, [240, 236, 226]);
  cv.rect(pw / 2 - 5, bodyY + 30, 10, 12, [60, 40, 32]);
  place(cv, 34, 36, 3);
}

// Ngự Bình: the flat-topped "royal screen" hill, with pines.
const HILL = { cx: 24.5 * T, cy: 49.6 * T, rx: 6.5 * T, ry: 4.3 * T };
{
  const { cx, cy, rx, ry } = HILL;
  for (let y = Math.floor(cy - ry); y < cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      const e = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (e > 1) continue;
      // Flat top in the upper part; a shaded slope facing south.
      const top = ((x + 0.5 - cx) / (rx * 0.82)) ** 2 + ((y + 0.5 - (cy - ry * 0.22)) / (ry * 0.62)) ** 2 <= 1;
      const base = top ? [138, 176, 104] : mix([104, 140, 84], [84, 118, 74], (y - cy + ry) / (2 * ry));
      ground.set(x, y, hash(x, y) < 0.03 ? P.fleckDark : base);
    }
  }
  for (let ty = Math.floor((cy - ry) / T); ty <= Math.floor((cy + ry) / T); ty++) {
    for (let tx = Math.floor((cx - rx) / T); tx <= Math.floor((cx + rx) / T); tx++) {
      const e = ((tx + 0.5) * T - cx) ** 2 / rx ** 2 + ((ty + 0.5) * T - cy) ** 2 / ry ** 2;
      if (e <= 1.05 && solid[ty]) { solid[ty][tx] = true; used[ty][tx] = true; }
    }
  }
}

// Khải Định tomb: weathered dark stone — mandarin courtyard, stairs, the
// stele pavilion and the main palace at the top.
{
  const w = 12, h = 11;
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const st = [150, 148, 142], stDark = [112, 110, 106], stLight = [176, 174, 168], stLine = [128, 126, 120];
  // Three terraces, rising towards the back.
  const terrace = (y, tw, th) => {
    const x = Math.round((pw - tw) / 2);
    cv.rect(x, y, tw, th, st);
    cv.rect(x, y, tw, 2, stLight);
    cv.rect(x, y + th - 4, tw, 4, stDark);
    for (let yy = y + 4; yy < y + th - 4; yy += 4) for (let xx = x; xx < x + tw; xx++) if (xx % 9 === 0) cv.set(xx, yy, stLine);
  };
  terrace(ph - 64, pw - 4, 62);
  terrace(ph - 120, pw - 40, 58);
  terrace(ph - 168, pw - 80, 50);
  // Stairs up the middle.
  for (let y = ph - 120; y < ph - 2; y += 3) cv.rect(pw / 2 - 10, y, 20, 2, y % 6 === 0 ? stLight : stLine);
  // Mandarin statues lining the lower courtyard.
  for (const sx of [14, 26, 38, pw - 42, pw - 30, pw - 18]) {
    for (const sy of [ph - 50, ph - 30]) {
      cv.rect(sx, sy, 5, 9, stDark);
      cv.rect(sx + 1, sy - 3, 3, 3, stLine);
      cv.rect(sx + 1, sy + 1, 3, 3, st);
    }
  }
  // Stele pavilion on the middle terrace.
  const spx = pw / 2 - 20, spy = ph - 116;
  cv.rect(spx + 4, spy + 18, 32, 24, stDark);
  cv.rect(spx + 15, spy + 22, 10, 16, [70, 70, 68]);
  roof(cv, spx, spy + 6, 40, 12, ROOF.slate, 4);
  // Main palace at the top.
  const mpx = pw / 2 - 34, mpy = ph - 176;
  cv.rect(mpx + 4, mpy + 18, 60, 20, [96, 94, 92]);
  for (let x = mpx + 8; x < mpx + 64; x += 8) cv.rect(x, mpy + 20, 2, 18, stLight);
  cv.rect(pw / 2 - 5, mpy + 26, 10, 12, [44, 42, 40]);
  roof(cv, mpx, mpy + 4, 68, 14, ROOF.slate, 5);
  place(cv, 2, 40, 9);
}

// Your home: a bigger garden house with a fenced yard and flower beds.
{
  const cv = hall({ w: 6, h: 5, roofRows: 3, roofPal: ROOF.terra, wall: [120, 82, 58], pillar: [96, 62, 44], pillarStep: 9, doorW: 8, doorFill: [60, 40, 30], windows: true, windowStep: 12, windowFrame: [196, 160, 110], glass: [80, 64, 50] });
  place(cv, 50, 44, 3);
  // Flower beds either side of the door path.
  for (const fx of [50 * T + 6, 50 * T + 66]) {
    ground.rect(fx, 49 * T - 1, 20, 1, [120, 90, 64]);
    for (let i = 0; i < 9; i++) ground.set(fx + 2 + i * 2, 49 * T - 3, [[236, 150, 178], [250, 214, 110], [190, 150, 220]][i % 3]);
  }
}

// Eight garden houses for collections: two rows of four, varied roofs.
const HOUSE_X = [61, 66, 71, 76];
const HOUSE_ROWS = [37, 45];
const HOUSE_ROOFS = [ROOF.dark, ROOF.terra, ROOF.moss, ROOF.plum];
HOUSE_ROWS.forEach((y, r) => HOUSE_X.forEach((x, i) => {
  place(hall({
    w: 4, h: 4, roofRows: 2, roofPal: HOUSE_ROOFS[(i + r) % HOUSE_ROOFS.length],
    wall: [124, 86, 62], pillar: [98, 66, 46], pillarStep: 8, doorW: 6, doorFill: [62, 42, 32],
  }), x, y, 2);
}));

// Cồn Hến chè stall: a tiny hut with a striped awning, stools out front.
{
  const cv = new Canvas(2 * T, 2 * T);
  cv.rect(3, 14, 26, 16, [196, 170, 128]);
  cv.rect(12, 20, 8, 10, [96, 70, 50]);
  for (let x = 0; x < 32; x++) cv.rect(x, 8, 1, 6, x % 6 < 3 ? [92, 140, 130] : [236, 232, 220]);
  roof(cv, 2, 3, 28, 5, ROOF.dark, 2);
  place(cv, 71, 28, 1, { shadow: false });
  for (const [sx, sy] of [[69.2, 30.2], [69.8, 30.3], [73.4, 30.2]]) ground.rect(sx * T, sy * T, 3, 3, [150, 110, 72]);
}

// ── 7. Trees ──
const treeKinds = {
  // Round broadleaf crown.
  leaf: { crown: [84, 130, 86], light: [104, 150, 98], dark: [64, 106, 72] },
  // Bằng lăng — Huế's purple.
  lilac: { crown: [150, 116, 172], light: [176, 144, 196], dark: [116, 88, 140] },
  // Phượng — flame tree.
  flame: { crown: [194, 96, 66], light: [220, 128, 86], dark: [150, 70, 50] },
};
function tree(tx, ty, kind = 'leaf') {
  if (solid[ty]?.[tx] === undefined) return;
  const cv = new Canvas(2 * T, 2 * T);
  const k = treeKinds[kind];
  cv.rect(14, 22, 4, 9, [104, 74, 52]);
  cv.rect(14, 22, 1, 9, [128, 94, 66]);
  cv.ellipse(16, 14, 13, 11, k.dark);
  cv.ellipse(15, 12, 12, 10, k.crown);
  cv.ellipse(12, 9, 6, 5, k.light);
  for (let i = 0; i < 14; i++) cv.set(4 + Math.floor(rand() * 24), 4 + Math.floor(rand() * 18), k.dark, cv.alpha(4, 4) ? 1 : 0.9);
  ground.ellipse(tx * T + 9, ty * T + 15, 9, 3, P.shadow, 0.22);
  // Trunk tile is (tx, ty); the crown fills the tile above it.
  ground.blit(cv, (tx - 0.5) * T, (ty - 1) * T);
  over.blit(cv, (tx - 0.5) * T, (ty - 1) * T, [0, T + 4]);
  solid[ty][tx] = true;
  mark(used, tx - 1, ty - 1, 3, 3);
}
function pine(tx, ty) {
  if (solid[ty]?.[tx] === undefined) return;
  const cv = new Canvas(T, 2 * T);
  cv.rect(7, 25, 2, 6, [96, 70, 50]);
  for (let tier = 0; tier < 3; tier++) {
    const y = 4 + tier * 7, half = 3 + tier * 2;
    for (let r = 0; r < 9; r++) {
      const w = Math.round(half * (r / 8)) + 1;
      for (let x = 8 - w; x < 8 + w; x++) cv.set(x, y + r, x < 8 ? [72, 116, 82] : [56, 96, 70]);
    }
  }
  ground.ellipse(tx * T + 9, ty * T + 15, 6, 2, P.shadow, 0.22);
  ground.blit(cv, tx * T, (ty - 1) * T);
  over.blit(cv, tx * T, (ty - 1) * T, [0, T + 6]);
  solid[ty][tx] = true;
  mark(used, tx, ty, 1, 1);
}

// Purple bằng lăng along the riverside promenade — the city's colour.
for (let x = 2; x < 78; x += 5) {
  if ((x >= 25 && x <= 29) || (x >= 46 && x <= 50) || (x >= 33 && x <= 46) || x >= 56) continue;
  tree(x, 36, x % 2 ? 'lilac' : 'leaf');
}
// Pines on Ngự Bình and around Thiên Mụ.
for (const [x, y] of [[21, 47], [24, 46], [27, 47], [19, 50], [29, 50], [23, 51], [26, 52], [1, 15], [2, 19], [3, 13], [15, 13], [15, 16], [1, 22]]) pine(x, y);
// A handful of flame trees for a warm accent.
for (const [x, y] of [[48, 3], [9, 33 + 4], [65, 30]]) tree(x, y, 'flame');
// Scatter broadleaf trees over the remaining open grass, sparsely.
{
  let placed = 0;
  for (let i = 0; i < 4000 && placed < 26; i++) {
    const tx = 1 + Math.floor(rand() * (W - 2)), ty = 2 + Math.floor(rand() * (H - 3));
    let clear = true;
    for (let j = ty - 2; j <= ty + 1 && clear; j++) {
      for (let k = tx - 1; k <= tx + 1 && clear; k++) {
        if (used[j]?.[k] !== false || solid[j]?.[k]) clear = false;
        else if (isWater(k * T + 8, j * T + 8) || isWater(k * T, j * T) || isWater(k * T + 15, j * T + 15)) clear = false;
      }
    }
    if (!clear) continue;
    tree(tx, ty, rand() < 0.15 ? 'lilac' : 'leaf');
    placed++;
  }
}

// ── 8. Collision grid ──
// A tile blocks if a third of it is water (unless it's a deck), or if
// something was built on it.
const walls = new Array(W * H).fill(0);
for (let ty = 0; ty < H; ty++) {
  for (let tx = 0; tx < W; tx++) {
    let wetPx = 0;
    for (let y = 0; y < T; y += 2) for (let x = 0; x < T; x += 2) if (wet(tx * T + x, ty * T + y)) wetPx++;
    const blocked = solid[ty][tx] || (!deck[ty][tx] && wetPx >= 64 / 3);
    walls[ty * W + tx] = blocked ? 1 : 0;
  }
}

// ── 9. Meta: spawn, labels, station slots ──
const objects = [];
let nextId = 1;
const prop = (name, value) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value });
const point = (type, tx, ty, props = {}) => objects.push({
  id: nextId++, name: '', type, x: Math.round(tx * T), y: Math.round(ty * T),
  width: 0, height: 0, rotation: 0, visible: true, point: true,
  properties: Object.entries(props).map(([k, v]) => prop(k, v)),
});

point('spawn', 48.5, 34);
// The first label names the (single) area; `hidden` keeps it off the map.
point('label', 2, 2, { text: 'Huế', theme: 'forest', hidden: 'true' });
point('label', 3, 29.3, { text: 'Sông Hương', theme: 'forest' });
point('label', 50.4, 26.9, { text: 'Cầu Trường Tiền', theme: 'desert' });
point('label', 15.3, 31.9, { text: 'Cầu Nguyễn Hoàng', theme: 'desert' });
point('label', 22.3, 27.3, { text: 'Cầu Dã Viên', theme: 'desert' });
point('label', 29.3, 27.3, { text: 'Cầu Phú Xuân', theme: 'desert' });
point('label', 20.6, 49.4, { text: 'Ngự Bình', theme: 'forest' });

// Levels: Thái Hòa holds the curated list, then A1 → C2 through the halls.
point('station', 32, 12.5, { region: 'system', slot: 0 });
SYSTEM_HALLS.forEach(([x, y], i) => point('station', x + 2, y + 4.5, { region: 'system', slot: i + 1 }));
// Collections: the garden houses, front row first.
HOUSE_ROWS.forEach((y, r) => HOUSE_X.forEach((x, i) => point('station', x + 2, y + 4.5, { region: 'public', slot: r * 4 + i })));
// App pages, each bound to its landmark.
const FEATURES = [
  ['learn', 56, 22.5, 'Chợ Đông Ba'],
  ['review', 7, 22.5, 'Chùa Thiên Mụ'],
  ['speak', 72, 30.6, 'Cồn Hến'],
  ['listening', 59, 30.2, 'Thuyền rồng'],
  ['quizzes', 40, 41.5, 'Quốc Học'],
  ['level-test', 24.5, 43.6, 'Núi Ngự Bình'],
  ['history', 8, 51.5, 'Lăng Khải Định'],
  ['buddy', 53, 49.5, 'Nhà vườn'],
];
FEATURES.forEach(([feature, x, y, place], slot) => point('station', x, y, { region: 'feature', slot, feature, place }));

// ── 10. Sanity: every slot reachable from the spawn ──
{
  const seen = new Uint8Array(W * H);
  const sx = Math.floor(48.5), sy = 34;
  const q = [[sx, sy]];
  seen[sy * W + sx] = 1;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || walls[ny * W + nx]) continue;
      seen[ny * W + nx] = 1;
      q.push([nx, ny]);
    }
  }
  const bad = objects.filter((o) => o.type === 'station' || o.type === 'spawn').filter((o) => {
    const tx = Math.floor(o.x / T), ty = Math.floor(o.y / T);
    return !seen[ty * W + tx];
  });
  if (bad.length) {
    for (const o of bad) console.error(`unreachable ${o.type} at tile ${Math.floor(o.x / T)},${Math.floor(o.y / T)}`, o.properties.map((p) => `${p.name}=${p.value}`).join(' '));
    process.exitCode = 1;
  }
}

// ── 11. Write ──
const tile = new Canvas(T, T);
tile.rect(0, 0, T, T, [200, 60, 60]);

const tmj = {
  compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T, infinite: false,
  orientation: 'orthogonal', renderorder: 'right-down', tiledversion: '1.10.2', type: 'map', version: '1.10',
  nextlayerid: 6, nextobjectid: nextId,
  tilesets: [{
    firstgid: 1, name: 'hue', image: 'hue-tiles.png', imagewidth: T, imageheight: T,
    tilewidth: T, tileheight: T, columns: 1, tilecount: 1, margin: 0, spacing: 0,
  }],
  layers: [
    { id: 1, name: 'ground', type: 'imagelayer', image: 'hue-ground.png', x: 0, y: 0, opacity: 1, visible: true },
    { id: 2, name: 'over', type: 'imagelayer', image: 'hue-over.png', x: 0, y: 0, opacity: 1, visible: true },
    { id: 5, name: 'night', type: 'imagelayer', image: 'hue-night.png', x: 0, y: 0, opacity: 1, visible: false },
    { id: 3, name: 'walls', type: 'tilelayer', x: 0, y: 0, width: W, height: H, opacity: 0.5, visible: false, data: walls },
    { id: 4, name: 'meta', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects },
  ],
};

writeFileSync(mapFile('hue.tmj'), JSON.stringify(tmj));
await Promise.all([
  ground.png(mapFile('hue-ground.png')),
  over.png(mapFile('hue-over.png')),
  tile.png(mapFile('hue-tiles.png')),
  night.png(mapFile('hue-night.png')),
]);
console.log(`hue.tmj ${W}×${H} — ${objects.length} meta points`);

// Optional QA render: ground + over, blocked tiles tinted, slots marked.
const previewPath = process.argv[2];
if (previewPath) {
  const pv = new Canvas(PW, PH);
  pv.blit(ground, 0, 0);
  pv.blit(over, 0, 0);
  if (process.argv.includes('--walls')) {
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (walls[ty * W + tx]) pv.rect(tx * T, ty * T, T, T, [255, 0, 0], 0.25);
  }
  for (const o of objects) {
    const c = o.type === 'spawn' ? [255, 255, 255] : o.type === 'label' ? [0, 0, 0] : [255, 220, 0];
    pv.rect(o.x - 3, o.y - 3, 6, 6, c);
  }
  await sharp(Buffer.from(pv.d.buffer), { raw: { width: PW, height: PH, channels: 4 } }).png().toFile(previewPath);
  console.log(`preview → ${previewPath}`);
}
