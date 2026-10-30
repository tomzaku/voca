// The tombs' buildings in detail: Khải Định's dark concrete stele pavilion
// and Cung Thiên Định; Tự Đức's gate, Xung Khiêm pavilion, Hòa Khiêm, stele
// pavilion and walled grave; Minh Mạng's Đại Hồng Môn, Sùng Ân, stele
// pavilion and Minh Lâu; the obelisks. Each the size of the map's own
// canvas for it, doubled.

import { Canvas, hash, mix } from '../core/canvas.mjs';
import { disc, outline, tiledRoof } from './art.mjs';
import { GOLD, LACQUER, LACQUER_DARK, YELLOW, bays, column, platform, ridgeDecor } from './imperial.mjs';

const T2 = 32;
const SLATE = { base: [88, 90, 100], line: [72, 74, 84], light: [118, 120, 132], eave: [50, 52, 60], ridge: [62, 64, 72] };
const DARK = { base: [116, 102, 92], line: [98, 86, 78], light: [146, 130, 116], eave: [70, 60, 54], ridge: [84, 72, 64] };
const CONCRETE = { base: [128, 128, 124], light: [158, 158, 152], face: [92, 92, 90], line: [110, 110, 106] };
const OLD = { base: [184, 176, 156], light: [208, 200, 180], face: [140, 130, 110], line: [164, 156, 136] };

/** Weathered stone or concrete in blocks, darker streaks running down. */
function blocks(cv, x, y, w, h, pal) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const row = Math.floor(j / 6);
    let c = (j % 6 === 0 || (i + (row % 2) * 6) % 12 === 0) ? pal.line : mix(pal.base, pal.light, hash((i + (row % 2) * 6) >> 3, row) * 0.4);
    if (hash(x + i, 7) < 0.12 && j > h * 0.3) c = mix(c, [40, 40, 40], 0.25);       // streaks
    cv.set(x + i, y + j, c);
  }
}

/** A stele pavilion: stone walls, its front open on the great stele, a roof
 *  (two tiers and cut corners for Khải Định's). `w, h` in tiles. */
function stelePavilion(w, h, pal, roofPal, octagon) {
  const cv = new Canvas(w * T2, h * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  blocks(cv, 4, H - 50, W - 8, 48, pal);
  cv.rect(cx - 16, H - 42, 32, 40, [40, 38, 36]);
  cv.rect(cx - 8, H - 38, 16, 36, [170, 166, 152]);
  cv.rect(cx - 8, H - 38, 16, 3, [200, 196, 182]);
  for (let y = H - 32; y < H - 6; y += 3) cv.rect(cx - 6, y, 12, 1, [132, 128, 118]);
  tiledRoof(cv, 0, H - 80, W, 30, roofPal, octagon ? 14 : 10);
  if (octagon) tiledRoof(cv, cx - 26, H - 98, 52, 20, roofPal, 8);
  outline(cv);
  return cv;
}

export const biDinhKhaiDinh = () => stelePavilion(3, 3, CONCRETE, SLATE, true);
export const biDinh = () => stelePavilion(3, 3, OLD, DARK, false);
export const biDinhMinhMang = () => stelePavilion(4, 3, OLD, YELLOW, false);

/** Cung Thiên Định: 7 × 4 tiles — the palace atop Khải Định's tomb: dark
 *  concrete, a raised centre between wings, pillars, a glint of the gilded
 *  mosaic hall through the door, ornate ridge ends. */
export function thienDinh() {
  const cv = new Canvas(7 * T2, 4 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  blocks(cv, 6, H - 62, W - 12, 54, CONCRETE);
  for (let x = 14; x < W - 14; x += 16) { cv.rect(x, H - 58, 6, 48, CONCRETE.light); cv.rect(x + 5, H - 58, 1, 48, CONCRETE.face); }
  blocks(cv, cx - 30, H - 82, 60, 74, CONCRETE);
  cv.rect(cx - 12, H - 52, 24, 44, [38, 36, 34]);
  for (let j = 0; j < 12; j++) for (let i = 0; i < 16; i++) if ((i + j) % 3 === 0) cv.set(cx - 8 + i, H - 46 + j, [[214, 186, 110], [120, 180, 170], [200, 90, 80]][(i + j) % 3]);
  cv.rect(0, H - 8, W, 8, CONCRETE.face);
  tiledRoof(cv, 0, H - 90, W, 28, SLATE, 10);
  tiledRoof(cv, cx - 40, H - 118, 80, 28, SLATE, 10);
  for (const x of [10, W - 16, cx - 34, cx + 28]) { cv.rect(x, H - 102, 6, 14, CONCRETE.face); disc(cv, x + 3, H - 104, 3, CONCRETE.light); }
  outline(cv);
  return cv;
}

/** A tomb's gate: 4 × 3 tiles — a stone gateway, its arch, a roof over it. */
export function tombGate() {
  const cv = new Canvas(4 * T2, 3 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  blocks(cv, 2, 46, W - 4, H - 46, OLD);
  cv.rect(cx - 15, H - 38, 30, 38, [44, 34, 28]);
  for (let j = 0; j < 8; j++) cv.rect(cx - 15 + j, H - 38 - Math.round(Math.sqrt(64 - (8 - j) ** 2)), 30 - j * 2, 1, [44, 34, 28]);
  tiledRoof(cv, 6, 22, W - 12, 24, YELLOW, 8);
  ridgeDecor(cv, 16, W - 18, 18);
  outline(cv);
  return cv;
}

/** Xung Khiêm Tạ: 3 × 3 tiles — Tự Đức's pavilion by Lưu Khiêm lake, its
 *  front on stilts over the water, wooden railings, a dark tiled roof. */
export function xungKhiem() {
  const cv = new Canvas(3 * T2, 3 * T2);
  const W = cv.w, H = cv.h;
  for (let x = 10; x < W - 6; x += 12) cv.rect(x, H - 20, 3, 20, [92, 64, 44]);
  cv.rect(6, H - 28, W - 12, 8, [168, 120, 80]);
  for (let x = 8; x < W - 8; x += 4) cv.rect(x, H - 36, 2, 8, [140, 96, 60]);
  cv.rect(6, H - 37, W - 12, 2, [176, 128, 86]);
  for (const x of [12, W / 2 - 2, W - 16]) column(cv, x, 34, H - 64, [176, 52, 40]);
  tiledRoof(cv, 0, 12, W, 24, DARK, 8);
  outline(cv);
  return cv;
}

/** A tomb's temple hall (Hòa Khiêm, Sùng Ân): lacquered bays under a yellow
 *  roof on a stone platform. Sized from the map's hall. */
export function tombHall(spec) {
  const cv = new Canvas(spec.w * T2, spec.h * T2);
  const W = cv.w, H = cv.h;
  platform(cv, 0, H - 14, W, 14, 20);
  bays(cv, 6, H - 46, W - 12, 32, spec.w + 1);
  tiledRoof(cv, 0, 10, W, H - 56, YELLOW, 10);
  ridgeDecor(cv, 14, W - 16, 6);
  outline(cv);
  return cv;
}

/** Tự Đức's walled grave: 5 × 3 tiles — the stone enclosure, the grassed
 *  mound inside, its bronze door. */
export function grave() {
  const cv = new Canvas(5 * T2, 3 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  blocks(cv, 6, 26, W - 12, H - 30, OLD);
  cv.rect(14, 34, W - 28, H - 46, OLD.face);
  cv.ellipse(cx, 58, 40, 16, [86, 124, 64]);
  cv.ellipse(cx - 6, 52, 22, 8, [112, 154, 82]);
  cv.rect(cx - 8, H - 12, 16, 10, [90, 74, 56]);
  cv.rect(cx - 7, H - 11, 14, 8, [130, 104, 70]);
  outline(cv);
  return cv;
}

/** Đại Hồng Môn: 6 × 3 tiles — Minh Mạng's red gate of three arches, the
 *  middle one the emperor's, two tiers of yellow roof. */
export function daiHongMon() {
  const cv = new Canvas(6 * T2, 3 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  cv.rect(0, 44, W, H - 44, LACQUER);
  for (let y = 48; y < H; y += 5) cv.rect(0, y, W, 1, LACQUER_DARK);
  cv.rect(0, 44, W, 3, GOLD);
  for (const [dx, w, h] of [[0, 30, 44], [-56, 22, 32], [56, 22, 32]]) {
    const x = cx + dx - w / 2;
    cv.rect(x, H - h, w, h, [44, 26, 22]);
    for (let j = 0; j < w / 2; j++) cv.rect(x + j, H - h - Math.round(Math.sqrt((w / 2) ** 2 - (w / 2 - j) ** 2) / 2), w - j * 2, 1, [44, 26, 22]);
    cv.rect(x - 2, H - h - 2, w + 4, 2, GOLD);
  }
  tiledRoof(cv, 4, 18, W - 8, 26, YELLOW, 8);
  cv.rect(cx - 40, 8, 80, 12, LACQUER);
  for (let x = cx - 38; x < cx + 38; x += 6) cv.rect(x, 8, 2, 12, GOLD);
  tiledRoof(cv, cx - 48, -2, 96, 12, YELLOW, 4);
  outline(cv);
  return cv;
}

/** Minh Lâu: 4 × 3 tiles — the two-storey pavilion of light on its terrace,
 *  red and gold, two tiers of yellow roof. */
export function minhLau() {
  const cv = new Canvas(4 * T2, 3 * T2);
  const W = cv.w, H = cv.h;
  platform(cv, 4, H - 18, W - 8, 18, 20);
  cv.rect(24, H - 44, W - 48, 26, LACQUER);
  for (let x = 26; x < W - 26; x += 10) column(cv, x, H - 44, 26);
  tiledRoof(cv, 12, H - 62, W - 24, 18, YELLOW, 6);
  cv.rect(36, H - 78, W - 72, 16, LACQUER);
  for (let x = 38; x < W - 38; x += 6) cv.rect(x, H - 78, 2, 16, GOLD);
  tiledRoof(cv, 26, H - 94, W - 52, 18, YELLOW, 6);
  ridgeDecor(cv, 36, W - 38, H - 96);
  outline(cv);
  return cv;
}

/** A trụ biểu: 1 × 3 tiles — the tall obelisk of the honour court, its
 *  carved shaft and finial. */
export function obelisk(spec) {
  const pal = spec.pal ?? OLD;
  const cv = new Canvas(T2, 3 * T2);
  cv.rect(4, 76, 24, 20, pal.face);
  cv.rect(4, 76, 24, 3, pal.light);
  cv.rect(9, 16, 14, 60, pal.base);
  cv.rect(9, 16, 4, 60, pal.light);
  cv.rect(20, 16, 3, 60, pal.face);
  for (let y = 22; y < 72; y += 8) cv.rect(11, y, 10, 2, pal.line);
  cv.rect(7, 10, 18, 6, pal.face);
  disc(cv, 16, 6, 5, pal.light);
  cv.rect(15, 0, 2, 3, pal.light);
  outline(cv);
  return cv;
}
