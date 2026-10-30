#!/usr/bin/env node
// Generates the Huế world template: public/game/maps/hue.tmj plus the images
// it paints with — hue-ground.png (everything, under the buddy), hue-over.png
// (roofs, tower tops and tree crowns, drawn over the buddy so it can walk
// behind them) and hue-night.png (bridge lights, shown only in dark mode —
// Trường Tiền's six spans each glow their own colour). Every pixel is drawn
// here in code; there is no tileset art to license or keep in sync.
//
//   node scripts/generate-hue-map.mjs [preview.png] [--walls]
//
// The optional preview composites both layers with station slots marked (and
// blocked tiles tinted with --walls), for checking a change without the app.
//
// Same contract as every world template (see src/game/scenes/WorldScene.ts):
//   - `walls` tile layer — any tile blocks movement (hidden, collision only)
//   - `meta` object layer — `spawn`, `label`, and `station` points with a
//     `region` (public | system | feature) and `slot`. Feature stations here
//     also name their `feature` id and a `place`, so the building a page lives
//     in is decided by the map, not by list order.
// Plus image layers `ground`, `over` and `night`, which WorldScene draws below
// the buddy, above it, and over the dimmed map at night.
//
// The layout follows the real city, turned the way illustrated maps of Huế
// usually are: the Citadel upright with its front (Kỳ Đài, Ngọ Môn) facing the
// Hương River, which runs west → east along it and then bends north-east past
// Đông Ba. In the city's real places:
//
//   KIM LONG (west)   Thiên Mụ pagoda (Review) · Văn Miếu and its stelae
//                     (Writing) · garden houses for your collections ·
//                     An Hiên, your home (Buddy)
//   THE CITADEL       moat and walls, Kỳ Đài on the front wall; inside, the
//                     Imperial City with its own moat, Ngọ Môn and the level
//                     halls · Tàng Thư Lâu on Học Hải lake (Search) · Tịnh Tâm
//                     · Duyệt Thị Đường, the royal theatre (IPA sounds)
//   ĐÔNG BA / GIA HỘI Đông Ba market at the river corner (Learn), Gia Hội
//                     across the Đông Ba canal
//   THE RIVER         Nguyễn Hoàng, Dã Viên (over its islet), Phú Xuân and
//                     Trường Tiền bridges · Cồn Hến in the bend (Speak)
//   SOUTH BANK        Ga Huế · Quốc Học (Quizzes) · Lê Lợi park and the
//                     dragon-boat wharf (Listening) · the walking street ·
//                     the An Cựu canal with Cung An Định · Ngự Bình (Level
//                     test) · Khải Định tomb (History)
//
// Deliberately quiet: one muted palette, no animated scenery, and only the
// landmarks you can enter get strong colour.

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const W = 120; // map size in tiles
const H = 86;
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

// ── Layout (tile units unless noted) ──

/** A polyline in tile coordinates, measured in pixels for distance tests. */
function polyline(points) {
  const segs = [];
  let s = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i].map((v) => v * T), [bx, by] = points[i + 1].map((v) => v * T);
    const len = Math.hypot(bx - ax, by - ay);
    segs.push({ ax, ay, bx, by, len, s0: s });
    s += len;
  }
  return { segs, length: s, vertexS: [0, ...segs.map((g) => g.s0 + g.len)] };
}
/** Distance from (x, y) px to a polyline, and how far along it that is. */
function nearest(line, x, y) {
  let d = Infinity, s = 0;
  for (const g of line.segs) {
    const dx = g.bx - g.ax, dy = g.by - g.ay;
    const t = Math.max(0, Math.min(1, ((x - g.ax) * dx + (y - g.ay) * dy) / (g.len * g.len)));
    const dd = Math.hypot(x - (g.ax + dx * t), y - (g.ay + dy * t));
    if (dd < d) { d = dd; s = g.s0 + t * g.len; }
  }
  return { d, s };
}
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

// The Hương: west → east along the Citadel's front, then the bend north-east
// past Đông Ba, widest where it wraps around Cồn Hến.
const RIVER = polyline([[-4, 53.5], [40, 53.3], [80, 53.6], [97, 53.5], [106, 49], [111, 40], [115, 30], [120, 18], [126, 4]]);
const [, , , S3, S4, , S6, S7] = RIVER.vertexS;
const riverHalfWidth = (s) => {
  let hw = s < S3 ? 3.5 : s < S4 ? lerp(3.5, 8, (s - S3) / (S4 - S3)) : s < S6 ? 8 : lerp(8, 5.5, (s - S6) / (S7 - S6));
  return (hw + 0.25 * Math.sin(s / (7 * T))) * T;
};

// Islets: Dã Viên (under its bridge) and Cồn Hến (in the bend, lying along
// the flow).
const DA_VIEN = { cx: 33.5 * T, cy: 53.4 * T, rx: 4.5 * T, ry: 1.3 * T, angle: 0 };
const CON_HEN = { cx: 110.5 * T, cy: 41 * T, rx: 6.5 * T, ry: 3.4 * T, angle: Math.atan2(-9, 5) };
const ISLETS = [DA_VIEN, CON_HEN];
const isletE = (i, x, y) => {
  const dx = x - i.cx, dy = y - i.cy, c = Math.cos(i.angle), s = Math.sin(i.angle);
  return ((dx * c + dy * s) / i.rx) ** 2 + ((-dx * s + dy * c) / i.ry) ** 2;
};
const onIslet = (x, y) => ISLETS.some((i) => isletE(i, x, y) <= 1);

// Canals: Đông Ba (between the Citadel and Gia Hội) and An Cựu (across the
// south bank).
const CANALS = [
  polyline([[82.2, -2], [82.2, 50.5]]),
  polyline([[13, 74], [30, 73.4], [50, 73], [75, 73.6], [100, 72.6], [126, 73]]),
];
const CANAL_HW = 1.3 * T;

// The Citadel (Kinh Thành): a 2-tile moat ring, then the wall ring. Inside
// it, the Imperial City (Hoàng Thành) with its own 1-tile moat and wall.
const CITADEL = { moat: { x0: 28, y0: 3, x1: 80, y1: 47 }, wall: { x0: 30, y0: 5, x1: 78, y1: 45 } };
const IMPERIAL = { moat: { x0: 41, y0: 15, x1: 69, y1: 41 }, wall: { x0: 42, y0: 16, x1: 68, y1: 40 } };
const BASTION = { x0: 52, x1: 58, y0: 44, y1: 47 };   // Kỳ Đài, in the front wall + moat
const SOUTH_GATES = [36, 72];                          // left column of each 2-wide gate
const WEST_GATE_Y = 30;                                // top row of the 2-tall west gate
const EAST_GATE_Y = 36;
const NGO_MON = { x: 49, y: 34, w: 12, h: 6 };         // in the Imperial City's south wall

// Tàng Thư Lâu: like the real one, the library stands on an island in Học
// Hải lake, reached by one small bridge.
const LIBRARY = { lake: { x: 31, y: 19, w: 10, h: 11 }, island: { x: 32, y: 21, w: 8, h: 7 }, bridgeX: 35 };

const LAKES = [
  { kind: 'ellipse', cx: 55 * T, cy: 9.5 * T, rx: 7 * T, ry: 2.6 * T },  // Tịnh Tâm
  { kind: 'rect', x: 49, y: 31, w: 5, h: 2 },                            // Thái Dịch lake, either side
  { kind: 'rect', x: 56, y: 31, w: 5, h: 2 },                            // of Trung Đạo, before Thái Hòa
  { kind: 'rect', ...LIBRARY.lake },
];

const inBox = (tx, ty, b) => tx >= b.x0 && tx < b.x1 && ty >= b.y0 && ty < b.y1;
const inMoat = (x, y) => {
  const tx = x / T, ty = y / T;
  const citadel = inBox(tx, ty, CITADEL.moat) && !inBox(tx, ty, CITADEL.wall) && !inBox(tx, ty, BASTION);
  const imperial = inBox(tx, ty, IMPERIAL.moat) && !inBox(tx, ty, IMPERIAL.wall);
  return citadel || imperial;
};
const inTileRect = (x, y, r) => x >= r.x * T && x < (r.x + r.w) * T && y >= r.y * T && y < (r.y + r.h) * T;
const inLake = (x, y) => !inTileRect(x, y, LIBRARY.island) && LAKES.some((l) => l.kind === 'ellipse'
  ? ((x - l.cx) / l.rx) ** 2 + ((y - l.cy) / l.ry) ** 2 <= 1
  : inTileRect(x, y, l));
const inRiver = (x, y) => {
  const { d, s } = nearest(RIVER, x, y);
  return d < riverHalfWidth(s) && !onIslet(x, y);
};
const inCanal = (x, y) => CANALS.some((c) => nearest(c, x, y).d < CANAL_HW);
const isWater = (x, y) => inRiver(x, y) || inCanal(x, y) || inMoat(x, y) || inLake(x, y);

// Paved surfaces: [x, y, w, h, material] in tiles. Purely visual — anything
// that isn't a wall is walkable — but they show where the city expects you.
const ROADS = [
  // Kim Long
  [2, 12, 26, 2, 'dirt'], [2, 22, 26, 2, 'dirt'], [2, 31, 26, 2, 'dirt'],
  [2, 12, 2, 35, 'dirt'], [26, 8, 2, 39, 'dirt'],
  [14, 44, 12, 1, 'stone'], [19, 45, 2, 2, 'stone'], // Văn Miếu's forecourt
  [28, WEST_GATE_Y, 7, 2, 'stone'],                 // through the west gate
  // North riverside road, the length of the city
  [0, 47, 97, 2, 'dirt'],
  // Inside the Citadel
  [31, 41, 46, 3, 'stone'],                         // esplanade along the front wall
  [SOUTH_GATES[0], 44, 2, 3, 'stone'], [SOUTH_GATES[1], 44, 2, 3, 'stone'],
  [35, 30, 2, 11, 'stone'],                         // from the west gate down past the library
  [32, 21, 8, 7, 'stone'],                          // the library's island courtyard
  [69, EAST_GATE_Y, 11, 2, 'stone'], [70, 38, 2, 3, 'stone'],
  [72, 19, 2, 17, 'stone'],                         // up to Duyệt Thị Đường
  // The Imperial City
  [44, 21, 23, 1, 'stone'], [44, 30, 23, 1, 'stone'],
  [54, 22, 2, 3, 'stone'], [54, 31, 2, 3, 'stone'],
  // Gia Hội
  [84, 36, 19, 2, 'dirt'], [97, 38, 2, 9, 'dirt'], [101, 38, 2, 1, 'dirt'],
  // South bank
  [0, 58, 97, 2, 'stone'],                          // Lê Lợi riverside promenade
  [20, 60, 2, 24, 'dirt'], [2, 82, 20, 2, 'dirt'],  // down to the tombs
  [48, 60, 3, 12, 'dirt'], [66, 60, 3, 12, 'dirt'], // south to the canal; on from Phú Xuân
  [44, 75, 27, 2, 'dirt'],                          // across the canal, to Ngự Bình
  [35, 65, 12, 1, 'stone'],                         // Quốc Học forecourt
  [69, 68, 17, 2, 'stone'],                         // the walking street
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


// ── 4. Islets: Dã Viên and Cồn Hến ──
for (const isl of ISLETS) {
  const r = Math.max(isl.rx, isl.ry);
  for (let y = Math.floor(isl.cy - r); y < isl.cy + r; y++) {
    for (let x = Math.floor(isl.cx - r); x < isl.cx + r; x++) {
      const e = isletE(isl, x + 0.5, y + 0.5);
      if (e > 1) continue;
      ground.set(x, y, e > 0.82 ? [206, 190, 150] : mix(P.grass, P.grassLight, noise(x, y, 9)));
    }
  }
}

/** Planks over water, laid across the direction of travel. */
function plankDeck(tx, ty, tw, th, horizontal = false) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const edge = horizontal ? (y === y0 || y === y1 - 1) : (x === x0 || x === x1 - 1);
      const plank = Math.floor((horizontal ? x - x0 : y - y0) / 3) % 2 === 0;
      ground.set(x, y, edge ? [106, 76, 50] : plank ? [160, 118, 78] : [146, 106, 70]);
    }
  }
  for (let y = y0; y < y1; y++) ground.set(x1, y + 2, P.shadow, 0.3);
  mark(deck, tx, ty, tw, th);
}

/** A short stone causeway over a moat or canal. */
function stoneSpan(tx, ty, tw, th) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const edge = (tw <= th) ? (x === x0 || x === x1 - 1) : (y === y0 || y === y1 - 1);
      ground.set(x, y, edge ? P.stoneEdge : P.stone);
    }
  }
  mark(deck, tx, ty, tw, th);
}

// The river's bridges run from the north road (row 48) to the promenade (58).
const BRIDGE_Y0 = 48.7 * T, BRIDGE_Y1 = 58.3 * T;
const BANK_N = 50 * T, BANK_S = 57 * T;

// Phú Xuân: the plain one — even concrete spans on square piers, sidewalks
// along both edges and a steady line of lamps.
{
  const tx = 66, tw = 3, y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
  const x0 = tx * T, x1 = (tx + tw) * T;
  for (let y = BANK_N + 8; y < BANK_S - 4; y += 18) {
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
  const tx = 32, tw = 3, y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
  const x0 = tx * T, x1 = (tx + tw) * T;
  plainBridge(tx, tw, y0, y1, [184, 182, 176], [120, 126, 134]);
  for (let y = y0; y < y1; y++) {
    if (Math.floor(y) % 10 === 0) ground.rect(x0 + 2, y, tw * T - 4, 1, [168, 166, 160]); // expansion joints
  }
  lamps(x0, x1, y0, y1, 22);
}

// Nguyễn Hoàng: the new crossing by Kim Long — a wide deck under one great
// arch in imperial yellow, hung on cables, standing on V-shaped piers.
{
  const tx = 19, tw = 4, y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
  const x0 = tx * T, x1 = (tx + tw) * T, cx = (x0 + x1) / 2;
  for (const py of [BANK_N + 22, (BANK_N + BANK_S) / 2, BANK_S - 26]) {
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
  const ay0 = y0 + 10, ay1 = y1 - 10, reach = 66;
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
  const tx = 75, tw = 3;
  const x0 = tx * T, x1 = (tx + tw) * T;
  const y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
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

// Cồn Hến footbridge, from the Gia Hội bank out to the islet.
plankDeck(101, 39, 7, 2, true);

// The dragon-boat wharf below the citadel, west of Phu Văn Lâu's landing, and
// a boat moored alongside it.
{
  plankDeck(48, 49, 2, 8);
  const x0 = 48 * T, x1 = 50 * T, y0 = 51 * T;
  for (const [px, py] of [[x0, y0], [x1 - 2, y0], [x0, y0 + 40], [x1 - 2, y0 + 40]]) ground.rect(px, py, 2, 3, [96, 66, 44]);
}
{
  const bx = 42.3 * T, by = 52.6 * T, bw = 88, bh = 18;
  for (let x = 0; x < bw; x++) {
    const taper = x < 10 ? Math.round((10 - x) * 0.5) : x > bw - 8 ? Math.round((x - (bw - 8)) * 0.6) : 0;
    for (let y = 6 + taper; y < bh; y++) {
      ground.set(bx + x, by + y, y > bh - 4 ? [120, 40, 32] : y > bh - 7 ? [196, 160, 64] : [178, 52, 40]);
    }
  }
  ground.rect(bx + 6, by + bh, bw - 10, 2, P.shadow, 0.3);
  ground.rect(bx + 24, by + 2, 40, 8, [150, 44, 36]);
  for (let x = 20; x < 68; x++) ground.set(bx + x, by + 1 + (x < 24 || x > 63 ? 0 : 1), ROOF.imperial.base);
  for (let x = 22; x < 66; x++) ground.set(bx + x, by, ROOF.imperial.light);
  for (let x = 28; x < 62; x += 6) {
    ground.rect(bx + x, by + 4, 3, 4, [244, 214, 140]);   // lanterns
    glow(bx + x + 1, by + 6, [255, 200, 120], 2);
  }
  ground.rect(bx - 6, by + 2, 6, 8, [196, 160, 64]);       // dragon head
  ground.rect(bx - 9, by + 4, 4, 3, [196, 160, 64]);
  ground.set(bx - 4, by + 4, [40, 30, 30]);
  ground.rect(bx - 3, by, 2, 2, [178, 52, 40]);
  ground.rect(bx + bw - 2, by + 4, 3, 3, [196, 160, 64]);  // tail
  ground.rect(bx + bw, by + 2, 2, 3, [196, 160, 64]);
}

// Over the Đông Ba canal: at the east gate and on the riverside road.
plankDeck(80, EAST_GATE_Y, 5, 2, true);
stoneSpan(80, 47, 5, 2);
// Over the An Cựu canal, where the south-bank roads meet it.
for (const [x, w] of [[20, 2], [48, 3], [66, 3]]) stoneSpan(x, 71, w, 4);

// ── The Citadel: moats, walls, gates, Kỳ Đài, Ngọ Môn and the halls ──

/** A wall ring with a crenellated top and a darker south-facing face.
 *  `open(tx, ty)` leaves a tile out — a gate, or a building in the line. */
function wallRing(b, open) {
  for (let ty = b.y0; ty < b.y1; ty++) {
    for (let tx = b.x0; tx < b.x1; tx++) {
      const horizontal = ty === b.y0 || ty === b.y1 - 1;
      const ring = horizontal || tx === b.x0 || tx === b.x1 - 1;
      if (!ring || open(tx, ty)) continue;
      solid[ty][tx] = true;
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const px = tx * T + x, py = ty * T + y;
          let c;
          if (horizontal && y >= 9) {
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
}

const CW = { x0: CITADEL.wall.x0, y0: CITADEL.wall.y0, x1: CITADEL.wall.x1, y1: CITADEL.wall.y1 };
wallRing(CW, (tx, ty) =>
  (ty === CW.y1 - 1 && (SOUTH_GATES.some((g) => tx === g || tx === g + 1) || (tx >= BASTION.x0 && tx < BASTION.x1)))
  || (tx === CW.x0 && (ty === WEST_GATE_Y || ty === WEST_GATE_Y + 1))
  || (tx === CW.x1 - 1 && (ty === EAST_GATE_Y || ty === EAST_GATE_Y + 1)));
const IW = IMPERIAL.wall;
wallRing(IW, (tx, ty) => ty === IW.y1 - 1 && tx >= NGO_MON.x && tx < NGO_MON.x + NGO_MON.w);

// Causeways over the moats at every gate.
for (const g of SOUTH_GATES) stoneSpan(g, CITADEL.wall.y1, 2, 2);
stoneSpan(CITADEL.moat.x0, WEST_GATE_Y, 2, 2);
stoneSpan(CITADEL.wall.x1, EAST_GATE_Y, 2, 2);
stoneSpan(54, IMPERIAL.wall.y1, 2, 1);                 // Trung Đạo, in front of Ngọ Môn

// Gate houses straddling the front wall: a little yellow roof over each arch.
for (const g of SOUTH_GATES) {
  const cv = new Canvas(4 * T, 3 * T);
  cv.rect(0, 26, 64, 22, P.wallFace);
  for (let y = 26; y < 48; y += 3) for (let x = 0; x < 64; x++) if ((x + y) % 6 === 0) cv.set(x, y, P.wallLine);
  cv.rect(17, 30, 30, 18, [40, 32, 28]);         // arch
  cv.rect(19, 28, 26, 2, [40, 32, 28]);
  roof(cv, 6, 12, 52, 12, ROOF.imperial, 4);
  cv.rect(10, 22, 44, 4, [160, 50, 40]);
  place(cv, g - 1, CITADEL.wall.y1 - 3, 1, { gaps: [g, g + 1], shadow: false });
}

// Ngọ Môn: a stone base with three arches under the Five Phoenix pavilion.
{
  const { w, h } = NGO_MON;
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
  place(cv, NGO_MON.x, NGO_MON.y, 3, { gaps: [54, 55] });
}

// Kỳ Đài: a three-tier brick bastion in the front wall with a tall flagpole.
// Drawn after Ngọ Môn because it stands in front of it.
const FLAG = { x: 0, y: 0, drop: 0 };
{
  const bw = (BASTION.x1 - BASTION.x0) * T;
  const baseRows = BASTION.y1 - BASTION.y0;
  const cv = new Canvas(bw, (7 + baseRows) * T);   // 7 rows of pole above the base
  const baseY = 7 * T;
  const brick = [148, 90, 72], brickTop = [176, 116, 92], brickLine = [120, 70, 56];
  for (let tier = 0; tier < 3; tier++) {
    const ins = tier * 9, top = baseY + tier * 9;
    cv.rect(ins, top, bw - ins * 2, baseRows * T - tier * 9, brick);
    cv.rect(ins, top, bw - ins * 2, 3, brickTop);
    for (let y = top + 5; y < baseRows * T + baseY; y += 4) for (let x = ins; x < bw - ins; x++) if (x % 7 === (y % 8 < 4 ? 0 : 3)) cv.set(x, y, brickLine);
  }
  const poleX = bw / 2 - 1;
  cv.rect(poleX, 4, 2, baseY + 16, [214, 214, 210]);
  cv.set(poleX, 3, [236, 200, 90]); cv.set(poleX + 1, 3, [236, 200, 90]);
  place(cv, BASTION.x0, BASTION.y0 - 7, baseRows);
  // The flag itself isn't painted: WorldScene hoists it up this pole as the
  // learner's streak grows (the `flag` meta point: where it flies at the top,
  // and how far it can drop).
  const top = (BASTION.y0 - 7) * T + 6;
  FLAG.x = BASTION.x0 + (poleX + 2) / T;
  FLAG.y = top / T;
  FLAG.drop = baseY - 16 - 6;
}

// Across the road from Kỳ Đài, on a stone landing out over the river: Phu Văn
// Lâu, the two-storey pavilion where royal edicts and exam results were
// posted, and Nghênh Lương Đình, the little pavilion at the water's edge where
// the court took the cool air — one behind the other on the axis that runs
// from the throne hall through Ngọ Môn and Kỳ Đài down to the water.
stoneSpan(51, 49, 8, 5);
{
  const cv = new Canvas(4 * T, 3 * T);
  const red = [150, 46, 38], col = [196, 70, 52];
  cv.rect(2, 40, 60, 8, [184, 176, 164]);
  cv.rect(2, 40, 60, 2, [206, 198, 186]);
  for (let x = 6; x < 58; x += 8) cv.rect(x, 27, 3, 13, col);
  cv.rect(4, 26, 56, 2, red);
  roof(cv, 2, 19, 60, 8, ROOF.imperial, 3);
  cv.rect(16, 12, 32, 8, red);
  for (let x = 18; x < 46; x += 5) cv.rect(x, 12, 2, 8, col);
  roof(cv, 10, 4, 44, 9, ROOF.imperial, 4);
  place(cv, 53, 49, 1);
}
{
  const cv = new Canvas(2 * T, 2 * T);
  cv.rect(2, 24, 28, 8, [184, 176, 164]);
  cv.rect(2, 24, 28, 2, [206, 198, 186]);
  for (const x of [5, 15, 25]) cv.rect(x, 13, 2, 11, [196, 70, 52]);
  roof(cv, 1, 4, 30, 10, ROOF.imperial, 4);
  place(cv, 54, 52, 1);
  // Steps down into the river from its landing.
  for (let i = 0; i < 3; i++) ground.rect(55 * T - 6 + i * 2, 54 * T + i * 3, 14 - i * 4, 3, i % 2 ? P.stoneEdge : P.stone);
}

// ── The Imperial City's details: the way to the throne hall, the dynastic
// temple, the royal garden ──

// Trung Đạo: the central path crossing Thái Dịch lake on a bridge, red
// railings either side.
for (let y = 31 * T; y < 33 * T; y++) {
  for (const x of [54 * T - 1, 56 * T]) ground.set(x, y, [176, 52, 40]);
  if (y % 6 === 0) for (const x of [54 * T - 2, 56 * T + 1]) { ground.set(x, y, [214, 170, 80]); ground.set(x, y + 1, [214, 170, 80]); }
}
// Đại Triều Nghi: the court's courtyard before Thái Hòa — rank stones in two
// rows where the mandarins stood, by grade.
for (let i = 0; i < 6; i++) for (const x0 of [47, 58]) {
  const x = (x0 + i * 0.9) * T, y = 30 * T + 5;
  ground.rect(x, y, 3, 6, [196, 190, 176]);
  ground.rect(x, y, 3, 1, [222, 216, 204]);
  ground.rect(x, y + 6, 3, 1, P.shadow, 0.3);
}

// Thế Miếu, the dynastic temple, in the Imperial City's south-west corner;
// before it the nine bronze urns of Cửu Đỉnh in a row, and Hiển Lâm Các, the
// three-tiered pavilion of merit, nearest Ngọ Môn.
place(hall({ w: 6, h: 3, roofRows: 2, roofPal: ROOF.imperial, wall: [150, 46, 38], pillar: [196, 70, 52], pillarStep: 7, doorW: 8, doorFill: [60, 30, 24] }), 43, 31, 1);
for (let i = 0; i < 9; i++) {
  const cx = 43.4 * T + i * 10.5, cy = 34.6 * T;
  ground.ellipse(cx, cy + 6, 4, 1.5, P.shadow, 0.25);
  ground.rect(cx - 3, cy + 3, 1, 3, [70, 60, 44]); ground.rect(cx + 2, cy + 3, 1, 3, [70, 60, 44]);   // legs
  ground.ellipse(cx, cy, 4, 3.5, [104, 90, 62]);
  ground.ellipse(cx - 1, cy - 1, 2, 1.5, [150, 132, 92]);
  ground.rect(cx - 4, cy - 4, 8, 1, [84, 72, 50]);                                                  // rim
  ground.set(cx - 5, cy - 3, [84, 72, 50]); ground.set(cx + 4, cy - 3, [84, 72, 50]);                // handles
}
{
  const cv = new Canvas(2 * T, 4 * T);
  const red = [150, 46, 38], col = [196, 70, 52];
  cv.rect(3, 54, 26, 10, [180, 172, 160]);
  cv.rect(3, 54, 26, 2, [204, 196, 184]);
  for (const [y, w, roofY, roofH] of [[44, 22, 38, 7], [30, 16, 24, 7], [16, 10, 9, 8]]) {
    const x = 16 - w / 2;
    cv.rect(x, y, w, 10, red);
    for (let px = x + 1; px < x + w - 1; px += 4) cv.rect(px, y, 1, 10, col);
    roof(cv, x - 3, roofY, w + 6, roofH, ROOF.imperial, 3);
  }
  place(cv, 45, 35, 1);
}

// The royal garden in the south-east corner: stone lanterns along its paths
// (its trees are planted with the others).
for (const [tx, ty] of [[62.3, 32.4], [66.3, 32.4], [62.3, 36.6], [66.3, 36.6], [64.3, 38.4]]) {
  const x = tx * T, y = ty * T;
  ground.ellipse(x + 3, y + 10, 4, 1.5, P.shadow, 0.25);
  ground.rect(x + 1, y + 6, 5, 4, [168, 162, 150]);                      // base
  ground.rect(x + 2, y + 2, 3, 4, [190, 184, 172]);                      // light box
  ground.rect(x + 3, y + 3, 1, 2, [250, 214, 120]);                      // the flame
  ground.rect(x, y, 7, 2, [140, 134, 124]);                              // cap
  ground.set(x + 3, y - 1, [140, 134, 124]);
}

// Thái Hòa palace — the curated collection — and the six CEFR halls.
place(palace({ w: 8, h: 5, roofPal: ROOF.imperial, wall: [150, 46, 38], pillar: [196, 70, 52] }), 51, 25, 3);
const HALL = (roofPal = ROOF.imperial) => hall({
  w: 4, h: 4, roofRows: 2, roofPal, wall: [128, 52, 40], pillar: [176, 66, 50], pillarStep: 7, doorW: 8, doorFill: [56, 30, 24],
});
const SYSTEM_HALLS = [
  // [x, y, roof] in the order the levels fill them: A1, A2 nearest Ngọ Môn,
  // then B1–C2 deeper inside.
  [44, 26, ROOF.imperial], [63, 26, ROOF.imperial],
  [44, 17, ROOF.glazed], [49, 17, ROOF.imperial], [58, 17, ROOF.imperial], [63, 17, ROOF.glazed],
];
for (const [x, y, pal] of SYSTEM_HALLS) place(HALL(pal), x, y, 2);

// Tàng Thư Lâu: two storeys on a raised stone base, glazed green roofs, on
// its island in Học Hải lake; a plank bridge crosses to it from the south.
{
  plankDeck(LIBRARY.bridgeX, LIBRARY.lake.y + LIBRARY.lake.h - 2, 2, 2);
  const cv = palace({ w: 6, h: 5, roofPal: ROOF.glazed, wall: [134, 56, 42], pillar: [190, 152, 92] });
  const pw = cv.w, ph = cv.h;
  cv.rect(1, ph - 7, pw - 2, 7, [172, 164, 152]);
  cv.rect(1, ph - 7, pw - 2, 2, [196, 188, 176]);
  for (let x = 4; x < pw - 4; x += 6) cv.rect(x, ph - 4, 3, 2, [150, 142, 132]);
  for (const wx of [12, pw - 24]) {
    cv.rect(wx, ph - 26, 12, 12, [214, 186, 120]);
    for (let k = 0; k < 12; k += 3) { cv.rect(wx + k, ph - 26, 1, 12, [120, 84, 52]); cv.rect(wx, ph - 26 + k, 12, 1, [120, 84, 52]); }
  }
  place(cv, LIBRARY.island.x + 1, LIBRARY.island.y, 3);
}

// A small pavilion on Tịnh Tâm lake, a stone causeway out to it from the
// south shore.
stoneSpan(55, 10, 1, 3);
{
  const cv = new Canvas(3 * T, 3 * T);
  cv.rect(4, 36, 40, 12, [184, 176, 164]);
  for (let x = 8; x < 42; x += 8) cv.rect(x, 26, 2, 10, [160, 50, 40]);
  roof(cv, 6, 12, 36, 14, ROOF.imperial, 4);
  place(cv, 54, 7, 3, { shadow: false });
}

/** An ordinary tile-roofed house — the city between the landmarks. */
const HOUSE = (roofPal, wall = [214, 198, 170]) => hall({
  w: 4, h: 4, roofRows: 2, roofPal, wall, windows: true, windowStep: 9, doorW: 6,
});
// Kinh Thành neighbourhoods inside the walls.
for (const [x, y, pal] of [[33, 7, ROOF.dark], [38, 7, ROOF.terra], [67, 7, ROOF.moss], [72, 7, ROOF.dark], [31, 33, ROOF.terra], [38, 33, ROOF.plum]]) {
  place(HOUSE(pal), x, y, 2);
}

// Duyệt Thị Đường: the royal theatre, where Nhã nhạc court music played —
// a long red hall under a two-tier roof, drums at its door. A lane runs past
// its east end, the way up to Tịnh Tâm lake.
{
  const cv = palace({ w: 6, h: 5, roofPal: ROOF.imperial, wall: [120, 36, 30], pillar: [214, 170, 80] });
  for (const dx of [18, cv.w - 30]) {
    cv.ellipse(dx + 6, cv.h - 10, 6, 5, [170, 60, 44]);
    cv.ellipse(dx + 6, cv.h - 12, 5, 3, [236, 214, 170]);
  }
  place(cv, 70, 13, 3);
}

// ── Kim Long: Thiên Mụ, the garden houses, An Hiên ──

// Thiên Mụ: the seven-storey Phước Duyên tower beside its temple hall.
{
  const w = 4, h = 10;
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const brick = [204, 140, 112], brickShade = [176, 112, 88], ledge = [96, 82, 76], ledgeLight = [126, 110, 100];
  cv.rect(2, ph - 8, pw - 4, 8, [178, 172, 162]);
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
    cv.rect(x - 3, y - 3, tw + 6, 3, ledge);
    cv.rect(x - 3, y - 3, tw + 6, 1, ledgeLight);
    cv.set(x - 4, y - 4, ledge); cv.set(x + tw + 3, y - 4, ledge);
    y -= 3;
  }
  cv.rect(pw / 2 - 2, y - 6, 4, 6, [210, 170, 80]);
  cv.rect(pw / 2 - 1, y - 10, 2, 4, [230, 196, 100]);
  place(cv, 4, 37, 2);
}
place(hall({ w: 5, h: 5, roofRows: 3, roofPal: ROOF.dark, wall: [226, 214, 186], pillar: [150, 60, 46], pillarStep: 10 }), 9, 42, 2);

// Văn Miếu: the temple of literature, its hall flanked by stele pavilions —
// the stone tablets that carried the names of the laureates.
{
  place(hall({ w: 6, h: 5, roofRows: 3, roofPal: ROOF.dark, wall: [150, 54, 40], pillar: [196, 160, 96], pillarStep: 9, doorW: 10 }), 17, 39, 2);
  for (const x of [14, 24]) {
    const cv = new Canvas(2 * T, 3 * T);
    cv.rect(6, 22, 20, 22, [150, 148, 142]);                // the stele
    cv.rect(8, 24, 16, 18, [122, 120, 116]);
    for (let y = 27; y < 40; y += 3) cv.rect(10, y, 12, 1, [168, 166, 160]); // carved lines
    for (const px of [2, 27]) cv.rect(px, 18, 3, 28, [160, 50, 40]);
    roof(cv, 2, 8, 28, 10, ROOF.dark, 3);
    place(cv, x, 41, 1);
  }
}

// An Hiên — your home: a bigger garden house with flower beds.
{
  const cv = hall({ w: 6, h: 5, roofRows: 3, roofPal: ROOF.terra, wall: [120, 82, 58], pillar: [96, 62, 44], pillarStep: 9, doorW: 8, doorFill: [60, 40, 30], windows: true, windowStep: 12, windowFrame: [196, 160, 110], glass: [80, 64, 50] });
  place(cv, 10, 7, 3);
  for (const fx of [10 * T + 6, 10 * T + 66]) {
    ground.rect(fx, 12 * T - 1, 20, 1, [120, 90, 64]);
    for (let i = 0; i < 9; i++) ground.set(fx + 2 + i * 2, 12 * T - 3, [[236, 150, 178], [250, 214, 110], [190, 150, 220]][i % 3]);
  }
}

// Eight Kim Long garden houses for collections: two rows of four.
const HOUSE_X = [5, 10, 15, 20];
const HOUSE_ROWS = [18, 27];
const HOUSE_ROOFS = [ROOF.dark, ROOF.terra, ROOF.moss, ROOF.plum];
HOUSE_ROWS.forEach((y, r) => HOUSE_X.forEach((x, i) => {
  place(hall({
    w: 4, h: 4, roofRows: 2, roofPal: HOUSE_ROOFS[(i + r) % HOUSE_ROOFS.length],
    wall: [124, 86, 62], pillar: [98, 66, 46], pillarStep: 8, doorW: 6, doorFill: [62, 42, 32],
  }), x, y, 2);
}));

// ── Đông Ba and Gia Hội ──

// Đông Ba market: a long cream hall with stall awnings and the clock gable,
// on the corner where the Đông Ba canal meets the river.
{
  const w = 12, h = 7;
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const bodyY = ph - 40;
  facade(cv, 2, bodyY, pw - 4, 40, { wall: [232, 220, 192], windows: true, windowStep: 12, glass: [70, 80, 84], doorW: 14, doorH: 16, doorFill: [70, 54, 44] });
  roof(cv, 2, bodyY - 26, pw - 4, 26, ROOF.terra, 7);
  const awn = [[176, 92, 80], [92, 140, 130], [212, 178, 92], [140, 108, 150]];
  for (let x = 6, i = 0; x < pw - 10; x += 14, i++) {
    if (Math.abs(x + 6 - pw / 2) < 18) continue;
    const c = awn[i % awn.length];
    for (let ax = 0; ax < 12; ax++) cv.rect(x + ax, bodyY + 18, 1, 6, ax % 4 < 2 ? c : mix(c, [255, 255, 255], 0.35));
  }
  const gx = pw / 2 - 20, gy = bodyY - 40;
  cv.rect(gx, gy + 6, 40, 38, [238, 228, 204]);
  cv.rect(gx, gy + 6, 40, 2, [206, 194, 168]);
  for (let i = 0; i < 20; i++) cv.rect(gx + i, gy + 6 - Math.floor(i / 3), 40 - i * 2, 1, [238, 228, 204]);
  cv.rect(gx + 18, gy - 2, 4, 2, [176, 92, 80]);
  cv.ellipse(pw / 2, gy + 18, 7, 7, [92, 80, 70]);
  cv.ellipse(pw / 2, gy + 18, 6, 6, [250, 246, 236]);
  cv.rect(pw / 2, gy + 13, 1, 6, [40, 36, 34]);
  cv.rect(pw / 2, gy + 18, 4, 1, [40, 36, 34]);
  cv.rect(gx + 8, gy + 30, 24, 4, [176, 92, 80]);
  place(cv, 85, 40, 4);
}

// Gia Hội: old shophouses along the lane, purely scenery.
for (const [x, pal] of [[85, ROOF.dark], [90, ROOF.terra], [95, ROOF.moss]]) place(HOUSE(pal), x, 32, 2);
for (const [x, y, pal] of [[86, 22, ROOF.plum], [92, 22, ROOF.dark], [88, 12, ROOF.terra], [95, 14, ROOF.moss]]) place(HOUSE(pal), x, y, 2);

// Cồn Hến chè stall: a tiny hut with a striped awning, stools out front.
{
  const cv = new Canvas(2 * T, 2 * T);
  cv.rect(3, 14, 26, 16, [196, 170, 128]);
  cv.rect(12, 20, 8, 10, [96, 70, 50]);
  for (let x = 0; x < 32; x++) cv.rect(x, 8, 1, 6, x % 6 < 3 ? [92, 140, 130] : [236, 232, 220]);
  roof(cv, 2, 3, 28, 5, ROOF.dark, 2);
  place(cv, 110, 38, 1, { shadow: false });
  for (const [sx, sy] of [[109.2, 40.3], [112.4, 40.2]]) ground.rect(sx * T, sy * T, 3, 3, [150, 110, 72]);
}

// ── South bank ──

// Ga Huế: the cream railway station, with its tracks running west–east.
{
  for (let x = 6 * T; x < 47 * T; x++) {
    for (let y = 67 * T + 2; y < 69 * T - 2; y++) ground.set(x, y, mix([150, 140, 126], [130, 120, 108], hash(x, y) * 0.6));
    if (x % 6 < 2) ground.rect(x, 67 * T + 4, 2, T * 2 - 8, [104, 80, 60]);   // sleepers
    ground.set(x, 67 * T + 9, [96, 100, 108]);
    ground.set(x, 68 * T + 6, [96, 100, 108]);
  }
  const cv = hall({ w: 9, h: 5, roofRows: 2, roofPal: ROOF.terra, wall: [236, 222, 186], pillar: [196, 170, 120], pillarStep: 12, windows: true, windowStep: 11, doorW: 12, doorFill: [80, 64, 50] });
  // A little clock tower over the door.
  cv.rect(cv.w / 2 - 10, 2, 20, 26, [240, 228, 196]);
  cv.ellipse(cv.w / 2, 12, 5, 5, [250, 246, 236]);
  cv.rect(cv.w / 2, 8, 1, 4, [40, 36, 34]);
  place(cv, 23, 61, 3);
}

// Quốc Học: the maroon colonial school with white trim and a portico.
{
  const w = 12, h = 5;
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const bodyY = ph - 44;
  facade(cv, 2, bodyY, pw - 4, 44, {
    wall: [156, 60, 52], windows: true, windowStep: 11, windowFrame: [240, 236, 226], glass: [64, 104, 88], door: false,
  });
  for (let x = 2; x < pw - 2; x += 22) cv.rect(x, bodyY + 2, 2, 40, [236, 230, 218]);
  cv.rect(2, bodyY + 20, pw - 4, 2, [236, 230, 218]);
  for (let wx = 7; wx < pw - 10; wx += 11) {
    if (Math.abs(wx - pw / 2) < 20) continue;
    cv.rect(wx, bodyY + 25, 5, 8, [240, 236, 226]);
    cv.rect(wx + 1, bodyY + 26, 3, 6, [64, 104, 88]);
  }
  roof(cv, 2, bodyY - 30, pw - 4, 30, ROOF.slate, 8);
  const px = pw / 2 - 18;
  cv.rect(px, bodyY - 4, 36, 48, [156, 60, 52]);
  for (let x = px + 2; x < px + 36; x += 8) cv.rect(x, bodyY + 6, 3, 36, [244, 240, 232]);
  for (let i = 0; i < 12; i++) cv.rect(px + i * 1.5, bodyY - 4 - i, 36 - i * 3, 1, [240, 236, 226]);
  cv.rect(px - 2, bodyY + 4, 40, 3, [240, 236, 226]);
  cv.rect(pw / 2 - 5, bodyY + 30, 10, 12, [60, 40, 32]);
  place(cv, 35, 60, 3);
}

// Lê Lợi park: flower beds between the bridges.
for (const [x, y] of [[53, 61], [59, 61], [53, 64], [59, 64]]) {
  ground.rect(x * T, y * T, 3 * T, T + 6, [120, 90, 64]);
  for (let i = 0; i < 20; i++) ground.set(x * T + 3 + (i % 10) * 4, y * T + 4 + Math.floor(i / 10) * 8, [[236, 150, 178], [250, 214, 110], [190, 150, 220], [240, 240, 236]][i % 4]);
  mark(used, x, y, 3, 2);
}

// The walking street: shophouses with lanterns strung across.
for (const [x, pal] of [[70, ROOF.terra], [75, ROOF.dark], [80, ROOF.plum]]) place(HOUSE(pal, [222, 206, 176]), x, 64, 2);
for (let x = 69 * T + 4; x < 86 * T; x += 10) {
  const y = 68 * T + 3 + Math.round(Math.sin(x / 9) * 1.5);
  ground.rect(x, y, 2, 3, [214, 72, 56]);
  glow(x + 1, y + 1, [255, 140, 90], 2);
}

// Cung An Định: the European-style palace on the An Cựu canal.
{
  const cv = palace({ w: 8, h: 5, roofPal: ROOF.slate, wall: [234, 220, 190], pillar: [196, 172, 120] });
  place(cv, 88, 66, 3);
}

// Phố Tây and Vỹ Dạ, east of the bend: a few houses among the trees.
for (const [x, y, pal] of [[103, 60, ROOF.terra], [108, 60, ROOF.dark], [113, 58, ROOF.moss], [112, 66, ROOF.plum]]) place(HOUSE(pal), x, y, 2);

// Ngự Bình: the flat-topped "royal screen" hill, with pines.
const HILL = { cx: 57 * T, cy: 81.2 * T, rx: 7 * T, ry: 3.8 * T };
{
  const { cx, cy, rx, ry } = HILL;
  for (let y = Math.floor(cy - ry); y < cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      const e = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (e > 1) continue;
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
  for (let y = ph - 120; y < ph - 2; y += 3) cv.rect(pw / 2 - 10, y, 20, 2, y % 6 === 0 ? stLight : stLine);
  for (const sx of [14, 26, 38, pw - 42, pw - 30, pw - 18]) {
    for (const sy of [ph - 50, ph - 30]) {
      cv.rect(sx, sy, 5, 9, stDark);
      cv.rect(sx + 1, sy - 3, 3, 3, stLine);
      cv.rect(sx + 1, sy + 1, 3, 3, st);
    }
  }
  const spx = pw / 2 - 20, spy = ph - 116;
  cv.rect(spx + 4, spy + 18, 32, 24, stDark);
  cv.rect(spx + 15, spy + 22, 10, 16, [70, 70, 68]);
  roof(cv, spx, spy + 6, 40, 12, ROOF.slate, 4);
  const mpx = pw / 2 - 34, mpy = ph - 176;
  cv.rect(mpx + 4, mpy + 18, 60, 20, [96, 94, 92]);
  for (let x = mpx + 8; x < mpx + 64; x += 8) cv.rect(x, mpy + 20, 2, 18, stLight);
  cv.rect(pw / 2 - 5, mpy + 26, 10, 12, [44, 42, 40]);
  roof(cv, mpx, mpy + 4, 68, 14, ROOF.slate, 5);
  place(cv, 2, 70, 9);
}

// ── 7. Trees ──
const treeKinds = {
  // Round broadleaf crown.
  leaf: { crown: [84, 130, 86], light: [104, 150, 98], dark: [64, 106, 72] },
  // Bằng lăng — Huế's purple.
  lilac: { crown: [150, 116, 172], light: [176, 144, 196], dark: [116, 88, 140] },
  // Phượng — flame tree.
  flame: { crown: [194, 96, 66], light: [220, 128, 86], dark: [150, 70, 50] },
  // The old riverside shade trees — a deeper, cooler green.
  deep: { crown: [64, 112, 76], light: [84, 132, 90], dark: [48, 90, 62] },
};

/** Draw a tree canvas into the map: the ground layer, and its top `overRows`
 *  again over the buddy, so walking behind it reads right. */
function stand(cv, tx, ty, overRows, shadowRx, solidTiles = [[tx, ty]]) {
  ground.ellipse(tx * T + 9, ty * T + 15, shadowRx, Math.max(2, shadowRx / 3), P.shadow, 0.22);
  const ox = (tx + 0.5) * T - cv.w / 2, oy = (ty + 1) * T - cv.h;
  ground.blit(cv, ox, oy);
  over.blit(cv, ox, oy, [0, overRows]);
  for (const [x, y] of solidTiles) if (solid[y]?.[x] === false) solid[y][x] = true;
}

/** Cây đa — a banyan: an old, wide canopy on a thick trunk, aerial roots
 *  hanging. Three tiles across; the big tree of pagodas and village greens. */
function banyan(tx, ty) {
  const cv = new Canvas(3 * T, 3 * T);
  const bark = [96, 70, 50], barkLight = [122, 92, 66];
  cv.rect(20, 28, 8, 20, bark);
  cv.rect(20, 28, 2, 20, barkLight);
  for (const [x, w] of [[16, 4], [28, 4]]) cv.rect(x, 42, w, 6, bark);          // root flare
  cv.ellipse(24, 18, 23, 15, [52, 92, 60]);
  cv.ellipse(23, 16, 21, 13, [70, 116, 76]);
  cv.ellipse(16, 11, 9, 6, [90, 136, 92]);
  cv.ellipse(32, 13, 8, 5, [84, 128, 86]);
  for (let i = 0; i < 30; i++) cv.set(4 + Math.floor(rand() * 40), 4 + Math.floor(rand() * 24), [52, 92, 60]);
  for (const x of [8, 11, 15, 33, 36, 40]) {                                    // aerial roots
    const len = 8 + Math.floor(rand() * 10);
    for (let y = 26; y < 26 + len; y++) cv.set(x, y, y % 3 ? [112, 86, 62] : [92, 70, 50]);
  }
  stand(cv, tx, ty, 2 * T + 6, 16, [[tx - 1, ty], [tx, ty], [tx + 1, ty]]);
  mark(used, tx - 2, ty - 3, 5, 5);
}

/** Liễu — a weeping willow by the water: a small dome, strands hanging down. */
function willow(tx, ty) {
  const cv = new Canvas(2 * T, 2 * T);
  cv.rect(15, 18, 3, 13, [104, 80, 58]);
  cv.ellipse(16, 9, 11, 7, [80, 132, 80]);
  for (let x = 4; x <= 28; x += 2) {
    const top = 6 + Math.round(Math.abs(x - 16) * 0.35);
    const len = 14 + Math.floor(rand() * 8) - Math.round(Math.abs(x - 16) * 0.3);
    for (let y = top; y < top + len; y++) cv.set(x + (y > top + len - 4 ? 1 : 0), y, y % 2 ? [92, 146, 86] : [68, 120, 70]);
  }
  stand(cv, tx, ty, T + 6, 8);
  mark(used, tx - 1, ty - 1, 3, 3);
}

/** Bàng — the Indian almond: flat tiers stacked like a pagoda roof; some
 *  turn red. */
function bang(tx, ty, red = false) {
  const cv = new Canvas(2 * T, 2 * T);
  const [dark, mid, light] = red
    ? [[150, 66, 46], [188, 92, 58], [214, 124, 78]]
    : [[58, 104, 66], [80, 130, 82], [104, 154, 96]];
  cv.rect(15, 16, 3, 15, [104, 80, 58]);
  for (const [y, rx] of [[20, 15], [13, 12], [7, 8]]) {
    cv.ellipse(16, y + 1, rx, 3, dark);
    cv.ellipse(16, y, rx - 1, 3, mid);
    cv.ellipse(14, y - 1, rx - 5, 1, light);
  }
  stand(cv, tx, ty, T + 6, 9);
  mark(used, tx - 1, ty - 1, 3, 3);
}

/** Tre — a clump of bamboo: tall, thin, jointed stalks with leaves at the
 *  tops; the green hedge of a Huế village. */
function bamboo(tx, ty) {
  const cv = new Canvas(2 * T, 2 * T);
  // Stalks two pixels wide (lit and shaded), jointed every few pixels.
  for (const [x, h] of [[5, 22], [9, 28], [13, 25], [16, 31], [20, 27], [24, 29], [27, 21]]) {
    for (let y = 31 - h; y < 31; y++) {
      const joint = (31 - y) % 5 === 0;
      cv.set(x, y, joint ? [70, 96, 48] : [138, 172, 84]);
      cv.set(x + 1, y, joint ? [60, 84, 42] : [100, 136, 62]);
    }
    // A spray of narrow leaves at the top, and a few down the stalk.
    for (const [dx, dy] of [[-3, 1], [-2, 0], [-1, 1], [2, 0], [3, 1], [4, 2], [-3, 4], [-2, 5], [3, 5], [4, 6], [-2, 9], [3, 10]]) {
      cv.set(x + dx, 31 - h + dy, dy % 2 ? [56, 112, 58] : [78, 136, 70]);
      cv.set(x + dx + (dx > 0 ? 1 : -1), 31 - h + dy, [56, 112, 58]);
    }
  }
  stand(cv, tx, ty, T + 6, 10);
  mark(used, tx - 1, ty - 1, 3, 3);
}

/** Hoa sứ — frangipani: a twisting grey trunk, a few clumps of leaves, white
 *  flowers with yellow hearts. Grown at pagodas and temples. */
function frangipani(tx, ty) {
  const cv = new Canvas(2 * T, 2 * T);
  const bark = [130, 118, 104];
  for (let y = 16; y < 31; y++) cv.set(15 + (y < 22 ? Math.round((22 - y) / 3) : 0), y, bark);
  for (let i = 0; i < 6; i++) { cv.set(14 - i, 16 - i, bark); cv.set(18 + i, 15 - i, bark); }
  for (const [cx, cy] of [[8, 8], [24, 7], [16, 5]]) {
    cv.ellipse(cx, cy, 6, 4, [72, 120, 74]);
    cv.ellipse(cx - 1, cy - 1, 4, 2, [96, 146, 92]);
  }
  for (const [x, y] of [[6, 6], [10, 9], [22, 5], [26, 8], [15, 3], [18, 6], [8, 11]]) {
    cv.set(x, y, [250, 248, 240]); cv.set(x + 1, y, [250, 248, 240]); cv.set(x, y + 1, [250, 248, 240]);
    cv.set(x + 1, y + 1, [240, 196, 80]);
  }
  stand(cv, tx, ty, T + 6, 7);
  mark(used, tx - 1, ty - 1, 3, 3);
}

/** Room for a three-tile banyan: like canPlant, a tile wider each side. */
function canPlantWide(tx, ty) {
  return canPlant(tx - 1, ty) && canPlant(tx + 1, ty) && canPlant(tx, ty - 1);
}

/** Plant any kind of tree by name. */
function plant(kind, tx, ty) {
  if (kind === 'banyan') return banyan(tx, ty);
  if (kind === 'willow') return willow(tx, ty);
  if (kind === 'bang') return bang(tx, ty);
  if (kind === 'bangRed') return bang(tx, ty, true);
  if (kind === 'bamboo') return bamboo(tx, ty);
  if (kind === 'frangipani') return frangipani(tx, ty);
  return tree(tx, ty, kind);
}

/** Plant `n` of a kind somewhere open near (cx, cy) — for the trees that
 *  belong to a place: banyans at a pagoda, bamboo round a village. */
function plantAround(kind, cx, cy, r, n) {
  const fits = kind === 'banyan' ? canPlantWide : canPlant;
  for (let i = 0, done = 0; i < 400 && done < n; i++) {
    const tx = Math.round(cx + (rand() * 2 - 1) * r), ty = Math.round(cy + (rand() * 2 - 1) * r);
    if (tx < 2 || tx > W - 3 || ty < 3 || ty > H - 2 || !fits(tx, ty)) continue;
    plant(kind, tx, ty);
    done++;
  }
}

/** An areca palm (cau): a slim ringed trunk and a burst of fronds — the
 *  garden palm of Vỹ Dạ and Kim Long. */
function palm(tx, ty) {
  if (solid[ty]?.[tx] === undefined) return;
  const cv = new Canvas(2 * T, 2 * T);
  for (let y = 10; y < 31; y++) cv.set(15 + (y < 18 ? 1 : 0), y, y % 4 === 0 ? [120, 104, 80] : [150, 132, 100]);
  const fronds = [[-1, -0.35], [1, -0.35], [-1, 0.25], [1, 0.25], [-0.45, -1], [0.45, -1], [0, -1]];
  for (const [dx, dy] of fronds) {
    for (let i = 1; i < 11; i++) {
      const x = 16 + dx * i, y = 10 + dy * i + (Math.abs(dx) > 0.5 ? (i * i) / 22 : 0);
      cv.set(x, y, i > 7 ? [70, 120, 74] : [88, 140, 86]);
      cv.set(x, y + 1, [62, 104, 68]);
    }
  }
  ground.ellipse(tx * T + 9, ty * T + 15, 5, 2, P.shadow, 0.22);
  ground.blit(cv, (tx - 0.5) * T, (ty - 1) * T);
  over.blit(cv, (tx - 0.5) * T, (ty - 1) * T, [0, T + 4]);
  solid[ty][tx] = true;
  mark(used, tx, ty - 1, 1, 2);
}
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


/** Room for a tree with its trunk at (tx, ty): nothing built, paved or wet
 *  around it. */
function canPlant(tx, ty) {
  for (let j = ty - 2; j <= ty + 1; j++) {
    for (let k = tx - 1; k <= tx + 1; k++) {
      if (used[j]?.[k] !== false || solid[j]?.[k]) return false;
      if (isWater(k * T + 8, j * T + 8) || isWater(k * T, j * T) || isWater(k * T + 15, j * T + 15)) return false;
    }
  }
  return true;
}

// Purple bằng lăng along both banks — the city's colour.
for (let x = 2; x < 96; x += 4) {
  if (canPlant(x, 61)) tree(x, 61, x % 3 ? 'lilac' : 'leaf');
  if (x < 28 && canPlant(x, 45)) tree(x, 45, 'lilac');
}
// The Perfume River's banks, lined with trees the way Huế's are. The
// riverside roads run close to the water, so these stand on the grass strip
// between — where canPlant's margins would never let a tree go. bankOk is
// their own rule: dry grass, not a road, a bridge, the wharf or a building.
const onRoad = (tx, ty) => ROADS.some(([x, y, w, h]) => tx >= x && tx < x + w && ty >= y && ty < y + h);
const nearRoad = (tx, ty) => ROADS.some(([x, y, w, h]) => tx >= x - 1 && tx < x + w + 1 && ty >= y - 1 && ty < y + h + 1);
const RIVER_BRIDGES = [[19, 23], [32, 35], [66, 69], [75, 78]];
const BANK_KEEP_CLEAR = [
  ...RIVER_BRIDGES.map(([a, b]) => [a - 1, 46, b - a + 3, 15]),
  [41, 48, 19, 12],        // the dragon-boat wharf, its boat, Phu Văn Lâu's landing
  [99, 37, 11, 8],         // the Cồn Hến footbridge
];
function bankOk(tx, ty) {
  if (solid[ty]?.[tx] !== false || onRoad(tx, ty)) return false;   // the trunk stands off the road
  for (const y of [ty, ty - 1]) {                                     // trunk and crown clear of buildings;
    if (solid[y]?.[tx] !== false) return false;                       // the crown may overhang a road
    if (used[y][tx] && !nearRoad(tx, y)) return false;
  }
  if (isWater(tx * T + 8, ty * T + 8)) return false;
  return !BANK_KEEP_CLEAR.some(([x, y, w, h]) => tx >= x && tx < x + w && ty >= y && ty < y + h);
}
{
  const kinds = ['deep', 'willow', 'leaf', 'flame', 'bang', 'deep', 'lilac', 'willow', 'leaf', 'bangRed', 'deep', 'flame'];
  let k = 0;
  // Walk the river; on each side step out from the middle to the first dry
  // tile — the bank — and plant there, every couple of tiles.
  for (let s = 1.5 * T; s < RIVER.length; s += 2 * T) {
    const g = RIVER.segs.find((seg) => s >= seg.s0 && s < seg.s0 + seg.len);
    if (!g) continue;
    const t = (s - g.s0) / g.len;
    const cx = g.ax + (g.bx - g.ax) * t, cy = g.ay + (g.by - g.ay) * t;
    const nx = -(g.by - g.ay) / g.len, ny = (g.bx - g.ax) / g.len;
    for (const side of [-1, 1]) {
      let off = riverHalfWidth(s) * 0.6;
      while (off < riverHalfWidth(s) + 3 * T && isWater(cx + nx * off * side, cy + ny * off * side)) off += T / 4;
      const tx = Math.round((cx + nx * (off + T * 0.5) * side) / T - 0.5);
      const ty = Math.round((cy + ny * (off + T * 0.5) * side) / T - 0.5);
      if (tx < 1 || tx > W - 2 || ty < 2 || ty > H - 2 || !bankOk(tx, ty)) continue;
      plant(kinds[k++ % kinds.length], tx, ty);
    }
  }
}
// Trees on the islets: Dã Viên's park, Cồn Hến's village gardens.
for (const [x, y] of [[30, 53], [37, 53], [105, 45], [108, 47], [114, 39], [116, 36], [112, 45], [104, 43]]) {
  if (bankOk(x, y) && onIslet(x * T + 8, y * T + 8)) tree(x, y, 'deep');
}
// Areca palms in the garden villages — Vỹ Dạ across the river, Kim Long upriver.
for (const [x, y] of [[104, 58], [107, 63], [111, 61], [116, 64], [102, 67], [118, 57], [3, 10], [7, 16], [17, 17], [23, 26], [5, 28]]) {
  if (bankOk(x, y)) palm(x, y);
}
// Trees that belong to their place: old banyans and frangipani at Thiên Mụ
// and Văn Miếu, bamboo round the villages of Kim Long, Gia Hội and Vỹ Dạ,
// an almond tree or two by the Citadel's gates.
plantAround('banyan', 7, 33, 4, 1);
plantAround('frangipani', 10, 36, 4, 2);
plantAround('banyan', 14, 34, 4, 1);
plantAround('frangipani', 24, 41, 3, 2);
for (const [cx, cy] of [[8, 18], [20, 28], [14, 40]]) plantAround('bamboo', cx, cy, 5, 2);   // Kim Long
for (const [cx, cy] of [[92, 12], [104, 22], [96, 28]]) plantAround('bamboo', cx, cy, 5, 2); // Gia Hội
for (const [cx, cy] of [[106, 68], [114, 74]]) plantAround('bamboo', cx, cy, 5, 2);          // Vỹ Dạ
plantAround('frangipani', 64, 33, 2, 2);      // the royal garden in the Imperial City
plantAround('bang', 65, 37, 2, 1);
plantAround('bang', 40, 64, 6, 2);
plantAround('bangRed', 88, 74, 6, 2);
plantAround('banyan', 70, 76, 6, 1);
// Pines on Ngự Bình and around Thiên Mụ.
for (const [x, y] of [[53, 79], [56, 78], [59, 79], [51, 82], [61, 82], [55, 83], [58, 84], [1, 36], [1, 41], [8, 36]]) pine(x, y);
// A few flame trees for a warm accent.
for (const [x, y] of [[24, 9], [100, 26], [44, 64], [109, 70]]) if (canPlant(x, y)) tree(x, y, 'flame');
// Scatter broadleaf trees over the remaining open grass, sparsely.
{
  let placed = 0;
  for (let i = 0; i < 8000 && placed < 70; i++) {
    const tx = 1 + Math.floor(rand() * (W - 2)), ty = 2 + Math.floor(rand() * (H - 3));
    if (!canPlant(tx, ty)) continue;
    const r = rand();
    plant(r < 0.4 ? 'leaf' : r < 0.55 ? 'deep' : r < 0.67 ? 'lilac' : r < 0.79 ? 'bang' : r < 0.86 ? 'bangRed' : r < 0.94 ? 'bamboo' : 'frangipani', tx, ty);
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

// Arrive at the south end of Trường Tiền.
const SPAWN = [76.5, 59];
point('spawn', ...SPAWN);
// The first label names the (single) area; `hidden` keeps it off the map.
point('label', 2, 2, { text: 'Huế', theme: 'forest', hidden: 'true' });
point('label', 4, 54.3, { text: 'Sông Hương', theme: 'forest' });
point('label', 23.4, 56.4, { text: 'Cầu Nguyễn Hoàng', theme: 'desert' });
point('label', 35.4, 51.2, { text: 'Cầu Dã Viên', theme: 'desert' });
point('label', 69.4, 51.2, { text: 'Cầu Phú Xuân', theme: 'desert' });
point('label', 78.4, 51.2, { text: 'Cầu Trường Tiền', theme: 'desert' });
point('label', 4, 4.5, { text: 'Kim Long', theme: 'forest' });
point('label', 86, 5, { text: 'Gia Hội', theme: 'forest' });
point('label', 108, 54, { text: 'Vỹ Dạ', theme: 'forest' });
point('label', 52, 84.6, { text: 'Ngự Bình', theme: 'forest' });
// The landmarks with a story to tell (src/game/mapPlaces.ts), named over
// their roofs — quiet until you walk up, then lit. Centred on the building:
// a label is placed by its left edge, and a character is about a fifth of a
// tile wide.
const landmark = (text, x, y) => point('label', x - text.length * 0.095, y - 0.6, { text, theme: 'desert' });
landmark('Chùa Thiên Mụ', 6, 39.5);
landmark('Ngọ Môn', 55, 34.5);
landmark('Kỳ Đài', 55, 44);
landmark('Tàng Thư Lâu', 36, 21);
landmark('Duyệt Thị Đường', 73, 13.2);
landmark('Hồ Tịnh Tâm', 55, 7.5);
landmark('Ga Huế', 27.5, 61.5);
landmark('Trường Quốc Học', 41, 60.5);
landmark('Phố đi bộ', 77, 64.5);
landmark('Cung An Định', 92, 66.5);
landmark('Lăng Khải Định', 8, 70.5);
landmark('Phu Văn Lâu', 55, 49);
landmark('Nghênh Lương Đình', 55, 52);
landmark('Thế Miếu', 46, 31);
landmark('Hiển Lâm Các', 46, 35);

// Progress the city shows (WorldScene): the streak flag on Kỳ Đài, and spots
// on the Hương where a lantern floats for each mastered word. The spots are
// shuffled so the first few lanterns spread along the river, not bunch up.
point('flag', FLAG.x, FLAG.y, { drop: FLAG.drop });
{
  const spots = [];
  for (let s = 3 * T; s < RIVER.length; s += 2.6 * T) {
    const g = RIVER.segs.find((seg) => s >= seg.s0 && s < seg.s0 + seg.len);
    if (!g) continue;
    const t = (s - g.s0) / g.len;
    const cx = g.ax + (g.bx - g.ax) * t, cy = g.ay + (g.by - g.ay) * t;
    const nx = -(g.by - g.ay) / g.len, ny = (g.bx - g.ax) / g.len;
    const off = (rand() * 2 - 1) * Math.max(0, riverHalfWidth(s) - 1.4 * T);
    const x = cx + nx * off, y = cy + ny * off;
    const tx = x / T, ty = y / T;
    if (tx < 2 || tx > W - 2 || ty < 2) continue;
    if (RIVER_BRIDGES.some(([a, b]) => tx > a - 1.5 && tx < b + 1.5 && ty > 48 && ty < 59)) continue;
    if (tx > 41 && tx < 60 && ty > 50) continue;                 // the wharf, the boat, the landing
    if (tx > 100 && tx < 109 && ty > 37 && ty < 43) continue;    // the Cồn Hến footbridge
    if (onIslet(x, y) || ISLETS.some((i) => isletE(i, x, y) < 1.8)) continue;
    if (![[0, 0], [T, 0], [-T, 0], [0, T], [0, -T]].every(([dx, dy]) => isWater(x + dx, y + dy))) continue;
    spots.push([tx, ty]);
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  spots.slice(0, 60).forEach(([x, y], i) => point('lantern', x, y, { order: i }));
}

// The skills' keepers — one person per skill, at its home landmark (see
// src/game/features.ts). Their menus reach every activity, including those
// whose landmarks (Thiên Mụ, Quốc Học, the library…) have no keeper of
// their own.
const FEATURES = [
  ['vocabulary', 91, 47.5, 'Chợ Đông Ba'],
  ['speaking', 111, 40.6, 'Cồn Hến'],
  ['listening', 49, 54.5, 'Thuyền rồng'],
  ['writing', 20, 44.5, 'Văn Miếu'],
  ['you', 13, 12.5, 'Nhà vườn An Hiên'],
  // One keeper for every collection and level, before the throne hall.
  ['collections', 55, 30.5, 'Điện Thái Hòa'],
];
FEATURES.forEach(([feature, x, y, place], slot) => point('station', x, y, { region: 'feature', slot, feature, place }));

// ── 10. Sanity: every slot reachable from the spawn ──
const seen = new Uint8Array(W * H);
{
  const sx = Math.floor(SPAWN[0]), sy = Math.floor(SPAWN[1]);
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
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      if (walls[ty * W + tx]) pv.rect(tx * T, ty * T, T, T, [255, 0, 0], 0.25);
      else if (!seen[ty * W + tx]) pv.rect(tx * T, ty * T, T, T, [0, 80, 255], 0.35); // open but cut off
    }
  }
  for (const o of objects) {
    const c = o.type === 'spawn' ? [255, 255, 255] : o.type === 'label' ? [0, 0, 0] : [255, 220, 0];
    pv.rect(o.x - 3, o.y - 3, 6, 6, c);
  }
  await sharp(Buffer.from(pv.d.buffer), { raw: { width: PW, height: PH, channels: 4 } }).png().toFile(previewPath);
  console.log(`preview → ${previewPath}`);
}

