// Draws the skill rooms — the interiors you step into from a keeper's door
// (src/game/scenes/RoomScene.ts) — as pixel-art PNGs in public/game/rooms/.
//
//   node scripts/generate-rooms.mjs
//
// Same hand as the city (scripts/generate-hue-map.mjs): 16px tiles drawn
// pixel by pixel, a muted palette, stable texture from a hash rather than
// random draw order, so a regeneration changes nothing it didn't mean to.
// A room is one screen, seen the way the city is — back wall at the top,
// floor below — and wider than tall, so it fills a landscape world frame.
// Keep the middle quiet: the skill's menu sits over it.

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const OUT = new URL('../public/game/rooms/', import.meta.url);
mkdirSync(fileURLToPath(OUT), { recursive: true });

/** Stable per-pixel hash in [0, 1). */
const hash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const shade = (c, f) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));

class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c, a = 1) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    const k = Math.min(1, a);
    for (let j = 0; j < 3; j++) this.d[i + j] = Math.round(this.d[i + j] * (1 - k) + c[j] * k);
    this.d[i + 3] = 255;
  }
  get(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  rect(x, y, w, h, c, a = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, a); }
  /** A filled ellipse — fruit, lantern bodies, basket rims. */
  oval(cx, cy, rx, ry, c, a = 1) {
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
      if ((i * i) / (rx * rx + 0.3) + (j * j) / (ry * ry + 0.3) <= 1) this.set(cx + i, cy + j, c, a);
    }
  }
  async save(name) {
    await sharp(Buffer.from(this.d), { raw: { width: this.w, height: this.h, channels: 4 } })
      .png().toFile(fileURLToPath(new URL(name, OUT)));
  }
}

// ── Shared furniture ──

const WOOD = { base: [122, 78, 48], dark: [86, 54, 34], light: [150, 100, 64], line: [100, 64, 40] };
const LACQUER = { base: [150, 44, 36], dark: [110, 30, 26], light: [184, 70, 54] };
const GOLD = { base: [222, 176, 72], dark: [168, 124, 44], light: [246, 214, 128] };

/** A red lacquered pillar with gold cap and foot. */
function pillar(cv, x, y0, y1) {
  cv.rect(x, y0, 8, y1 - y0, LACQUER.base);
  cv.rect(x, y0, 2, y1 - y0, LACQUER.light);
  cv.rect(x + 6, y0, 2, y1 - y0, LACQUER.dark);
  cv.rect(x - 1, y0, 10, 3, GOLD.base);
  cv.rect(x - 1, y1 - 4, 10, 4, GOLD.dark);
  cv.rect(x - 1, y1 - 4, 10, 1, GOLD.light);
}

/** A red paper lantern on a cord, with a gold cap and tassel. */
function lantern(cv, x, top, len) {
  cv.rect(x, top, 1, len, [60, 40, 30]);
  const cy = top + len + 6;
  cv.rect(x - 3, cy - 7, 7, 2, GOLD.dark);
  cv.oval(x, cy, 6, 5, [196, 52, 40]);
  cv.oval(x - 2, cy - 1, 2, 3, [226, 96, 70]);
  for (let i = -5; i <= 5; i += 3) cv.rect(x + i, cy - 4, 1, 9, [160, 40, 32]);
  cv.rect(x - 3, cy + 5, 7, 2, GOLD.dark);
  cv.rect(x, cy + 7, 1, 4, GOLD.base);
  cv.rect(x - 1, cy + 10, 3, 2, GOLD.light);
}

/** A wooden stall counter: top, front face with planks, and a shadow. */
function counter(cv, x, y, w, h) {
  cv.rect(x + 2, y + h, w, 3, [0, 0, 0], 0.18);
  cv.rect(x, y, w, 5, WOOD.light);
  cv.rect(x, y + 5, w, h - 5, WOOD.base);
  for (let i = x + 6; i < x + w - 2; i += 10) cv.rect(i, y + 6, 1, h - 7, WOOD.line);
  cv.rect(x, y + h - 2, w, 2, WOOD.dark);
  cv.rect(x, y + 5, w, 1, WOOD.dark);
}

/** A round woven basket, heaped with fruit of one colour. */
function basket(cv, cx, cy, fruit) {
  cv.oval(cx, cy + 3, 9, 4, [140, 104, 58]);
  for (let i = -8; i <= 8; i += 2) cv.set(cx + i, cy + 3, [112, 80, 44]);
  for (let k = 0; k < 7; k++) {
    const fx = cx - 6 + (k % 4) * 4 + (k > 3 ? 2 : 0);
    const fy = cy - (k > 3 ? 3 : 0);
    cv.oval(fx, fy, 2, 2, fruit);
    cv.set(fx - 1, fy - 1, mix(fruit, [255, 255, 255], 0.45));
  }
}

/** A conical leaf hat (nón lá), hung on the wall. */
function hat(cv, cx, top) {
  for (let r = 0; r < 8; r++) {
    const half = Math.round(r * 1.4);
    for (let i = -half; i <= half; i++) cv.set(cx + i, top + r, mix([220, 200, 150], [184, 160, 110], (i + half) / (2 * half + 1)));
  }
  cv.rect(cx - 11, top + 8, 23, 1, [150, 128, 84]);
}

/** A stack of cloth bolts. */
function bolts(cv, x, y, colours) {
  colours.forEach((c, i) => {
    const by = y - i * 5;
    cv.rect(x, by, 22, 5, c);
    cv.rect(x, by, 22, 1, mix(c, [255, 255, 255], 0.3));
    cv.rect(x + 21, by, 1, 5, shade(c, 0.7));
  });
}

// ── The tailor's (tiệm may): where you're dressed before stepping into Huế ──
async function tailor() {
  const W = 384, H = 192, FLOOR = 84;
  const cv = new Canvas(W, H);

  // Back wall: pale green plaster, a beamed ceiling, a dark wainscot.
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
    cv.set(x, y, mix([214, 222, 196], [198, 206, 180], hash(x >> 2, y >> 2) * 0.6));
  }
  cv.rect(0, 0, W, 10, WOOD.dark);
  for (let x = 4; x < W; x += 24) cv.rect(x, 0, 6, 10, WOOD.base);
  cv.rect(0, 10, W, 2, [60, 38, 24]);
  cv.rect(0, FLOOR - 14, W, 14, WOOD.dark);
  cv.rect(0, FLOOR - 14, W, 2, WOOD.light);

  // Shelves of fabric bolts on the left wall.
  for (const sy of [22, 42]) {
    cv.rect(12, sy + 12, 112, 3, WOOD.base);
    cv.rect(12, sy + 12, 112, 1, WOOD.light);
    const colours = [[128, 72, 152], [246, 246, 250], [204, 52, 58], [72, 122, 196], [240, 196, 64], [52, 52, 68], [86, 128, 132]];
    for (let i = 0; i < 14; i++) {
      const c = colours[(i * 3 + sy) % colours.length];
      cv.rect(16 + i * 8, sy, 7, 12, c);
      cv.rect(16 + i * 8, sy, 7, 1, mix(c, [255, 255, 255], 0.35));
      cv.rect(22 + i * 8, sy, 1, 12, shade(c, 0.75));
    }
  }

  // A rail of áo dài on hangers, high on the right wall.
  cv.rect(236, 18, 136, 2, WOOD.dark);
  const dresses = [[128, 72, 152], [246, 246, 250], [204, 52, 58], [72, 122, 196], [240, 196, 64], [128, 72, 152]];
  dresses.forEach((c, i) => {
    const x = 244 + i * 21;
    cv.rect(x + 5, 20, 1, 3, [60, 60, 60]);
    cv.rect(x + 1, 23, 10, 2, shade(c, 0.85));      // shoulders
    cv.rect(x + 2, 25, 8, 12, c);                   // body
    cv.rect(x + 3, 37, 3, 22, c);                   // front panel
    cv.rect(x + 6, 37, 3, 22, shade(c, 0.88));      // back panel
    cv.rect(x + 5, 25, 1, 34, shade(c, 0.7));
    cv.rect(x + 2, 25, 8, 1, mix(c, [255, 255, 255], 0.3));
  });

  // A tall mirror between them, with a gold frame.
  cv.rect(156, 16, 30, 52, GOLD.dark);
  cv.rect(158, 18, 26, 48, [176, 200, 204]);
  for (let i = 0; i < 26; i++) cv.rect(160 + i, 20 + i, 2, 1, [214, 232, 234]);
  cv.rect(158, 18, 26, 1, GOLD.light);

  // A row of nón lá and a khăn đóng on pegs above the mirror's side.
  for (const x of [200, 222]) hat(cv, x, 24);
  cv.rect(196, 42, 30, 6, [34, 38, 64]);
  cv.rect(196, 42, 30, 1, [62, 68, 108]);

  // Floor: warm wooden planks.
  for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
    const plank = Math.floor((y - FLOOR) / 8);
    const seam = (y - FLOOR) % 8 === 0 || (x + plank * 37) % 64 === 0;
    let c = mix([168, 116, 72], [150, 100, 60], hash(plank, (x + plank * 37) >> 6));
    if (seam) c = shade(c, 0.78);
    cv.set(x, y, mix(c, [180, 128, 82], hash(x, y) * 0.12));
  }
  cv.rect(0, FLOOR, W, 2, [0, 0, 0], 0.25);

  // The cutting table on the left, with cloth and scissors on it.
  counter(cv, 14, 98, 88, 22);
  cv.rect(24, 92, 40, 6, [128, 72, 152]);
  cv.rect(24, 92, 40, 1, [160, 104, 184]);
  cv.rect(70, 94, 10, 2, [190, 190, 196]);
  cv.rect(76, 92, 2, 6, [190, 190, 196]);
  // A dress form wearing a white áo dài, on the right.
  cv.rect(330, 132, 2, 20, WOOD.dark);
  cv.rect(322, 150, 18, 3, WOOD.dark);
  cv.rect(324, 96, 14, 6, [246, 246, 250]);
  cv.rect(326, 102, 10, 30, [246, 246, 250]);
  cv.rect(330, 102, 1, 30, [214, 214, 222]);
  cv.rect(328, 92, 6, 4, WOOD.base);

  for (const [x, len] of [[140, 6], [210, 4], [228, 6]]) lantern(cv, x, 12, len);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    const v = Math.max(0, Math.hypot(dx, dy * 0.8) - 0.55);
    if (v > 0) cv.set(x, y, [30, 22, 14], Math.min(0.45, v * 0.8));
  }

  await cv.save('tailor.png');
  console.log(`tailor.png ${W}×${H}`);
}

// ── Shared pieces for the skills' rooms ──

/** Wooden deck or floor planks, laid across. */
function planks(cv, W, y0, y1, base = [168, 116, 72]) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const row = Math.floor((y - y0) / 8);
    const seam = (y - y0) % 8 === 0 || (x + row * 37) % 64 === 0;
    let c = mix(base, shade(base, 0.88), hash(row, (x + row * 37) >> 6));
    if (seam) c = shade(c, 0.78);
    cv.set(x, y, mix(c, shade(base, 1.07), hash(x, y) * 0.12));
  }
  cv.rect(0, y0, W, 2, [0, 0, 0], 0.25);
}

/** The soft vignette every room ends with. */
function vignette(cv, W, H, tint = [40, 22, 14]) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    const v = Math.max(0, Math.hypot(dx, dy * 0.8) - 0.55);
    if (v > 0) cv.set(x, y, tint, Math.min(0.45, v * 0.8));
  }
}

/** A low tea table with a pot and cups. */
function teaTable(cv, x, y) {
  cv.rect(x + 2, y + 9, 30, 3, [0, 0, 0], 0.18);
  cv.rect(x, y, 30, 4, WOOD.light);
  cv.rect(x, y + 4, 30, 2, WOOD.dark);
  cv.rect(x + 2, y + 6, 3, 6, WOOD.dark);
  cv.rect(x + 25, y + 6, 3, 6, WOOD.dark);
  cv.oval(x + 9, y - 3, 4, 3, [86, 128, 132]);     // teapot
  cv.rect(x + 13, y - 4, 3, 1, [86, 128, 132]);
  cv.rect(x + 8, y - 7, 2, 1, [60, 96, 100]);
  for (const cx of [18, 23]) { cv.rect(x + cx, y - 2, 3, 2, [236, 228, 210]); cv.rect(x + cx, y - 2, 3, 1, [200, 170, 110]); }
}

/** A low stool. */
function stool(cv, x, y) {
  cv.rect(x, y, 10, 3, WOOD.base);
  cv.rect(x, y, 10, 1, WOOD.light);
  cv.rect(x + 1, y + 3, 2, 5, WOOD.dark);
  cv.rect(x + 7, y + 3, 2, 5, WOOD.dark);
}

// ── Speaking: Cô Ba's chè stall in the Đông Ba market hall ──
async function speaking() {
  const W = 384, H = 192, FLOOR = 84;
  const cv = new Canvas(W, H);

  // Back wall: warm plaster under a beamed ceiling.
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
    cv.set(x, y, mix([226, 208, 172], [208, 188, 150], hash(x >> 2, y >> 2) * 0.6));
  }
  cv.rect(0, 0, W, 10, WOOD.dark);
  for (let x = 4; x < W; x += 24) cv.rect(x, 0, 6, 10, WOOD.base);
  cv.rect(0, 10, W, 2, [60, 38, 24]);
  cv.rect(0, 26, W, 4, WOOD.base);
  cv.rect(0, 26, W, 1, WOOD.light);
  // Dark wainscot along the foot of the wall.
  cv.rect(0, FLOOR - 16, W, 16, WOOD.dark);
  for (let x = 0; x < W; x += 12) cv.rect(x, FLOOR - 16, 1, 16, [70, 44, 28]);
  cv.rect(0, FLOOR - 16, W, 2, WOOD.light);

  for (const x of [28, 132, 244, 348]) pillar(cv, x, 12, FLOOR);

  // The market's name board, high in the middle: red, gold-framed, with
  // gold strokes standing in for the characters.
  const bx = 160, by = 34, bw = 64, bh = 20;
  cv.rect(bx - 2, by - 2, bw + 4, bh + 4, GOLD.dark);
  cv.rect(bx, by, bw, bh, LACQUER.base);
  cv.rect(bx, by, bw, 1, LACQUER.light);
  for (let i = 0; i < 4; i++) {
    const gx = bx + 7 + i * 14;
    cv.rect(gx, by + 5, 8, 2, GOLD.base);
    cv.rect(gx + 3, by + 5, 2, 11, GOLD.base);
    cv.rect(gx, by + 11, 8, 2, GOLD.light);
  }

  // Wares on the wall: hats on the left, a striped cloth hanging on the right.
  for (const x of [52, 76, 100]) hat(cv, x, 38);
  for (let y = 36; y < 62; y++) for (let x = 268; x < 330; x++) {
    const band = Math.floor((x - 268) / 6) % 3;
    cv.set(x, y, [[86, 128, 132], [196, 150, 84], [150, 66, 60]][band]);
  }
  cv.rect(266, 34, 66, 2, WOOD.dark);

  // Floor: terracotta tiles, each a shade of its own, darker toward the edges.
  for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = x >> 4, ty = (y - FLOOR) >> 4;
    const joint = (x & 15) === 0 || ((y - FLOOR) & 15) === 0;
    let c = mix([184, 104, 72], [164, 88, 60], hash(tx, ty));
    if ((tx + ty) % 2 === 0) c = shade(c, 1.05);
    if (joint) c = shade(c, 0.8);
    cv.set(x, y, mix(c, [196, 120, 86], hash(x, y) * 0.15));
  }
  cv.rect(0, FLOOR, W, 2, [0, 0, 0], 0.25);

  // Stalls: fruit on the left, cloth on the right, words in the middle.
  counter(cv, 12, 96, 104, 26);
  basket(cv, 30, 92, [232, 150, 48]);
  basket(cv, 56, 92, [128, 176, 72]);
  basket(cv, 82, 92, [212, 64, 104]);
  basket(cv, 104, 93, [240, 204, 72]);
  counter(cv, 268, 96, 104, 26);
  bolts(cv, 278, 90, [[86, 128, 132], [150, 66, 60], [210, 190, 140]]);
  bolts(cv, 306, 90, [[196, 150, 84], [104, 92, 140]]);
  bolts(cv, 334, 90, [[150, 66, 60], [86, 128, 132], [226, 214, 190], [196, 150, 84]]);
  // Cô Ba's counter under the name board: her pots of chè and bright bowls.
  counter(cv, 164, 92, 56, 20);
  for (const [i, c] of [[0, [196, 92, 132]], [1, [240, 196, 64]], [2, [78, 156, 106]], [3, [128, 72, 152]]]) {
    cv.oval(174 + i * 12, 88, 5, 3, [60, 60, 66]);
    cv.oval(174 + i * 12, 87, 4, 2, c);
  }
  // Stools out front, for sitting down to talk.
  stool(cv, 150, 140); stool(cv, 222, 140);

  // Floor baskets and a crate by the stalls.
  basket(cv, 128, 132, [232, 150, 48]);
  basket(cv, 256, 134, [128, 176, 72]);
  cv.rect(18, 136, 18, 12, WOOD.base);
  cv.rect(18, 136, 18, 2, WOOD.light);
  cv.rect(18, 141, 18, 1, WOOD.dark);

  for (const [x, len] of [[60, 12], [112, 6], [196, 4], [272, 6], [324, 12]]) lantern(cv, x, 12, len);

  // A soft warm vignette, so the eye rests in the middle.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    const v = Math.max(0, Math.hypot(dx, dy * 0.8) - 0.55);
    if (v > 0) cv.set(x, y, [40, 22, 14], Math.min(0.45, v * 0.8));
  }

  await cv.save('speaking.png');
  console.log(`speaking.png ${W}×${H}`);
}

// ── Vocabulary: Tàng Thư Lâu, the court's archive ──
async function vocabulary() {
  const W = 384, H = 192, FLOOR = 88;
  const cv = new Canvas(W, H);
  // Dark timber walls under a beamed ceiling.
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) cv.set(x, y, mix([132, 92, 60], [116, 80, 52], hash(x >> 3, y >> 2) * 0.6));
  cv.rect(0, 0, W, 10, WOOD.dark);
  for (let x = 4; x < W; x += 24) cv.rect(x, 0, 6, 10, WOOD.base);
  cv.rect(0, 10, W, 2, [60, 38, 24]);
  for (const x of [24, 132, 244, 352]) pillar(cv, x, 12, FLOOR);

  // Shelves from floor to beam between the pillars: rows of bound books and
  // scroll cases, each its own colour and height.
  const spines = [[150, 66, 60], [86, 128, 132], [196, 150, 84], [104, 92, 140], [120, 84, 52], [226, 214, 190], [70, 96, 70]];
  for (const [x0, x1] of [[36, 128], [256, 348]]) {
    cv.rect(x0, 16, x1 - x0, FLOOR - 16, WOOD.dark);
    for (const sy of [30, 48, 66, 84]) {
      cv.rect(x0, sy, x1 - x0, 2, WOOD.light);
      for (let x = x0 + 2, k = 0; x < x1 - 4; k++) {
        const scroll = hash(x, sy) > 0.8;
        const w = scroll ? 6 : 3 + Math.floor(hash(sy, x) * 3);
        const h = scroll ? 6 : 10 + Math.floor(hash(x, sy + 1) * 5);
        const c = spines[(k + sy) % spines.length];
        if (scroll) { cv.oval(x + 3, sy - 4, 3, 3, [226, 214, 190]); cv.set(x + 3, sy - 4, [150, 120, 70]); }
        else { cv.rect(x, sy - h, w, h, c); cv.rect(x, sy - h, w, 1, mix(c, [255, 255, 255], 0.3)); cv.rect(x + w - 1, sy - h, 1, h, shade(c, 0.7)); }
        x += w + 1;
      }
    }
  }

  // The archive's name board, high in the middle, and a hanging scroll under it.
  const bx = 160, by = 18, bw = 64, bh = 18;
  cv.rect(bx - 2, by - 2, bw + 4, bh + 4, GOLD.dark);
  cv.rect(bx, by, bw, bh, LACQUER.base);
  cv.rect(bx, by, bw, 1, LACQUER.light);
  for (let i = 0; i < 3; i++) { const gx = bx + 12 + i * 16; cv.rect(gx, by + 5, 8, 2, GOLD.base); cv.rect(gx + 3, by + 5, 2, 9, GOLD.base); cv.rect(gx, by + 10, 8, 2, GOLD.light); }
  cv.rect(173, 42, 38, 2, WOOD.dark);
  cv.rect(175, 44, 34, 30, [240, 232, 210]);
  for (let i = 0; i < 3; i++) { cv.rect(189, 48 + i * 8, 6, 2, [40, 36, 40]); cv.rect(191, 46 + i * 8, 2, 6, [40, 36, 40]); }
  cv.rect(173, 74, 38, 2, WOOD.dark);

  // A dark skirting where the wall meets the floor of polished boards.
  cv.rect(0, FLOOR - 6, W, 6, [70, 44, 28]);
  cv.rect(0, FLOOR - 6, W, 1, WOOD.light);
  planks(cv, W, FLOOR, H, [170, 124, 80]);

  // The keeper's reading desk on the left: an open book, an ink stone, a
  // stack waiting to be put back.
  counter(cv, 14, 100, 92, 22);
  cv.rect(30, 94, 26, 6, [240, 232, 210]); cv.rect(42, 94, 2, 6, [200, 186, 160]);
  for (let i = 0; i < 3; i++) cv.rect(34 + (i % 2) * 12, 96 + (i >> 1) * 2, 6, 1, [90, 80, 80]);
  cv.rect(62, 95, 9, 5, [40, 40, 46]);
  for (let i = 0; i < 4; i++) { const c = spines[i * 2 % spines.length]; cv.rect(78, 96 - i * 3, 20, 3, c); cv.rect(78, 96 - i * 3, 20, 1, mix(c, [255, 255, 255], 0.3)); }
  // A ladder against the right-hand shelves, and a chest of scrolls.
  for (const lx of [330, 344]) cv.rect(lx, 30, 2, 70, WOOD.light);
  for (let y = 36; y < 100; y += 10) cv.rect(330, y, 16, 2, WOOD.base);
  cv.rect(290, 126, 36, 16, LACQUER.dark); cv.rect(290, 126, 36, 3, GOLD.base); cv.rect(306, 132, 4, 4, GOLD.light);

  for (const [x, len] of [[90, 6], [192, 2], [296, 6]]) lantern(cv, x, 12, len);
  vignette(cv, W, H);
  await cv.save('vocabulary.png');
  console.log(`vocabulary.png ${W}×${H}`);
}

// ── Listening: Duyệt Thị Đường, the royal theatre ──
async function listening() {
  const W = 384, H = 192, STAGE = 96;
  const cv = new Canvas(W, H);
  // The back of the stage: a red wall, a gold-framed painted screen.
  for (let y = 0; y < STAGE; y++) for (let x = 0; x < W; x++) cv.set(x, y, mix(LACQUER.dark, [96, 26, 22], hash(x >> 3, y >> 2) * 0.5));
  cv.rect(112, 18, 160, 56, GOLD.dark);
  cv.rect(115, 21, 154, 50, [220, 196, 140]);
  // On the screen: hills and a river in ink, a red sun.
  for (let x = 115; x < 269; x++) {
    const h = 14 + Math.round(8 * Math.sin((x - 115) / 17) + 5 * Math.sin((x - 115) / 7));
    for (let y = 71 - h; y < 71; y++) cv.set(x, y, mix([120, 130, 110], [92, 104, 88], (y - 71 + h) / h));
  }
  for (let x = 115; x < 269; x++) if (hash(x >> 2, 3) > 0.4) cv.set(x, 66, [170, 190, 180]);
  cv.oval(200, 32, 6, 6, [200, 70, 50]);
  // The proscenium: a gold-trimmed red arch and curtains drawn to the sides.
  cv.rect(0, 0, W, 12, LACQUER.base);
  cv.rect(0, 12, W, 3, GOLD.base);
  for (let x = 8; x < W; x += 24) { cv.rect(x, 3, 10, 6, GOLD.dark); cv.rect(x + 2, 4, 6, 4, GOLD.light); }
  for (const [x0, dir] of [[0, 1], [W - 56, -1]]) {
    for (let x = 0; x < 56; x++) for (let y = 15; y < STAGE + 6; y++) {
      const fold = Math.sin((x * dir + y * 0.08) / 3.2);
      const c = mix([176, 40, 40], [120, 24, 28], (fold + 1) / 2);
      // Gathered at the foot: narrower toward the middle as it falls.
      const reach = 56 - Math.max(0, (y - 40) * 0.25);
      if ((dir === 1 ? x : 56 - x) < reach) cv.set(x0 + x, y, c);
    }
    cv.rect(dir === 1 ? 40 : W - 48, 58, 8, 4, GOLD.base);   // the tie-back
  }
  for (const x of [60, 316]) pillar(cv, x, 15, STAGE + 6);

  // The stage floor, raised: polished boards with a gold edge.
  planks(cv, W, STAGE - 4, STAGE + 10, [150, 96, 60]);
  cv.rect(0, STAGE + 10, W, 3, GOLD.dark);
  cv.rect(0, STAGE + 10, W, 1, GOLD.light);
  cv.rect(0, STAGE + 13, W, 4, LACQUER.dark);
  // The court musicians' instruments on stage: a big drum on its stand, a
  // đàn tranh, a pair of small drums.
  cv.rect(96, 72, 3, 22, WOOD.dark); cv.rect(129, 72, 3, 22, WOOD.dark);
  cv.oval(114, 74, 15, 11, LACQUER.base); cv.oval(114, 74, 11, 9, [226, 204, 160]);
  for (const a of [0, 1, 2, 3, 4, 5]) cv.set(114 + Math.round(13 * Math.cos(a)), 74 + Math.round(10 * Math.sin(a)), GOLD.light);
  cv.rect(160, 86, 64, 4, WOOD.light); cv.rect(160, 90, 64, 2, WOOD.dark);
  for (let i = 0; i < 9; i++) cv.rect(164 + i * 7, 85, 1, 1, [236, 228, 210]);
  for (const dx of [0, 18]) { cv.oval(264 + dx, 88, 7, 4, LACQUER.base); cv.oval(264 + dx, 86, 6, 2, [226, 204, 160]); }

  // The audience floor below: stone tiles, and rows of low stools facing the stage.
  for (let y = STAGE + 17; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = x >> 4, ty = (y - STAGE) >> 4;
    const joint = (x & 15) === 0 || ((y - STAGE - 17) & 15) === 0;
    let c = mix([170, 150, 120], [152, 134, 108], hash(tx, ty));
    if (joint) c = shade(c, 0.85);
    cv.set(x, y, c);
  }
  for (const y of [140, 164]) for (let x = 140; x < 250; x += 26) stool(cv, x, y);

  for (const [x, len] of [[90, 4], [150, 8], [234, 8], [294, 4]]) lantern(cv, x, 15, len);
  vignette(cv, W, H, [30, 10, 10]);
  await cv.save('listening.png');
  console.log(`listening.png ${W}×${H}`);
}

// ── Writing: the hall of stelae at Văn Miếu ──
async function writing() {
  const W = 384, H = 192, FLOOR = 88;
  const cv = new Canvas(W, H);
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) cv.set(x, y, mix([196, 150, 104], [176, 132, 90], hash(x >> 2, y >> 2) * 0.6));
  cv.rect(0, 0, W, 10, WOOD.dark);
  for (let x = 4; x < W; x += 24) cv.rect(x, 0, 6, 10, WOOD.base);
  cv.rect(0, 10, W, 2, [60, 38, 24]);
  for (const x of [26, 126, 250, 350]) pillar(cv, x, 12, FLOOR);
  // Scrolls of calligraphy between the pillars.
  for (const x of [60, 296]) {
    cv.rect(x - 1, 18, 26, 2, WOOD.dark);
    cv.rect(x, 20, 24, 44, [240, 232, 210]);
    for (let i = 0; i < 4; i++) { cv.rect(x + 9, 25 + i * 9, 6, 2, [40, 36, 40]); cv.rect(x + 11, 23 + i * 9, 2, 6, [40, 36, 40]); }
    cv.rect(x - 1, 64, 26, 2, WOOD.dark);
  }
  // Stelae on stone turtles, along the back of the hall.
  for (const x of [150, 184, 218]) {
    cv.rect(x, 30, 22, 44, [150, 148, 142]);
    cv.rect(x, 30, 22, 2, [176, 174, 168]);
    cv.rect(x + 1, 28, 20, 2, [130, 128, 122]);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) cv.rect(x + 4 + c * 6, 36 + r * 5, 3, 2, [118, 116, 110]);
    cv.oval(x + 11, 80, 15, 7, [120, 118, 112]);       // the turtle
    cv.oval(x + 11, 78, 12, 5, [140, 138, 132]);
    cv.oval(x + 26, 80, 3, 3, [120, 118, 112]);        // its head
  }
  // Stone floor tiles.
  for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = x >> 4, ty = (y - FLOOR) >> 4;
    const joint = (x & 15) === 0 || ((y - FLOOR) & 15) === 0;
    let c = mix([170, 166, 156], [152, 148, 140], hash(tx, ty));
    if (joint) c = shade(c, 0.85);
    cv.set(x, y, c);
  }
  cv.rect(0, FLOOR, W, 2, [0, 0, 0], 0.25);
  // The scholar's desk on the left: paper, ink stone, brush.
  counter(cv, 14, 100, 92, 22);
  cv.rect(28, 94, 30, 6, [240, 232, 210]);
  cv.rect(34, 96, 14, 1, [40, 36, 40]);
  cv.rect(66, 95, 10, 5, [40, 40, 46]);
  cv.rect(82, 92, 2, 8, [150, 110, 60]); cv.rect(82, 99, 2, 2, [30, 30, 30]);
  // An incense burner on the right.
  cv.rect(318, 124, 22, 14, [150, 120, 60]); cv.rect(316, 122, 26, 3, [180, 150, 80]);
  for (const dx of [6, 12, 18]) cv.rect(318 + dx, 112, 1, 10, [120, 70, 50]);
  for (const [x, len] of [[96, 6], [192, 2], [288, 6]]) lantern(cv, x, 12, len);
  vignette(cv, W, H);
  await cv.save('writing.png');
  console.log(`writing.png ${W}×${H}`);
}

// ── You: the garden house at An Hiên ──
async function you() {
  const W = 384, H = 192, FLOOR = 88;
  const cv = new Canvas(W, H);
  // Dark wooden walls, carved panels.
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) cv.set(x, y, mix([110, 72, 46], [96, 62, 40], hash(x >> 3, y >> 2) * 0.7));
  for (let x = 0; x < W; x += 32) cv.rect(x, 0, 3, FLOOR, [76, 48, 30]);
  cv.rect(0, 0, W, 8, [70, 44, 28]);
  for (const px of [36, 260]) for (const py of [18, 46]) {
    cv.rect(px, py, 40, 22, [124, 84, 54]);
    cv.rect(px + 2, py + 2, 36, 18, [96, 62, 40]);
    for (let i = 0; i < 4; i++) cv.rect(px + 6 + i * 8, py + 6, 4, 10, [124, 84, 54]);
  }
  // An open doorway on the right onto the garden.
  cv.rect(320, 14, 52, FLOOR - 14, [70, 44, 28]);
  for (let y = 18; y < FLOOR; y++) for (let x = 324; x < 368; x++) cv.set(x, y, mix([120, 170, 100], [90, 140, 80], hash(x >> 2, y >> 2)));
  for (const [cx, cy, c] of [[336, 40, [232, 150, 48]], [356, 30, [212, 64, 104]], [346, 60, [232, 150, 48]]]) cv.oval(cx, cy, 2, 2, c);
  // The ancestral altar in the middle: red and gold, fruit and incense.
  cv.rect(152, 40, 80, 40, LACQUER.dark);
  cv.rect(152, 40, 80, 3, GOLD.base);
  cv.rect(160, 46, 64, 26, LACQUER.base);
  for (let i = 0; i < 3; i++) cv.rect(176 + i * 12, 50, 6, 18, GOLD.dark);
  basket(cv, 168, 36, [232, 150, 48]);
  basket(cv, 216, 36, [212, 64, 104]);
  cv.rect(190, 30, 4, 8, [150, 120, 60]);
  for (const dx of [0, 2]) cv.rect(191 + dx, 22, 1, 8, [120, 70, 50]);
  // Brick floor.
  for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
    const row = (y - FLOOR) >> 3;
    const joint = (y - FLOOR) % 8 === 0 || (x + (row % 2) * 8) % 16 === 0;
    let c = mix([176, 100, 70], [158, 88, 60], hash(x >> 4, row));
    if (joint) c = shade(c, 0.8);
    cv.set(x, y, c);
  }
  cv.rect(0, FLOOR, W, 2, [0, 0, 0], 0.25);
  // A tea table and an orchid in a blue pot.
  teaTable(cv, 40, 124); stool(cv, 26, 132); stool(cv, 76, 132);
  cv.rect(286, 128, 14, 12, [72, 122, 196]); cv.rect(286, 128, 14, 2, [110, 156, 220]);
  for (let i = 0; i < 4; i++) cv.rect(288 + i * 3, 112 + i, 2, 16 - i, [78, 140, 90]);
  for (const [x, y] of [[290, 108], [296, 106], [300, 110]]) cv.rect(x, y, 3, 3, [236, 140, 200]);
  for (const [x, len] of [[120, 4], [264, 4]]) lantern(cv, x, 8, len);
  vignette(cv, W, H);
  await cv.save('you.png');
  console.log(`you.png ${W}×${H}`);
}

await vocabulary();
await tailor();
await speaking();
await listening();
await writing();
await you();
