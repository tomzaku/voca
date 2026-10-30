// The Imperial City's buildings in detail, each drawn as itself — not as
// the map's one generic hall — so they read apart at a glance:
//
//   Thế Miếu     the long dynastic temple: a double roof (one behind the
//                other), nine bays of lacquered doors, a stone platform
//   Thái Miếu    the lords' temple behind its own wall and gate, under a
//                green-glazed two-tier roof, incense burners before it
//   Diên Thọ     the queen mothers' residence: a deep veranda of wooden
//                columns and lanterns, and Trường Du Tạ, a pavilion on
//                stilts over its lotus pond
//   Trường Sanh  the garden palace, green-roofed, with a rockery and pond
//   Tử Cấm Thành Đại Cung Môn's three arches under a two-tier roof; Cần
//                Chánh with gilded columns and its plaque; the side halls
//
// Every canvas is twice the size of the map's for the same building, so it
// lands exactly where that one stood.

import { Canvas, hash, mix, noise } from '../core/canvas.mjs';
import { disc, outline, tiledRoof } from './art.mjs';

const T2 = 32;

export const YELLOW = { base: [234, 182, 58], line: [206, 150, 40], light: [252, 218, 124], eave: [150, 96, 32], ridge: [190, 120, 30] };
export const GREEN = { base: [78, 148, 116], line: [60, 124, 96], light: [124, 186, 150], eave: [36, 84, 64], ridge: [46, 100, 78] };
export const LACQUER = [158, 40, 32], LACQUER_DARK = [118, 28, 22], GOLD = [230, 186, 80], GOLD_DARK = [176, 130, 46];
export const STONE = [200, 194, 180], STONE_LIGHT = [226, 220, 208], STONE_DARK = [158, 150, 136];
export const WOOD = [128, 80, 50], WOOD_DARK = [96, 58, 36];

/** A stone platform: paved top, a jointed face, steps up the middle. */
export function platform(cv, x, y, w, h, steps = 24) {
  cv.rect(x, y, w, h, STONE);
  cv.rect(x, y, w, 2, STONE_LIGHT);
  for (let j = y + 4; j < y + h; j += 4) for (let i = x; i < x + w; i++) if ((i + (Math.floor(j / 4) % 2) * 6) % 12 === 0) cv.set(i, j, STONE_DARK);
  cv.rect(x, y + h - 2, w, 2, STONE_DARK);
  if (!steps) return;
  const sx = Math.round(x + w / 2 - steps / 2);
  for (let j = y; j < y + h; j += 3) { cv.rect(sx, j, steps, 2, STONE_LIGHT); cv.rect(sx, j + 2, steps, 1, STONE_DARK); }
  cv.rect(sx - 2, y, 2, h, STONE_DARK);
  cv.rect(sx + steps, y, 2, h, STONE_DARK);
}

/** A lacquered column, gold-ringed top and foot. */
export function column(cv, x, y, h, c = LACQUER) {
  cv.rect(x, y, 4, h, c);
  cv.rect(x, y, 1, h, mix(c, [255, 255, 255], 0.25));
  cv.rect(x + 3, y, 1, h, mix(c, [0, 0, 0], 0.3));
  cv.rect(x - 1, y, 6, 2, GOLD);
  cv.rect(x - 1, y + h - 2, 6, 2, GOLD);
}

/** A panel of doors: a frame, gold lattice in the upper half, a plain
 *  lower panel. */
export function latticeDoor(cv, x, y, w, h, frame = LACQUER_DARK, lattice = GOLD) {
  cv.rect(x, y, w, h, frame);
  const lh = Math.round(h * 0.55);
  for (let j = 2; j < lh; j++) for (let i = 2; i < w - 2; i++) {
    cv.set(x + i, y + j, (i + j) % 3 === 0 || (i - j + 99) % 3 === 0 ? lattice : [70, 30, 24]);
  }
  cv.rect(x + 2, y + lh + 2, w - 4, h - lh - 4, mix(frame, [0, 0, 0], 0.15));
  cv.rect(x + 2, y + lh, w - 4, 1, GOLD_DARK);
}

/** A row of bays: a column, then doors, across a façade. */
export function bays(cv, x, y, w, h, n, colour = LACQUER) {
  const bw = w / n;
  for (let b = 0; b < n; b++) {
    const bx = Math.round(x + b * bw);
    latticeDoor(cv, bx + 4, y + 3, Math.round(bw) - 5, h - 5);
    column(cv, bx, y, h, colour);
  }
  column(cv, Math.round(x + w) - 4, y, h, colour);
  cv.rect(x - 2, y - 3, w + 4, 3, LACQUER_DARK);               // the beam
  for (let i = x; i < x + w; i += 6) cv.rect(i, y - 3, 3, 1, GOLD);
}

/** Dragons curling up at the ridge's ends and a flaming jewel at its middle. */
export function ridgeDecor(cv, x0, x1, y, pal = YELLOW) {
  const c = mix(pal.ridge, GOLD, 0.4);
  for (const [ex, dir] of [[x0, 1], [x1, -1]]) {
    for (let i = 0; i < 6; i++) cv.rect(ex + dir * i, y - 2 - Math.round(Math.sin(i / 2) * 3), 2, 2, c);
    cv.rect(ex + dir * 5, y - 7, 2, 3, c);
  }
  const cx = Math.round((x0 + x1) / 2);
  disc(cv, cx, y - 5, 3, [210, 70, 50]);
  disc(cv, cx, y - 5, 1.5, GOLD);
  for (const dx of [-5, -4, 4, 5]) cv.set(cx + dx, y - 4 + Math.abs(dx) - 4, GOLD);
}

/** A bronze incense burner on three legs. */
function burner(cv, x, y) {
  cv.rect(x - 4, y - 7, 9, 5, [110, 92, 60]);
  cv.rect(x - 4, y - 7, 9, 1, [160, 136, 90]);
  cv.rect(x - 5, y - 8, 11, 1, [86, 70, 46]);
  for (const lx of [x - 3, x, x + 3]) cv.rect(lx, y - 2, 1, 2, [86, 70, 46]);
  cv.ellipse(x, y + 1, 6, 1.5, [0, 0, 0], 0.25);
}

// ── The buildings ──

/** Thế Miếu: 6 × 3 tiles. */
export function theMieu() {
  const cv = new Canvas(6 * T2, 3 * T2);
  const W = cv.w;
  platform(cv, 0, 80, W, 16, 28);
  bays(cv, 8, 48, W - 16, 32, 9);
  tiledRoof(cv, 12, 10, W - 24, 22, YELLOW, 10);              // the back roof, higher
  ridgeDecor(cv, 22, W - 24, 6);
  tiledRoof(cv, 2, 30, W - 4, 18, YELLOW, 6);                 // the front roof
  for (let j = 0; j < 4; j++) cv.rect(8, 48 + j, W - 16, 1, [0, 0, 0], 0.3 - j * 0.07);
  outline(cv);
  return cv;
}

/** Thái Miếu: 5 × 4 tiles — the temple behind its wall and gate. */
export function thaiMieu() {
  const cv = new Canvas(5 * T2, 4 * T2);
  const W = cv.w, H = cv.h;
  // The temple: green roofs, lacquered bays.
  tiledRoof(cv, 14, 8, W - 28, 20, GREEN, 8);
  ridgeDecor(cv, 26, W - 28, 4, GREEN);
  bays(cv, 12, 56, W - 24, 30, 5);
  tiledRoof(cv, 4, 28, W - 8, 26, GREEN, 8);
  // Its wall, tiles along the top, and the gate in it.
  const wy = H - 30;
  cv.rect(0, wy, W, 30, [190, 96, 64]);
  for (let j = wy + 6; j < H; j += 4) for (let i = 0; i < W; i++) if ((i + (Math.floor(j / 4) % 2) * 4) % 8 === 0) cv.set(i, j, [160, 76, 50]);
  cv.rect(0, wy, W, 5, GREEN.base);
  cv.rect(0, wy, W, 1, GREEN.light);
  cv.rect(0, wy + 4, W, 1, GREEN.eave);
  const cx = W / 2;
  cv.rect(cx - 26, wy - 6, 52, 36, [176, 84, 56]);
  for (const [gx, gw, gh] of [[cx - 7, 14, 20], [cx - 22, 9, 15], [cx + 13, 9, 15]]) {
    cv.rect(gx, H - gh, gw, gh, [52, 30, 24]);
    cv.rect(gx + 1, H - gh, gw - 2, 2, GOLD_DARK);
  }
  tiledRoof(cv, cx - 30, wy - 18, 60, 13, GREEN, 5);
  burner(cv, 30, H - 2);
  burner(cv, W - 30, H - 2);
  outline(cv);
  return cv;
}

/** Cung Diên Thọ: 5 × 4 tiles — the residence's veranda, and Trường Du Tạ
 *  over its lotus pond to the east. */
export function dienTho() {
  const cv = new Canvas(5 * T2, 4 * T2);
  const W = cv.w, H = cv.h;
  const hallW = 108;
  // The pond, and the pavilion standing in it on stilts.
  for (let y = 70; y < H; y++) for (let x = hallW + 2; x < W; x++) {
    const edge = y < 72 || x < hallW + 4 || x > W - 3 || y > H - 3;
    cv.set(x, y, edge ? STONE_DARK : mix([62, 146, 206], [98, 178, 222], noise(x, y, 8)));
  }
  for (const [lx, ly] of [[hallW + 10, 112], [W - 12, 100], [hallW + 20, 122]]) { disc(cv, lx, ly, 3, [94, 146, 88]); cv.set(lx, ly - 2, [236, 150, 178]); }
  const px = hallW + 10, pw = W - hallW - 20;
  for (const sx of [px + 2, px + pw - 4]) cv.rect(sx, 92, 2, 16, WOOD_DARK);
  cv.rect(px, 86, pw, 6, WOOD);
  for (const sx of [px + 2, px + pw - 5]) column(cv, sx, 66, 20, [150, 60, 40]);
  tiledRoof(cv, px - 4, 48, pw + 8, 18, YELLOW, 6);
  cv.rect(hallW - 2, 96, 14, 4, WOOD);                        // the walkway out to it
  // The hall: a deep veranda, wooden columns, lanterns, lattice screens.
  platform(cv, 0, H - 14, hallW, 14, 20);
  cv.rect(4, 62, hallW - 8, 52, [92, 54, 34]);
  for (let x = 8; x < hallW - 8; x += 3) cv.rect(x, 66, 1, 44, [120, 76, 48]);
  for (let y = 66; y < 110; y += 4) cv.rect(8, y, hallW - 16, 1, [120, 76, 48]);
  cv.rect(4, 104, hallW - 8, 10, [150, 104, 70]);              // the veranda's floor
  for (let x = 4; x < hallW - 4; x += 20) column(cv, x, 62, 44, [150, 70, 44]);
  for (let x = 16; x < hallW - 8; x += 20) {
    cv.rect(x, 70, 1, 4, [60, 40, 30]);
    cv.ellipse(x, 77, 3, 3.5, [220, 70, 50]);
    cv.rect(x - 1, 74, 3, 1, GOLD);
  }
  tiledRoof(cv, 0, 14, hallW, 48, YELLOW, 14);
  ridgeDecor(cv, 18, hallW - 18, 10);
  outline(cv);
  return cv;
}

/** Cung Trường Sanh: 4 × 4 tiles — the garden palace and its rockery. */
export function truongSanh() {
  const cv = new Canvas(4 * T2, 4 * T2);
  const W = cv.w, H = cv.h;
  const hw = 92;
  // The rockery: grey stones piled over a little pond, a bonsai on top.
  for (let y = 96; y < H; y++) for (let x = hw; x < W; x++) cv.set(x, y, y < 98 ? STONE_DARK : mix([62, 146, 206], [98, 178, 222], noise(x, y, 6)));
  for (const [rx, ry, r] of [[hw + 18, 96, 13], [hw + 10, 84, 9], [hw + 22, 74, 8], [hw + 16, 62, 6]]) {
    disc(cv, rx, ry, r, [128, 126, 120]);
    disc(cv, rx - r * 0.3, ry - r * 0.3, r * 0.55, [168, 166, 158]);
    cv.set(rx + 2, ry + 1, [90, 88, 84]);
  }
  cv.rect(hw + 15, 50, 2, 8, WOOD_DARK);
  disc(cv, hw + 16, 48, 6, [76, 136, 78]);
  disc(cv, hw + 14, 46, 3, [112, 170, 96]);
  // The palace.
  platform(cv, 0, H - 12, hw, 12, 16);
  cv.rect(4, 60, hw - 8, 56, [222, 196, 146]);
  for (const wx of [14, hw - 30]) {
    cv.rect(wx, 74, 16, 20, WOOD);
    for (let i = 2; i < 16; i += 3) cv.rect(wx + i, 76, 1, 16, WOOD_DARK);
    for (let j = 2; j < 20; j += 3) cv.rect(wx + 1, 74 + j, 14, 1, WOOD_DARK);
  }
  latticeDoor(cv, hw / 2 - 9, 82, 18, 34, WOOD_DARK, [214, 170, 100]);
  for (const x of [4, hw / 2 - 14, hw / 2 + 10, hw - 8]) column(cv, x, 60, 56, [150, 70, 44]);
  tiledRoof(cv, 0, 14, hw, 46, GREEN, 12);
  ridgeDecor(cv, 16, hw - 16, 10, GREEN);
  outline(cv);
  return cv;
}

/** Cần Chánh: 6 × 3 tiles — the emperor's working hall. */
export function canChanh() {
  const cv = new Canvas(6 * T2, 3 * T2);
  const W = cv.w;
  platform(cv, 0, 80, W, 16, 30);
  bays(cv, 10, 50, W - 20, 30, 7, [176, 52, 36]);
  // Gilded columns down the front: dragons coiled in gold.
  for (let b = 0; b <= 7; b++) {
    const x = Math.round(10 + (b * (W - 20)) / 7) - (b === 7 ? 4 : 0);
    for (let j = 52; j < 78; j += 4) cv.set(x + 1 + ((j / 4) % 2), j, GOLD);
  }
  tiledRoof(cv, 14, 12, W - 28, 20, YELLOW, 10);
  ridgeDecor(cv, 24, W - 26, 8);
  tiledRoof(cv, 2, 32, W - 4, 18, { ...YELLOW, eave: GREEN.eave, line: mix(YELLOW.line, GREEN.base, 0.25) }, 6);
  // The plaque under the upper eave.
  cv.rect(W / 2 - 18, 33, 36, 9, LACQUER_DARK);
  cv.rect(W / 2 - 17, 34, 34, 7, [60, 30, 24]);
  for (let i = 0; i < 3; i++) cv.rect(W / 2 - 12 + i * 10, 36, 4, 3, GOLD);
  cv.rect(W / 2 - 18, 33, 36, 1, GOLD);
  outline(cv);
  return cv;
}

/** A side hall of the Forbidden City: 3 × 3 tiles. */
export function sideHall() {
  const cv = new Canvas(3 * T2, 3 * T2);
  const W = cv.w;
  platform(cv, 0, 82, W, 14, 14);
  cv.rect(4, 52, W - 8, 30, LACQUER);
  for (const wx of [12, W - 28]) latticeDoor(cv, wx, 58, 16, 18);
  latticeDoor(cv, W / 2 - 7, 56, 14, 26);
  for (const x of [4, W / 2 - 12, W / 2 + 8, W - 8]) column(cv, x, 50, 32);
  tiledRoof(cv, 0, 12, W, 38, GREEN, 10);
  outline(cv);
  return cv;
}

/** Đại Cung Môn: 4 × 3 tiles — the Forbidden City's gate. */
export function daiCungMon() {
  const cv = new Canvas(4 * T2, 3 * T2);
  const W = cv.w, H = cv.h;
  cv.rect(0, 50, W, H - 50, LACQUER);
  for (let j = 54; j < H; j += 4) cv.rect(0, j, W, 1, LACQUER_DARK);
  cv.rect(0, 50, W, 3, GOLD);
  const cx = W / 2;
  for (const [gx, gw, gh] of [[cx - 12, 24, 36], [cx - 40, 16, 26], [cx + 24, 16, 26]]) {
    cv.rect(gx, H - gh, gw, gh, [44, 26, 22]);
    for (let j = 0; j < gw / 2; j++) cv.rect(gx + j, H - gh - Math.round(Math.sqrt((gw / 2) ** 2 - (gw / 2 - j) ** 2) / 2), gw - j * 2, 1, [44, 26, 22]);
    cv.rect(gx - 2, H - gh - 2, gw + 4, 2, GOLD);
  }
  tiledRoof(cv, 4, 30, W - 8, 20, YELLOW, 6);
  cv.rect(24, 22, W - 48, 10, LACQUER);
  for (let x = 26; x < W - 26; x += 6) cv.rect(x, 22, 2, 10, GOLD);
  tiledRoof(cv, 18, 6, W - 36, 16, YELLOW, 5);
  ridgeDecor(cv, 26, W - 28, 3);
  outline(cv);
  // Light on the gilded studs of the middle doors.
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) cv.set(cx - 8 + i * 8, H - 30 + j * 7, hash(i, j) < 2 ? GOLD : GOLD);
  return cv;
}

/** Duyệt Thị Đường, the royal theatre: 6 × 5 tiles. A two-tier yellow roof,
 *  its upper storey banded in red and gold round the theatre's plaque;
 *  lacquered bays below, the middle doors open on the lit stage and its
 *  curtains; the great drums either side of the steps, lanterns under the
 *  eaves. */
export function duyetThiDuong() {
  const cv = new Canvas(6 * T2, 5 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  platform(cv, 0, H - 18, W, 18, 30);
  bays(cv, 8, 96, W - 16, H - 18 - 96, 7);
  // The open middle doors: the stage inside, lit, its curtains drawn back.
  const dx = Math.round(8 + (3 * (W - 16)) / 7) + 4, dw = Math.round((W - 16) / 7) - 5;
  cv.rect(dx, 99, dw, H - 18 - 101, [255, 214, 140]);
  cv.rect(dx, 99, 5, H - 18 - 101, [176, 36, 40]);
  cv.rect(dx + dw - 5, 99, 5, H - 18 - 101, [176, 36, 40]);
  cv.rect(dx, 99, dw, 4, [200, 150, 60]);
  cv.rect(dx + 7, H - 30, dw - 14, 8, [130, 84, 52]);          // the stage's front
  // Lanterns under the eave.
  for (let x = 20; x < W - 16; x += 26) {
    cv.rect(x, 97, 1, 3, [60, 40, 30]);
    cv.ellipse(x, 104, 3.5, 4, [224, 70, 50]);
    cv.rect(x - 1, 100, 3, 1, GOLD);
  }
  tiledRoof(cv, 2, 66, W - 4, 30, YELLOW, 10);                // the lower roof
  // The upper storey: red and gold, the plaque in its middle.
  cv.rect(30, 46, W - 60, 22, LACQUER);
  for (let x = 32; x < W - 32; x += 8) { cv.rect(x, 46, 2, 22, LACQUER_DARK); cv.rect(x + 3, 50, 3, 8, GOLD); }
  cv.rect(cx - 26, 48, 52, 14, LACQUER_DARK);
  cv.rect(cx - 25, 49, 50, 12, [56, 28, 22]);
  cv.rect(cx - 26, 48, 52, 1, GOLD);
  cv.rect(cx - 26, 61, 52, 1, GOLD);
  for (let i = 0; i < 4; i++) cv.rect(cx - 20 + i * 11, 52, 7, 5, GOLD);
  tiledRoof(cv, 22, 14, W - 44, 32, YELLOW, 12);              // the upper roof
  ridgeDecor(cv, 34, W - 36, 10);
  // The drums, on their stands either side of the steps.
  for (const x of [cx - 40, cx + 40]) {
    cv.rect(x - 9, H - 10, 2, 10, WOOD_DARK);
    cv.rect(x + 7, H - 10, 2, 10, WOOD_DARK);
    cv.ellipse(x, H - 18, 10, 9, [176, 52, 40]);
    cv.ellipse(x, H - 18, 7, 6.5, [236, 214, 170]);
    cv.ellipse(x - 2, H - 20, 3, 2, [250, 236, 206]);
    for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; cv.set(x + Math.cos(t) * 9, H - 18 + Math.sin(t) * 8, GOLD); }
  }
  outline(cv);
  return cv;
}

/** The pavilion on Hồ Tịnh Tâm: 3 × 3 tiles. A square pavilion on a stone
 *  base standing in the lake — red columns, a carved railing, two tiers of
 *  yellow roof — its reflection under it. */
export function tinhTamPavilion() {
  const cv = new Canvas(3 * T2, 3 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  // The base, and its reflection broken by ripples.
  cv.rect(8, H - 26, W - 16, 14, STONE);
  cv.rect(8, H - 26, W - 16, 2, STONE_LIGHT);
  for (let x = 8; x < W - 8; x += 8) cv.rect(x, H - 24, 1, 12, STONE_DARK);
  for (let y = H - 12; y < H; y++) for (let x = 10; x < W - 10; x++) if ((y + Math.floor(x / 3)) % 3 !== 0) cv.set(x, y, [200, 90, 60], 0.18);
  // The railing round it, the columns, the roofs.
  cv.rect(10, H - 32, W - 20, 6, [176, 52, 40]);
  for (let x = 12; x < W - 12; x += 4) cv.rect(x, H - 31, 2, 4, GOLD);
  for (const x of [12, cx - 12, cx + 8, W - 16]) column(cv, x, 34, H - 60);
  tiledRoof(cv, 4, 22, W - 8, 16, YELLOW, 6);
  cv.rect(28, 14, W - 56, 8, LACQUER);
  for (let x = 30; x < W - 30; x += 5) cv.rect(x, 14, 2, 8, GOLD);
  tiledRoof(cv, 18, 4, W - 36, 12, YELLOW, 4);
  ridgeDecor(cv, 24, W - 26, 2);
  outline(cv);
  return cv;
}

/** A narrow stone causeway (one or two tiles wide): slabs between carved
 *  balustrades. `w, h` in detail px. */
export function causeway(w, h) {
  const cv = new Canvas(w, h);
  const along = h >= w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = along ? Math.min(x, w - 1 - x) : Math.min(y, h - 1 - y);
    const run = along ? y : x;
    let c;
    if (e < 4) c = e === 3 ? STONE_LIGHT : run % 6 < 2 ? [240, 236, 226] : STONE_DARK;
    else c = (run % 10 === 0) ? STONE_DARK : mix(STONE, STONE_LIGHT, hash(Math.floor(run / 10), 3) * 0.5);
    cv.set(x, y, c);
  }
  return cv;
}

/** A lotus pad, notched, its veins showing, and maybe a pink flower. */
export function lotus(cv, x, y, flower) {
  const pad = [74, 140, 78], padLight = [110, 172, 98];
  cv.ellipse(x, y, 6.5, 4.2, [52, 104, 60]);
  cv.ellipse(x, y - 0.5, 5.8, 3.6, pad);
  for (let i = 0; i < 4; i++) cv.set(x + 1 + i, y - 1 - Math.floor(i / 2), [62, 146, 206]);   // the notch
  for (const [dx, dy] of [[-3, 0], [-1, -2], [2, 1], [-2, 2]]) cv.set(x + dx, y + dy, padLight);
  if (!flower) return;
  const pink = [236, 140, 172], light = [252, 206, 222];
  for (const [dx, dy] of [[-3, -3], [3, -3], [-2, -5], [2, -5], [0, -6]]) cv.ellipse(x + dx, y + dy, 1.8, 2.4, dx === 0 ? light : pink);
  cv.rect(x - 1, y - 4, 2, 2, [244, 210, 90]);
}
