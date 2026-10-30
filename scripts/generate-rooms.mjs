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

// ── Vocabulary: inside the Đông Ba market hall ──
async function vocabulary() {
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
  // The word-seller's counter: books and scrolls, under the name board.
  counter(cv, 164, 92, 56, 20);
  for (let i = 0; i < 4; i++) {
    const c = [[150, 66, 60], [86, 128, 132], [196, 150, 84], [104, 92, 140]][i];
    cv.rect(170 + i * 6, 80 - (i % 2) * 2, 5, 12 + (i % 2) * 2, c);
    cv.rect(170 + i * 6, 80 - (i % 2) * 2, 5, 1, mix(c, [255, 255, 255], 0.35));
  }
  cv.rect(198, 86, 16, 4, [236, 226, 200]);
  cv.rect(197, 85, 2, 6, WOOD.light);
  cv.rect(213, 85, 2, 6, WOOD.light);

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

  await cv.save('vocabulary.png');
  console.log(`vocabulary.png ${W}×${H}`);
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

await vocabulary();
await tailor();
