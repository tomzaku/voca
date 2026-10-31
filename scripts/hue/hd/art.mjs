// Detailed art for the high-detail renders (./render.mjs): the same things the
// map draws, at twice its resolution — 32px a tile — with outlines, texture
// and small props. Each function returns a canvas the size of the map's own
// canvas for that thing, doubled, so it drops into exactly the same place.

import { Canvas, hash, mix, noise } from '../core/canvas.mjs';
import { light } from '../hills.mjs';

export const K = 2;          // detail pixels per map pixel
const T2 = 32;               // a tile, in detail pixels

const OUTLINE = [34, 26, 24];

/** Draw a dark outline round everything already on the canvas. */
export function outline(cv, c = OUTLINE) {
  const edge = [];
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    if (cv.alpha(x, y)) continue;
    if (cv.alpha(x - 1, y) || cv.alpha(x + 1, y) || cv.alpha(x, y - 1) || cv.alpha(x, y + 1)) edge.push([x, y]);
  }
  for (const [x, y] of edge) cv.set(x, y, c);
}

export const disc = (cv, cx, cy, r, c, a = 1) => cv.ellipse(cx, cy, r, r, c, a);

// ── Roofs and buildings ──

/** A roof of overlapping clay tiles on a trapezoid: courses of rounded tiles,
 *  each lit along its top and shaded at its lip, a heavy ridge with upturned
 *  ends, the eave casting a shadow. */
export function tiledRoof(cv, x, y, w, h, pal, inset) {
  const course = 5, tileW = 6;
  for (let r = 0; r < h; r++) {
    const ins = Math.round(inset * (1 - r / Math.max(1, h - 1)));
    const row = Math.floor(r / course), inRow = r % course;
    for (let c = ins; c < w - ins; c++) {
      const tx = (c + (row % 2) * 3) % tileW;
      let col = pal.base;
      if (inRow === 0) col = pal.light;
      else if (inRow === course - 1) col = pal.line;
      if (tx === 0) col = mix(col, pal.line, 0.7);
      if (tx === 1 && inRow < course - 1) col = mix(col, pal.light, 0.35);
      if (c < w / 2) col = mix(col, pal.light, 0.1);
      col = mix(col, [0, 0, 0], (noise(x + c, y + r, 3) - 0.5) * 0.12);
      if (r >= h - 3) col = r === h - 3 ? pal.light : pal.eave;
      cv.set(x + c, y + r, col);
    }
  }
  // The ridge, its ends turned up.
  cv.rect(x + inset - 2, y - 4, w - 2 * inset + 4, 4, pal.ridge);
  cv.rect(x + inset - 2, y - 4, w - 2 * inset + 4, 1, mix(pal.ridge, pal.light, 0.5));
  for (const [ex, dir] of [[x + inset - 2, -1], [x + w - inset + 1, 1]]) {
    for (let i = 0; i < 4; i++) { cv.set(ex + dir * i, y - 4 - i, pal.ridge); cv.set(ex + dir * i, y - 3 - i, pal.ridge); }
  }
  // Upturned eave corners.
  for (const [ex, dir] of [[x - 1, -1], [x + w, 1]]) {
    for (let i = 0; i < 4; i++) cv.set(ex + dir * i, y + h - 3 - i, pal.eave);
    cv.rect(ex + dir * 3, y + h - 8, 1, 2, pal.eave);
  }
}

/** A plastered wall, mottled, its corners shaded. */
export function plaster(cv, x, y, w, h, wall) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let c = mix(wall, [0, 0, 0], (noise(x + i, y + j, 5) - 0.5) * 0.1);
    if (i < 2 || i >= w - 2) c = mix(c, [0, 0, 0], 0.12);
    cv.set(x + i, y + j, c);
  }
}

/** A window: a light frame, glass catching the sky, a cross of glazing bars,
 *  shutters folded back either side, a sill. */
export function window_(cv, x, y, shutter) {
  cv.rect(x - 4, y, 4, 13, shutter);
  cv.rect(x + 12, y, 4, 13, shutter);
  for (let j = 1; j < 13; j += 2) { cv.rect(x - 4, y + j, 4, 1, mix(shutter, [0, 0, 0], 0.25)); cv.rect(x + 12, y + j, 4, 1, mix(shutter, [0, 0, 0], 0.25)); }
  cv.rect(x, y, 12, 13, [236, 228, 206]);
  cv.rect(x + 1, y + 1, 10, 11, [58, 74, 96]);
  for (let i = 0; i < 4; i++) cv.set(x + 2 + i, y + 5 - i, [150, 182, 206]);
  cv.rect(x + 6, y + 1, 1, 11, [236, 228, 206]);
  cv.rect(x + 1, y + 6, 10, 1, [236, 228, 206]);
  cv.rect(x - 1, y + 13, 14, 2, [204, 196, 180]);
}

/** A wooden double door in its frame, a step before it. */
export function door(cv, cx, bottom, w, h) {
  const x = Math.round(cx - w / 2), y = bottom - h;
  cv.rect(x - 2, y - 2, w + 4, h + 2, [86, 54, 34]);
  cv.rect(x, y, w, h, [132, 82, 50]);
  for (let i = x + 2; i < x + w; i += 3) cv.rect(i, y, 1, h, [110, 66, 40]);
  cv.rect(Math.round(cx), y, 1, h, [70, 42, 26]);
  cv.set(Math.round(cx) - 2, y + Math.round(h * 0.55), [236, 196, 90]);
  cv.set(Math.round(cx) + 2, y + Math.round(h * 0.55), [236, 196, 90]);
  cv.rect(x - 3, bottom, w + 6, 2, [190, 182, 166]);
}

/** A potted plant by a door. */
export function pot(cv, x, bottom, leaves = [78, 140, 74]) {
  cv.rect(x, bottom - 6, 7, 6, [176, 96, 64]);
  cv.rect(x, bottom - 6, 7, 1, [206, 130, 90]);
  cv.rect(x + 1, bottom - 1, 5, 1, [130, 70, 46]);
  disc(cv, x + 3.5, bottom - 10, 4.5, mix(leaves, [0, 0, 0], 0.2));
  disc(cv, x + 3, bottom - 11, 3.5, leaves);
  cv.set(x + 2, bottom - 12, mix(leaves, [255, 255, 255], 0.3));
}

/** A house — the map's `hall` with windows — in detail. */
export function house(spec) {
  const { w, h, roofRows, roofPal, wall } = spec;
  const cv = new Canvas(w * T2, h * T2);
  const W = cv.w, H = cv.h;
  const roofH = roofRows * T2;
  const fx = 4, fy = roofH - 4, fw = W - 8, fh = H - fy;
  plaster(cv, fx, fy, fw, fh, wall);
  for (let j = 0; j < 6; j++) cv.rect(fx, fy + j, fw, 1, [0, 0, 0], 0.32 - j * 0.05);   // shade under the eave
  // The plinth.
  cv.rect(fx - 2, H - 6, fw + 4, 6, [176, 168, 154]);
  cv.rect(fx - 2, H - 6, fw + 4, 1, [204, 196, 182]);
  for (let i = fx; i < fx + fw; i += 8) cv.rect(i, H - 5, 1, 5, [150, 142, 128]);
  const shutter = [[74, 118, 92], [70, 96, 140], [140, 92, 64]][Math.floor(hash(w * 7 + h, roofRows * 13 + wall[0]) * 3)];
  const dw = (spec.doorW ?? 6) * K + 2;
  const step = (spec.windowStep ?? 10) * K;
  for (let wx = fx + 10; wx + 16 < fx + fw - 6; wx += step + 6) {
    if (Math.abs(wx + 6 - W / 2) < dw / 2 + 12) continue;
    window_(cv, wx, fy + 9, shutter);
  }
  door(cv, W / 2, H - 6, dw, Math.min(fh - 12, 26));
  pot(cv, Math.round(W / 2 + dw / 2 + 5), H - 6);
  tiledRoof(cv, 4, 10, W - 8, roofH - 10, roofPal, Math.min(12, Math.floor((roofH - 10) * 0.5)));
  outline(cv);
  return cv;
}

// A 3×5 pixel font for the market's sign.
const GLYPHS = {
  C: ['111', '100', '100', '100', '111'], H: ['101', '101', '111', '101', '101'], O: ['111', '101', '101', '101', '111'],
  D: ['110', '101', '101', '101', '110'], N: ['101', '111', '111', '111', '101'], G: ['111', '100', '101', '101', '111'],
  B: ['110', '101', '110', '101', '110'], A: ['010', '101', '111', '101', '101'], ' ': ['000', '000', '000', '000', '000'],
};
function text(cv, str, x, y, c) {
  for (const ch of str) {
    const g = GLYPHS[ch];
    g.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') cv.set(x + i, y + j, c); }));
    x += 4;
  }
}

/** Chợ Đông Ba: the long cream market hall under its tiled roof, the clock
 *  gable over the entrance and its sign, arched windows between pilasters,
 *  and the stalls along its front under striped awnings — fruit in baskets,
 *  stacks of nón lá, bolts of cloth. */
export function market() {
  const cv = new Canvas(12 * T2, 7 * T2);
  const W = cv.w, H = cv.h;
  const bodyY = H - 80;
  plaster(cv, 4, bodyY, W - 8, 80, [236, 224, 196]);
  for (let j = 0; j < 6; j++) cv.rect(4, bodyY + j, W - 8, 1, [0, 0, 0], 0.3 - j * 0.05);
  cv.rect(2, H - 6, W - 4, 6, [182, 172, 154]);
  cv.rect(2, H - 6, W - 4, 1, [210, 200, 182]);
  // Pilasters, and between them arched windows above the stalls.
  const bays = [];
  for (let x = 8; x < W - 8; x += 40) {
    cv.rect(x, bodyY + 4, 6, 70, [246, 238, 216]);
    cv.rect(x + 5, bodyY + 4, 1, 70, [200, 188, 160]);
    bays.push(x + 6);
  }
  const cx = W / 2;
  for (const bx of bays) {
    if (bx + 34 > W - 8) continue;
    const mid = bx + 17;
    if (Math.abs(mid - cx) < 30) continue;
    // Arched window.
    for (let j = 0; j < 22; j++) for (let i = -8; i <= 8; i++) {
      const top = j < 8 && (i * i) / 64 + ((8 - j) * (8 - j)) / 64 > 1;
      if (!top) cv.set(mid + i, bodyY + 10 + j, j === 0 || Math.abs(i) === 8 ? [214, 200, 170] : [64, 80, 96]);
    }
    cv.rect(mid, bodyY + 12, 1, 20, [214, 200, 170]);
    for (let i = 0; i < 4; i++) cv.set(mid - 5 + i, bodyY + 20 - i, [150, 180, 200]);
    // A stall under a striped awning.
    const stripe = [[176, 70, 60], [60, 120, 110], [214, 170, 64], [120, 90, 150]][Math.floor(hash(bx, 7) * 4)];
    for (let i = -16; i <= 16; i++) {
      for (let j = 0; j < 8; j++) cv.set(mid + i, bodyY + 38 + j, (Math.floor((i + 16) / 4) % 2) ? stripe : [246, 240, 228]);
      if (Math.abs(i % 4) < 2) cv.set(mid + i, bodyY + 46, stripe);                 // the scalloped edge
    }
    cv.rect(mid - 16, bodyY + 47, 33, 2, [0, 0, 0], 0.25);
    // The stall's table and what's on it.
    cv.rect(mid - 15, bodyY + 60, 31, 6, [140, 96, 60]);
    cv.rect(mid - 15, bodyY + 60, 31, 1, [176, 128, 84]);
    const goods = Math.floor(hash(bx, 3) * 3);
    for (let k = 0; k < 4; k++) {
      const gx = mid - 12 + k * 8, gy = bodyY + 56;
      if (goods === 0) {          // baskets of fruit
        cv.rect(gx - 3, gy, 7, 4, [150, 110, 64]);
        cv.rect(gx - 3, gy, 7, 1, [190, 150, 96]);
        const fruit = [[236, 140, 40], [120, 180, 60], [210, 50, 50], [240, 210, 70]][k];
        for (const [dx, dy] of [[-2, -1], [0, -2], [2, -1], [-1, -3], [1, -3]]) cv.set(gx + dx, gy + dy, fruit);
      } else if (goods === 1) {   // stacks of nón lá
        for (let s = 0; s < 3; s++) for (let r = 0; r < 4; r++) cv.rect(gx - r, gy - s * 2 - 4 + r, 2 * r + 1, 1, r === 3 ? [190, 160, 104] : [230, 206, 150]);
      } else {                    // bolts of cloth
        cv.rect(gx - 2, gy - 6, 5, 10, [[180, 60, 80], [60, 100, 170], [230, 190, 60], [90, 150, 90]][k]);
        cv.rect(gx - 2, gy - 6, 1, 10, [255, 255, 255], 0.3);
      }
    }
  }
  // The entrance, the clock gable over it, the sign.
  cv.rect(cx - 14, bodyY + 30, 28, 44, [70, 54, 44]);
  for (let j = 0; j < 8; j++) cv.rect(cx - 14 + j, bodyY + 30 - Math.round(Math.sqrt(64 - (8 - j) ** 2)), 28 - j * 2, 1, [70, 54, 44]);
  cv.rect(cx - 16, bodyY + 28, 2, 46, [214, 178, 92]);
  cv.rect(cx + 14, bodyY + 28, 2, 46, [214, 178, 92]);
  tiledRoof(cv, 4, bodyY - 52, W - 8, 52, { base: [184, 108, 74], line: [156, 88, 60], light: [214, 140, 100], eave: [110, 62, 44], ridge: [128, 72, 50] }, 14);
  const gx = cx - 40, gy = bodyY - 84;
  for (let j = 0; j < 30; j++) cv.rect(gx + j, gy + 12 - Math.floor(j / 3), 80 - j * 2, 1, [242, 232, 208]);
  cv.rect(gx, gy + 12, 80, 72, [242, 232, 208]);
  cv.rect(gx, gy + 12, 2, 72, [214, 200, 172]);
  cv.rect(gx + 78, gy + 12, 2, 72, [214, 200, 172]);
  // The clock.
  disc(cv, cx, gy + 34, 15, [92, 80, 70]);
  disc(cv, cx, gy + 34, 13, [250, 246, 236]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    cv.set(cx + Math.round(Math.cos(a) * 11), gy + 34 + Math.round(Math.sin(a) * 11), [60, 52, 48]);
  }
  for (let i = 0; i < 9; i++) cv.set(cx, gy + 34 - i, [40, 36, 34]);
  for (let i = 0; i < 6; i++) cv.set(cx + i, gy + 34, [40, 36, 34]);
  cv.rect(cx - 1, gy + 33, 3, 3, [176, 92, 80]);
  // The sign: CHỢ ĐÔNG BA in gold on red.
  cv.rect(cx - 30, gy + 56, 60, 13, [168, 44, 36]);
  cv.rect(cx - 30, gy + 56, 60, 1, [214, 178, 92]);
  cv.rect(cx - 30, gy + 68, 60, 1, [214, 178, 92]);
  text(cv, 'CHO DONG BA', cx - 22, gy + 60, [246, 214, 120]);
  cv.set(cx - 22 + 9, gy + 58, [246, 214, 120]);   // the hook of Ơ
  cv.rect(cx - 22 + 16, gy + 62, 1, 1, [246, 214, 120]);   // the bar of Đ
  cv.rect(cx - 22 + 21, gy + 58, 2, 1, [246, 214, 120]);   // the hat of Ô
  cv.rect(cx - 2, gy - 8, 4, 6, [176, 92, 80]);    // the finial
  outline(cv);
  return cv;
}

/** Kỳ Đài: the flag tower — three tiers of old brick stepping back and up,
 *  each with its top, its front face and a crenellated parapet; an arched
 *  door and a stone plaque in the front, stairs up the side, cannons on the
 *  lower terrace, a stone balustrade round the top; the tall flagpole with
 *  its gold finial and guy ropes, where the map's pole was — the streak's
 *  flag flies from it. Six tiles by ten. */
export function kyDai() {
  const cv = new Canvas(6 * T2, 10 * T2);
  const W = cv.w, H = cv.h;
  const brick = [150, 92, 74], brickLight = [178, 120, 96], brickDark = [116, 70, 56], mortar = [128, 84, 68];
  const top = [168, 126, 104], topLight = [190, 150, 126];
  const moss = [86, 104, 70];
  /** A brick face: courses, staggered joints, damp and moss at its foot. */
  const face = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const course = Math.floor((y - y0) / 4);
      let c = (y - y0) % 4 === 0 || (x + (course % 2) * 4) % 8 === 0 ? mortar : mix(brick, brickDark, hash(Math.floor((x + (course % 2) * 4) / 8), course) * 0.5);
      const foot = (y - y0) / h;
      if (foot > 0.7 && hash(x, y) < (foot - 0.7) * 1.6) c = mix(c, moss, 0.6);
      if (hash(x * 3, y) < 0.02) c = brickLight;
      cv.set(x, y, c);
    }
    cv.rect(x0, y0, w, 1, brickLight);
  };
  /** A tier's top: worn paving, its front edge a parapet of merlons. */
  const terrace = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      cv.set(x, y, (x % 10 === 0 || (y - y0) % 6 === 0) ? mix(top, mortar, 0.5) : mix(top, topLight, hash(Math.floor(x / 10), Math.floor((y - y0) / 6)) * 0.6));
    }
    for (let x = x0; x < x0 + w; x += 8) { cv.rect(x, y0 + h - 4, 5, 4, brickLight); cv.rect(x, y0 + h - 4, 5, 1, topLight); }
  };
  // The three tiers, back to front so each stands before the one above it.
  const tiers = [
    { x: 0, w: W, top: 250, faceTop: 266, bottom: H },
    { x: 28, w: W - 56, top: 214, faceTop: 228, bottom: 254 },
    { x: 52, w: W - 104, top: 186, faceTop: 196, bottom: 218 },
  ];
  for (const t of [...tiers].reverse()) {
    terrace(t.x, t.top, t.w, t.faceTop - t.top);
    face(t.x, t.faceTop, t.w, t.bottom - t.faceTop);
    cv.rect(t.x + t.w, t.faceTop + 2, 3, t.bottom - t.faceTop, [0, 0, 0], 0.25);   // its shadow to the east
  }
  // The front: an arched door, a plaque above it.
  const cx = W / 2;
  cv.rect(cx - 10, H - 30, 20, 28, [44, 32, 28]);
  for (let j = 0; j < 6; j++) cv.rect(cx - 10 + j, H - 30 - Math.round(Math.sqrt(36 - (6 - j) ** 2)), 20 - j * 2, 1, [44, 32, 28]);
  cv.rect(cx - 12, H - 38, 24, 2, brickLight);
  cv.rect(cx - 16, H - 50, 32, 9, [196, 188, 170]);
  cv.rect(cx - 15, H - 49, 30, 7, [170, 160, 140]);
  for (let i = 0; i < 5; i++) cv.rect(cx - 12 + i * 5, H - 47, 3, 1, [110, 100, 88]);
  // Stairs up the west side of the lower tiers.
  for (let i = 0; i < 9; i++) {
    const x = 10 + i * 2, y = H - 8 - i * 6;
    cv.rect(x, y, 12, 2, topLight);
    cv.rect(x, y + 2, 12, 4, mix(brick, brickDark, 0.3));
  }
  // Cannons on the lower terrace, their barrels to the river.
  for (const x of [40, 64, W - 76, W - 52]) {
    cv.rect(x, 256, 10, 5, [70, 52, 40]);
    cv.ellipse(x + 2, 262, 2.5, 2.5, [50, 40, 32]);
    cv.ellipse(x + 8, 262, 2.5, 2.5, [50, 40, 32]);
    cv.rect(x + 3, 252, 4, 9, [58, 60, 64]);
    cv.rect(x + 3, 252, 1, 9, [96, 100, 108]);
  }
  // The top platform's stone balustrade, the pole's plinth.
  cv.rect(56, 186, W - 112, 2, [214, 208, 196]);
  for (let x = 56; x < W - 56; x += 4) cv.rect(x, 188, 2, 5, [200, 194, 182]);
  cv.rect(cx - 8, 192, 16, 6, [200, 194, 182]);
  cv.rect(cx - 8, 192, 16, 1, [228, 224, 214]);
  // The flagpole: where the map's was (its right edge is where the flag hangs).
  const px = 94;
  cv.rect(px, 8, 4, 186, [222, 222, 218]);
  cv.rect(px, 8, 1, 186, [250, 250, 248]);
  cv.rect(px + 3, 8, 1, 186, [170, 170, 166]);
  for (let y = 40; y < 190; y += 30) cv.rect(px - 1, y, 6, 2, [180, 180, 176]);
  cv.ellipse(px + 2, 5, 3.5, 3.5, [236, 196, 90]);
  cv.set(px + 1, 3, [255, 236, 160]);
  outline(cv);
  // The guy ropes, after the outline: fine lines, not outlined ones.
  for (const [ax, ay] of [[60, 186], [W - 60, 186]]) {
    const n = Math.max(Math.abs(ax - px - 2), Math.abs(ay - 20));
    for (let i = 0; i <= n; i++) cv.set(Math.round(px + 2 + ((ax - px - 2) * i) / n), Math.round(20 + ((ay - 20) * i) / n), [70, 66, 62], 0.55);
  }
  return cv;
}

// ── Trees ──

const LEAVES = {
  leaf: { dark: [52, 104, 64], mid: [76, 136, 78], light: [112, 170, 96], shine: [156, 204, 120] },
  deep: { dark: [38, 84, 54], mid: [56, 112, 70], light: [84, 140, 88], shine: [126, 176, 112] },
  lilac: { dark: [102, 74, 132], mid: [140, 104, 172], light: [176, 140, 204], shine: [214, 186, 232] },
  flame: { dark: [150, 58, 40], mid: [196, 88, 56], light: [228, 126, 74], shine: [246, 176, 110] },
};

/** A trunk with bark, lit on the left, flaring at the roots. */
function trunk(cv, cx, top, bottom, w = 8) {
  for (let y = top; y < bottom; y++) {
    const flare = y > bottom - 5 ? (y - (bottom - 5)) : 0;
    for (let x = -w / 2 - flare; x < w / 2 + flare; x++) {
      const rel = x + w / 2;
      let c = [104, 74, 52];
      if (rel < 2) c = [136, 100, 70];
      else if (rel > w - 3) c = [76, 54, 38];
      if ((y + Math.round(x)) % 5 === 0) c = mix(c, [60, 40, 28], 0.4);
      cv.set(cx + x, y, c);
    }
  }
}

/** A crown of leaf clusters: shadowed below, lit on top, flecks of light. */
function crown(cv, cx, cy, rx, ry, pal, seed, n = 16) {
  const blobs = [];
  for (let i = 0; i < n; i++) {
    const a = hash(seed, i * 7) * Math.PI * 2, d = Math.sqrt(hash(seed + 3, i * 11));
    blobs.push([cx + Math.cos(a) * d * (rx - 6), cy + Math.sin(a) * d * (ry - 6), 6 + hash(seed + 5, i) * 4]);
  }
  blobs.sort((p, q) => p[1] - q[1]);
  cv.ellipse(cx, cy + 2, rx - 3, ry - 3, pal.dark);       // a full crown under the clusters
  for (const [x, y, r] of blobs) disc(cv, x, y + 2, r + 1, pal.dark);
  for (const [x, y, r] of blobs) { disc(cv, x, y, r, pal.mid); disc(cv, x - r * 0.3, y - r * 0.35, r * 0.55, pal.light); }
  for (let i = 0; i < n * 2; i++) {
    const x = cx + (hash(seed + 9, i) - 0.5) * rx * 1.4, y = cy + (hash(seed + 13, i) - 0.7) * ry * 1.2;
    if (cv.alpha(Math.round(x), Math.round(y))) { cv.set(x, y, pal.shine); cv.set(x + 1, y, pal.light); }
  }
}

/** A tree of the map's kind, in detail; null for kinds drawn as they are. */
export function tree(kind, w, h, seed) {
  const cv = new Canvas(w * K, h * K);
  const cx = cv.w / 2;
  if (LEAVES[kind]) {
    trunk(cv, cx, 40, 62);
    crown(cv, cx, 26, 28, 24, LEAVES[kind], seed);
    if (kind === 'lilac') for (let i = 0; i < 18; i++) {
      const x = cx + (hash(seed, i * 5) - 0.5) * 44, y = 8 + hash(seed, i * 9) * 32;
      if (cv.alpha(Math.round(x), Math.round(y))) disc(cv, x, y, 1.6, [236, 206, 246]);
    }
  } else if (kind === 'bang' || kind === 'bangRed') {
    const pal = kind === 'bangRed' ? LEAVES.flame : LEAVES.leaf;
    trunk(cv, cx, 30, 62, 6);
    for (const [y, rx] of [[42, 30], [28, 24], [15, 16]]) {
      cv.ellipse(cx, y + 2, rx, 6, pal.dark);
      cv.ellipse(cx, y, rx - 1, 6, pal.mid);
      cv.ellipse(cx - 4, y - 2, rx - 9, 3, pal.light);
      for (let i = 0; i < 6; i++) cv.set(cx - rx + 6 + hash(seed, y + i) * (rx * 2 - 12), y - 3 + hash(seed + 1, i) * 4, pal.shine);
    }
  } else if (kind === 'bamboo') {
    for (const [x, hgt] of [[10, 44], [18, 56], [26, 50], [32, 62], [40, 54], [48, 58], [54, 42]]) {
      for (let y = 62 - hgt; y < 62; y++) {
        const joint = (62 - y) % 9 === 0;
        cv.rect(x, y, 3, 1, joint ? [70, 96, 48] : [146, 180, 90]);
        cv.set(x + 2, y, joint ? [60, 84, 42] : [104, 140, 64]);
      }
      for (let k = 0; k < 6; k++) {
        const ly = 62 - hgt + k * 4, dir = k % 2 ? 1 : -1;
        for (let i = 0; i < 6; i++) cv.set(x + 1 + dir * (2 + i), ly + Math.round(i * 0.4), i < 4 ? [84, 146, 72] : [60, 120, 60]);
      }
    }
  } else if (kind === 'palm') {
    for (let y = 20; y < 62; y++) cv.rect(cx - 1 + (y < 34 ? 1 : 0), y, 3, 1, y % 6 === 0 ? [120, 104, 80] : [156, 138, 104]);
    for (let f = 0; f < 9; f++) {
      const a = Math.PI + (f / 8) * Math.PI;
      for (let i = 2; i < 22; i++) {
        const x = cx + Math.cos(a) * i, y = 20 + Math.sin(a) * i * 0.7 + (i * i) / 40;
        cv.set(x, y, i > 15 ? [64, 116, 70] : [92, 150, 88]);
        cv.set(x, y + 1, [56, 100, 62]);
        if (i % 3 === 0) { cv.set(x - 1, y + 2, [92, 150, 88]); cv.set(x + 1, y + 2, [92, 150, 88]); }
      }
    }
  } else if (kind === 'frangipani') {
    const bark = [140, 128, 112];
    for (let y = 32; y < 62; y++) cv.rect(cx - 1 + (y < 44 ? Math.round((44 - y) / 4) : 0), y, 3, 1, bark);
    for (let i = 0; i < 12; i++) { cv.rect(cx - 2 - i, 32 - i, 2, 2, bark); cv.rect(cx + 2 + i, 30 - i, 2, 2, bark); }
    for (const [x, y] of [[14, 16], [50, 14], [32, 10], [22, 26], [44, 24]]) crown(cv, x, y, 12, 9, LEAVES.leaf, seed + x, 4);
    for (let i = 0; i < 14; i++) {
      const x = 8 + hash(seed, i * 3) * 48, y = 4 + hash(seed, i * 5) * 26;
      if (!cv.alpha(Math.round(x), Math.round(y))) continue;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) cv.set(x + dx, y + dy, [252, 250, 244]);
      cv.set(x, y, [244, 200, 80]);
    }
  } else if (kind === 'willow') {
    trunk(cv, cx, 36, 62, 6);
    crown(cv, cx, 18, 22, 14, LEAVES.leaf, seed, 8);
    for (let x = 8; x <= 56; x += 2) {
      const top = 12 + Math.round(Math.abs(x - cx) * 0.3), len = 26 + Math.floor(hash(seed, x) * 14) - Math.round(Math.abs(x - cx) * 0.3);
      for (let y = top; y < top + len; y++) cv.set(x + (y > top + len - 6 ? 1 : 0), y, y % 3 ? [104, 160, 92] : [72, 128, 74]);
    }
  } else if (kind === 'pine') {
    cv.rect(cx - 2, 50, 4, 12, [96, 70, 50]);
    for (let tier = 0; tier < 4; tier++) {
      const y = 6 + tier * 11, half = 5 + tier * 3;
      for (let r = 0; r < 16; r++) {
        const wd = Math.round(half * (r / 15)) + 1;
        for (let x = cx - wd; x < cx + wd; x++) cv.set(x, y + r, x < cx ? [76, 124, 86] : [56, 98, 70]);
      }
    }
  } else return null;
  outline(cv);
  return cv;
}

// ── Street furniture ──

/** A street lamp: a slender post, a lantern lit warm. `x, y` its foot. */
export function lamp(cv, x, y) {
  cv.rect(x - 2, y - 2, 5, 2, [60, 62, 70]);
  cv.rect(x, y - 22, 2, 20, [70, 72, 82]);
  cv.rect(x, y - 22, 1, 20, [110, 114, 126]);
  cv.rect(x - 3, y - 30, 8, 8, [44, 44, 52]);
  cv.rect(x - 2, y - 29, 6, 6, [255, 226, 150]);
  cv.rect(x - 2, y - 29, 2, 6, [255, 244, 200]);
  cv.rect(x - 4, y - 31, 10, 2, [44, 44, 52]);
  cv.ellipse(x + 2, y + 1, 5, 1.5, [0, 0, 0], 0.25);
}

function wheel(cv, cx, cy, r) {
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    cv.set(cx + Math.cos(t) * r, cy + Math.sin(t) * r, [34, 30, 30]);
    cv.set(cx + Math.cos(t) * (r - 1), cy + Math.sin(t) * (r - 1), [150, 150, 156]);
  }
  for (let s = 0; s < 6; s++) {
    const t = (s / 6) * Math.PI;
    for (let i = -r + 2; i <= r - 2; i++) cv.set(cx + Math.cos(t) * i, cy + Math.sin(t) * i, [170, 170, 176]);
  }
  cv.set(cx, cy, [60, 60, 66]);
}
const bar = (cv, ax, ay, bx, by, c, wd = 2) => {
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  for (let i = 0; i <= n; i++) cv.rect(Math.round(ax + ((bx - ax) * i) / n), Math.round(ay + ((by - ay) * i) / n), wd, wd, c);
};

/** A parked bicycle, a basket on the front. `x, y` the ground under its back wheel. */
export function bicycle(cv, x, y, frame) {
  cv.ellipse(x + 11, y + 1, 13, 2, [0, 0, 0], 0.22);
  wheel(cv, x + 4, y - 6, 6);
  wheel(cv, x + 19, y - 6, 6);
  bar(cv, x + 4, y - 6, x + 10, y - 13, frame);
  bar(cv, x + 10, y - 13, x + 12, y - 6, frame);
  bar(cv, x + 12, y - 6, x + 4, y - 6, frame);
  bar(cv, x + 10, y - 13, x + 18, y - 13, frame);
  bar(cv, x + 12, y - 6, x + 18, y - 13, frame);
  bar(cv, x + 18, y - 15, x + 19, y - 6, [60, 60, 66], 1);
  cv.rect(x + 7, y - 16, 6, 2, [40, 34, 32]);               // saddle
  cv.rect(x + 16, y - 18, 6, 1, [40, 34, 32]);              // handlebar
  cv.rect(x + 19, y - 17, 6, 5, [170, 128, 76]);            // basket
  for (let i = 0; i < 6; i += 2) cv.rect(x + 19 + i, y - 17, 1, 5, [130, 94, 54]);
}

/** A xích lô waiting for a fare. `x, y` the ground under its front wheels. */
export function cyclo(cv, x, y) {
  cv.ellipse(x + 18, y + 1, 19, 2, [0, 0, 0], 0.22);
  wheel(cv, x + 6, y - 6, 6);
  wheel(cv, x + 30, y - 6, 6);
  cv.rect(x, y - 18, 16, 8, [42, 58, 92]);
  cv.rect(x, y - 18, 16, 1, [70, 90, 130]);
  cv.rect(x + 2, y - 20, 12, 3, [168, 50, 38]);
  cv.rect(x, y - 13, 16, 1, [240, 192, 80]);
  for (let i = 0; i < 14; i++) {
    const top = 2 + Math.round(((i - 7) / 7) ** 2 * 4);
    cv.rect(x + 1 + i, y - 30 + top, 1, 10 - top, [28, 28, 34]);
  }
  bar(cv, x + 16, y - 10, x + 30, y - 6, [90, 90, 98]);
  bar(cv, x + 16, y - 16, x + 26, y - 18, [90, 90, 98]);
  bar(cv, x + 26, y - 18, x + 25, y - 10, [90, 90, 98]);
  cv.rect(x + 24, y - 20, 6, 2, [40, 34, 32]);
}

// ── The riverside parks ──

/** A flower bed: a dark earth oval, a stone edge, flowers packed in. */
export function flowerBed(cv, x, y) {
  cv.ellipse(x, y, 19, 9, [150, 144, 130]);
  cv.ellipse(x, y, 17, 7.5, [106, 78, 56]);
  const blooms = [[236, 140, 172], [250, 210, 96], [184, 140, 218], [246, 246, 240], [226, 84, 72]];
  for (let i = 0; i < 46; i++) {
    const a = hash(x + i, y) * Math.PI * 2, d = Math.sqrt(hash(y + i, x));
    const fx = x + Math.cos(a) * d * 15, fy = y + Math.sin(a) * d * 6;
    disc(cv, fx, fy + 1, 1.6, [64, 120, 60]);
    cv.set(fx, fy, blooms[i % blooms.length]);
    cv.set(fx + 1, fy, blooms[i % blooms.length]);
  }
}

/** A park bench of slatted wood on iron legs. */
export function bench(cv, x, y) {
  cv.ellipse(x, y + 4, 12, 2, [0, 0, 0], 0.2);
  for (let i = 0; i < 3; i++) cv.rect(x - 11, y - 9 + i * 2, 22, 1, i % 2 ? [150, 102, 62] : [176, 124, 80]);
  for (let i = 0; i < 2; i++) cv.rect(x - 11, y - 3 + i * 2, 22, 1, i % 2 ? [150, 102, 62] : [190, 138, 92]);
  for (const lx of [x - 9, x + 8]) cv.rect(lx, y - 9, 2, 13, [60, 60, 66]);
}

/** A park lamp: a short post, a round lantern. */
export function parkLamp(cv, x, y) {
  cv.ellipse(x + 1, y + 1, 4, 1.2, [0, 0, 0], 0.25);
  cv.rect(x - 1, y - 2, 4, 2, [60, 62, 70]);
  cv.rect(x, y - 16, 2, 14, [74, 78, 86]);
  disc(cv, x + 1, y - 19, 4, [44, 44, 52]);
  disc(cv, x + 1, y - 19, 3, [255, 232, 170]);
  cv.set(x, y - 20, [255, 250, 220]);
}

/** Đài phun nước: a stone basin, the fountain in tiers, water falling. */
export function fountain() {
  const cv = new Canvas(2 * T2, 2 * T2);
  const cx = 32;
  cv.ellipse(cx, 42, 31, 18, [150, 144, 132]);
  cv.ellipse(cx, 41, 30, 16.5, [206, 200, 186]);
  cv.ellipse(cx, 42, 26, 13, [62, 146, 206]);
  cv.ellipse(cx, 44, 20, 9, [98, 178, 222]);
  for (let i = 0; i < 30; i++) cv.set(cx - 22 + hash(i, 3) * 44, 34 + hash(i, 7) * 16, [190, 228, 248]);
  // The column and its two bowls.
  cv.rect(cx - 4, 16, 8, 26, [196, 190, 178]);
  cv.rect(cx - 4, 16, 2, 26, [226, 220, 208]);
  cv.ellipse(cx, 30, 12, 4, [206, 200, 186]);
  cv.ellipse(cx, 29, 10, 2.5, [98, 178, 222]);
  cv.ellipse(cx, 17, 7, 2.5, [206, 200, 186]);
  // Water rising and falling back.
  for (let i = 0; i < 9; i++) cv.set(cx, 4 + i, [220, 240, 252]);
  for (const dir of [-1, 1]) for (let i = 0; i < 12; i++) {
    cv.set(cx + dir * (2 + i), 6 + (i * i) / 12, [220, 240, 252]);
    cv.set(cx + dir * (8 + i), 26 + (i * i) / 10, [200, 232, 250]);
  }
  outline(cv, [70, 66, 60]);
  return cv;
}

/** Cầu đi bộ gỗ lim: ironwood planks across, a railing of posts and a rail
 *  along both edges. `w, h` in detail px. */
export function boardwalk(w, h) {
  const cv = new Canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = (x % 6 === 0) ? [86, 44, 30] : mix([132, 66, 44], [150, 80, 54], hash(Math.floor(x / 6), 1) * 0.8);
    if (y < 3 || y >= h - 3) c = y === 0 || y === h - 1 ? [70, 36, 24] : [168, 98, 66];
    cv.set(x, y, c);
  }
  for (let x = 2; x < w; x += 12) { cv.rect(x, 0, 3, 4, [70, 36, 24]); cv.rect(x, h - 4, 3, 4, [70, 36, 24]); }
  return cv;
}

/** Cầu bán nguyệt, side-on: a steep half-moon arch of dressed stone, the
 *  deck riding high over it under a balustrade of posts and rails, the arch
 *  mirrored in the pond below to make the full moon. 4 × 2 tiles. */
export function halfMoon() {
  const cv = new Canvas(4 * T2, 2 * T2);
  const cx = 64, base = 60, r = 26;
  const stone = [212, 206, 194], joint = [176, 170, 158], cap = [240, 236, 228];
  for (let x = 0; x < cv.w; x++) {
    const d = Math.abs(x + 0.5 - cx);
    const deck = Math.round(base - 12 - Math.max(0, 30 - (d * d) / 44));
    for (let y = deck; y < base; y++) {
      const fromArch = Math.sqrt(d * d + (base - y) ** 2);
      if (d < r && fromArch < r) continue;                      // the opening
      let c = stone;
      if (fromArch < r + 4 && d < r + 4) c = (Math.floor(Math.atan2(base - y, x - cx) * 9) % 2) ? [198, 192, 180] : [222, 216, 204];   // voussoirs
      else if ((y - deck) % 6 === 0 || (x + (Math.floor((y - deck) / 6) % 2) * 5) % 10 === 0) c = joint;
      cv.set(x, y, c);
    }
    cv.set(x, deck, cap);
    cv.set(x, deck - 6, cap);                                   // the rail
    if (x % 6 === 0) cv.rect(x, deck - 6, 2, 6, [228, 224, 214]);
  }
  // The reflection in the pond: the arch again, upside down, faint.
  for (let x = cx - r - 4; x <= cx + r + 4; x++) {
    const d = Math.abs(x - cx);
    for (let y = 0; y < 4; y++) if (d > r - 1 || y > Math.sqrt(Math.max(0, r * r - d * d)) * 0.12) cv.set(x, base + y, [190, 196, 200], 0.3);
  }
  outline(cv, [110, 104, 96]);
  return cv;
}

/** Trường Tiền's deck in detail (`w, h` detail px): railings of silver posts,
 *  walkways of square slabs, the trusses' chords studded with rivets, and the
 *  steel roadway between — fine grain, cross-girders, a dashed white line. */
export function truongTienDeck(w, h) {
  const cv = new Canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = Math.min(x, w - 1 - x);
    let c;
    if (e < 2) c = y % 8 < 2 ? [244, 246, 250] : e === 0 ? [120, 128, 138] : [168, 176, 186];
    else if (e < 16) {
      const sx = Math.floor((e - 2) / 7), sy = Math.floor(y / 7);
      c = ((e - 2) % 7 === 0 || y % 7 === 0) ? [186, 178, 164] : mix([222, 214, 202], [208, 200, 188], hash(sx, sy) * 0.6);
    } else if (e < 20) {
      c = e === 16 ? [226, 232, 238] : e === 19 ? [140, 150, 160] : [184, 194, 204];
      if (e === 17 && y % 6 === 0) c = [110, 118, 128];                                      // rivets
    } else {
      c = mix([146, 152, 160], [136, 142, 150], noise(x, y, 6));
      if (hash(x, y) < 0.05) c = [164, 170, 178];
      if (y % 24 === 0) c = [172, 178, 186];
      if (y % 24 === 1) c = [118, 124, 134];
      if (Math.abs(x + 0.5 - w / 2) < 1.5 && y % 20 < 10) c = [240, 240, 234];
    }
    cv.set(x, y, c);
  }
  return cv;
}

// ── Walls, forest, boats ──

/** One tile of the Citadel's (or the Imperial City's) wall. Running across
 *  the view: its walk on top, merlons along the edge, moss in the cracks, and
 *  below them the face in courses of weathered stone. Running up and down:
 *  the walk seen from above between two parapets. */
export function wallTile(horizontal, seed) {
  const cv = new Canvas(T2, T2);
  const top = [164, 154, 132], topDark = [140, 130, 110], face = [124, 114, 98], faceDark = [100, 92, 78], moss = [104, 126, 82];
  for (let y = 0; y < T2; y++) for (let x = 0; x < T2; x++) {
    let c;
    if (horizontal && y >= 18) {
      const row = Math.floor((y - 18) / 5);
      c = ((y - 18) % 5 === 0 || (x + (row % 2) * 6) % 12 === 0) ? faceDark : mix(face, faceDark, hash(Math.floor((x + (row % 2) * 6) / 12) + seed, row) * 0.4);
      if (y > 26 && hash(x + seed * 7, y) < 0.18) c = mix(c, moss, 0.6);
    } else {
      c = (x % 8 === 0 || y % 8 === 0) ? topDark : mix(top, topDark, hash((x >> 3) + seed, y >> 3) * 0.4);
      if (hash(x * 3 + seed, y) < 0.06) c = moss;
      if (horizontal && y < 5 && x % 8 < 5) c = y === 0 ? [186, 176, 154] : face;            // merlons
      if (horizontal && y >= 15) c = faceDark;                                               // the shadowed lip
      if (!horizontal && (x < 4 || x > 27)) c = x === 0 || x === 31 ? faceDark : face;       // parapets
    }
    cv.set(x, y, c);
  }
  return cv;
}

/** The forest's canopy, drawn over a patch in passes so crowns overlap
 *  right: each tile's two crowns (where the map put them), then shadow,
 *  the dark mass, clusters of leaves lit from above, flecks of light. */
export function forestCanopy(g, tiles, ox, oy) {
  const shades = [[30, 86, 46], [44, 108, 54], [62, 134, 62], [94, 166, 78], [138, 196, 104]];
  const crowns = tiles.flatMap(({ tx, ty }) => [0, 1].map((k) => {
    const h = hash(tx * 7 + k, ty * 13 + k);
    return { x: (tx * 16 + 4 + h * 8 - ox) * K, y: (ty * 16 + 4 + hash(ty * 5 + k, tx * 3) * 8 - oy) * K, r: (9 + h * 4) * K, h, k: tx * 31 + ty * 17 + k };
  }));
  // Each crown lit or shaded with the slope it stands on.
  for (const c of crowns) {
    const l = light(c.x / K + ox, c.y / K + oy);
    c.lit = (col) => (l > 0 ? mix(col, [196, 232, 146], l * 0.5) : mix(col, [10, 34, 28], -l * 0.6));
  }
  for (const c of crowns) g.ellipse(c.x + 4, c.y + 8, c.r, c.r * 0.8, [24, 40, 36], 0.35);
  for (const c of crowns) g.ellipse(c.x, c.y, c.r, c.r * 0.85, c.lit(shades[0]));
  for (const c of crowns) {
    for (let i = 0; i < 7; i++) {
      const a = hash(c.k, i) * Math.PI * 2, d = Math.sqrt(hash(c.k + 1, i)) * c.r * 0.6;
      const bx = c.x + Math.cos(a) * d, by = c.y + Math.sin(a) * d * 0.8, br = c.r * (0.3 + hash(c.k + 2, i) * 0.15);
      g.ellipse(bx, by + 2, br, br * 0.9, c.lit(shades[1]));
      g.ellipse(bx - br * 0.2, by - br * 0.25, br * 0.75, br * 0.65, c.lit(shades[c.h > 0.6 ? 3 : 2]));
    }
  }
  for (const c of crowns) for (let i = 0; i < 6; i++) {
    const x = c.x + (hash(c.k + 5, i) - 0.6) * c.r * 1.2, y = c.y + (hash(c.k + 6, i) - 0.7) * c.r;
    g.set(x, y, c.lit(shades[4])); g.set(x + 1, y, c.lit(shades[3]));
  }
}

/** A sampan: a slim wooden hull, the woven bamboo hood over its middle, an
 *  oar trailing. `x, y` its top-left. */
export function sampan(cv, x, y, flip) {
  const w = 52;
  for (let i = 0; i < w; i++) {
    const taper = i < 8 ? 8 - i : i > w - 10 ? i - (w - 10) : 0;
    for (let j = 6 + Math.floor(taper / 2); j < 16; j++) cv.set(x + i, y + j, j > 13 ? [86, 56, 38] : j > 11 ? [116, 80, 52] : [148, 104, 68]);
    cv.set(x + i, y + 6 + Math.floor(taper / 2), [176, 132, 90]);
  }
  const hx = x + (flip ? 8 : 20);
  for (let i = 0; i < 24; i++) for (let j = 0; j < 9; j++) {
    const arch = Math.round(Math.sin((i / 23) * Math.PI) * 3);
    if (j < 3 - arch + 3) continue;
    cv.set(hx + i, y - 3 + j, (i + j) % 3 === 0 ? [96, 72, 48] : (i % 2 ? [150, 118, 76] : [132, 100, 64]));
  }
  for (let i = 0; i < 10; i++) cv.set(x + (flip ? w + i : -i), y + 12 + Math.round(i * 0.3), [120, 86, 56]);
  cv.ellipse(x + w / 2, y + 18, w / 2, 2, [0, 0, 0], 0.18);
}

/** A dragon boat: the red hull banded gold, a pavilion amidships, the
 *  dragon's head carved at the bow and its tail at the stern. */
export function dragonBoat(cv, x, y) {
  const w = 80;
  for (let i = 0; i < w; i++) for (let j = 6; j < 18; j++) cv.set(x + i, y + j, j > 15 ? [116, 36, 28] : j > 11 ? [204, 166, 70] : [190, 56, 42]);
  for (let i = 0; i < w; i += 6) cv.rect(x + i, y + 13, 2, 2, [150, 40, 30]);
  cv.rect(x + 20, y - 2, 40, 9, [160, 46, 36]);
  for (let i = 22; i < 58; i += 6) { cv.rect(x + i, y + 1, 3, 4, [250, 220, 150]); }
  for (let i = 16; i < 64; i++) cv.set(x + i, y - 3 + (i < 20 || i > 59 ? 0 : -1), [236, 186, 66]);
  // The head: a curling neck, an eye, a gold crest; the tail at the stern.
  for (let i = 0; i < 10; i++) cv.rect(x - 2 - i, y + 8 - Math.round(Math.sin(i / 3) * 6), 4, 4, [214, 172, 72]);
  cv.set(x - 9, y + 1, [40, 30, 30]);
  cv.rect(x - 12, y - 1, 3, 2, [190, 56, 42]);
  for (let i = 0; i < 7; i++) cv.rect(x + w + i, y + 6 - i, 3, 3, [214, 172, 72]);
  cv.ellipse(x + w / 2, y + 20, w / 2, 2, [0, 0, 0], 0.18);
}

// ── Rice fields and ladders ──

/** A paddy in detail (`w, h` detail px): still water catching the sky
 *  between rows of rice — young shoots, a thick green stand, or ripe gold
 *  heads bowing. */
export function paddy(w, h, stage) {
  const cv = new Canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = mix([98, 154, 166], [80, 134, 150], noise(x, y, 10));
    if (hash(x, y * 3) < 0.03) c = [190, 220, 230];
    if (y < 2) c = [64, 102, 112];
    cv.set(x, y, c);
  }
  for (let y = 4; y < h - 2; y += stage === 0 ? 6 : 5) for (let x = 3; x < w - 2; x += 5) {
    const jx = x + Math.round((hash(x, y) - 0.5) * 2);
    if (stage === 0) { cv.set(jx, y, [140, 204, 102]); cv.set(jx - 1, y - 1, [120, 190, 90]); cv.set(jx + 1, y - 1, [120, 190, 90]); continue; }
    const leaf = stage === 1 ? [[70, 140, 58], [100, 170, 72], [136, 200, 96]] : [[176, 140, 52], [214, 178, 72], [240, 210, 110]];
    for (let i = 0; i < 4; i++) { cv.set(jx - 2 + i, y + 1, leaf[0]); }
    for (const [dx, dy, k] of [[-2, -1, 1], [2, -1, 1], [-1, -2, 2], [1, -2, 2], [0, -3, 2], [-3, -2, 1], [3, -2, 1]]) cv.set(jx + dx, y + dy, leaf[k]);
    if (stage === 2) { cv.set(jx + 3, y - 1, [250, 226, 140]); cv.set(jx - 3, y - 1, [250, 226, 140]); }
  }
  return cv;
}

/** A wooden ladder over a cliff face, `h` detail px tall. */
export function ladder(h) {
  const cv = new Canvas(18, h);
  for (let y = 0; y < h; y++) {
    cv.rect(2, y, 2, 1, [104, 70, 44]); cv.set(4, y, [150, 106, 66]);
    cv.rect(14, y, 2, 1, [104, 70, 44]); cv.set(13, y, [150, 106, 66]);
    if (y % 6 === 0) { cv.rect(4, y, 10, 2, [176, 128, 84]); cv.rect(4, y + 2, 10, 1, [96, 64, 40]); }
  }
  return cv;
}
