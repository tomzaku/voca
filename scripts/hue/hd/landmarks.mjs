// The city's other landmarks in detail — each the size of the map's own
// canvas for it, doubled, so it drops into the same place:
//
//   Ngọ Môn, Điện Thái Hòa, Hiển Lâm Các    the Imperial City's front
//   Thiên Mụ (tower and hall), Văn Miếu and its stelae, Tàng Thư Lâu
//   Ga Huế, Quốc Học, Cung An Định          the south bank's colonial-era buildings
//   the Citadel's gate towers, Phu Văn Lâu, Nghênh Lương Đình, the chè stall
//   Kim Long's wooden garden houses

import { Canvas, hash, mix } from '../core/canvas.mjs';
import { disc, door, outline, plaster, pot, tiledRoof } from './art.mjs';
import { GOLD, GOLD_DARK, GREEN, LACQUER, LACQUER_DARK, STONE, STONE_DARK, STONE_LIGHT, WOOD_DARK, YELLOW, bays, column, latticeDoor, platform, ridgeDecor } from './imperial.mjs';

const T2 = 32;
const TERRA = { base: [184, 108, 74], line: [156, 88, 60], light: [214, 140, 100], eave: [110, 62, 44], ridge: [128, 72, 50] };
const SLATE = { base: [96, 98, 110], line: [80, 82, 94], light: [126, 128, 142], eave: [56, 58, 68], ridge: [68, 70, 80] };
const DARK = { base: [116, 102, 92], line: [98, 86, 78], light: [146, 130, 116], eave: [70, 60, 54], ridge: [84, 72, 64] };
const BRICK = [146, 108, 88], BRICK_DARK = [118, 84, 68], BRICK_LIGHT = [172, 134, 110];

/** Stone courses: a wall of dressed stone, its joints staggered. */
function stoneWall(cv, x, y, w, h, base = [178, 170, 156]) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const row = Math.floor(j / 6);
    const joint = j % 6 === 0 || (i + (row % 2) * 7) % 14 === 0;
    cv.set(x + i, y + j, joint ? mix(base, [0, 0, 0], 0.2) : mix(base, [255, 255, 255], (hash(Math.floor((i + (row % 2) * 7) / 14), row) - 0.5) * 0.12));
  }
  cv.rect(x, y, w, 2, mix(base, [255, 255, 255], 0.2));
}

/** An arched opening, dark, a lighter voussoir edge. */
function arch(cv, cx, bottom, w, h, edge) {
  const r = w / 2;
  for (let y = bottom - h; y < bottom; y++) for (let x = Math.round(cx - r); x < cx + r; x++) {
    const dy = bottom - h + r - y;
    if (dy > 0 && (x + 0.5 - cx) ** 2 + dy * dy > r * r) continue;
    cv.set(x, y, [40, 30, 26]);
  }
  if (edge) for (let a = 0; a <= 20; a++) { const t = Math.PI * (a / 20); cv.set(cx - Math.cos(t) * (r + 1), bottom - h + r - Math.sin(t) * (r + 1), edge); }
}

/** A brick face in courses, damp and moss at its foot. */
function brickWall(cv, x, y, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const row = Math.floor(j / 4);
    let c = (j % 4 === 0 || (i + (row % 2) * 4) % 8 === 0) ? BRICK_DARK : BRICK;
    if (j > h * 0.75 && hash(x + i, y + j) < 0.3) c = [104, 116, 82];
    cv.set(x + i, y + j, c);
  }
}

// ── The Imperial City's front ──

/** Ngọ Môn: 12 × 6 tiles — the stone base and its five passages (the middle
 *  one the emperor's), and Lầu Ngũ Phụng above: a long pavilion of red
 *  columns under nine roofs, yellow in the middle and green-glazed at the
 *  wings. */
export function ngoMon() {
  const cv = new Canvas(12 * T2, 6 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  const by = H - 80;
  stoneWall(cv, 0, by, W, 80, [176, 168, 154]);
  for (const [dx, w, h] of [[0, 36, 44], [-80, 20, 32], [80, 20, 32], [-150, 16, 26], [150, 16, 26]]) arch(cv, cx + dx, H, w, h, [210, 202, 188]);
  cv.rect(cx - 18, H - 46, 36, 2, GOLD_DARK);
  cv.rect(0, by - 4, W, 4, [196, 188, 174]);                   // the base's coping
  // The pavilion: a long colonnade, the roofs stepped over it.
  const py = by - 24;
  cv.rect(20, py, W - 40, 22, LACQUER);
  for (let x = 22; x < W - 22; x += 10) column(cv, x, py, 22);
  for (let x = 26; x < W - 24; x += 10) { cv.rect(x, py + 3, 5, 6, GOLD); cv.rect(x + 1, py + 4, 3, 4, LACQUER_DARK); }
  tiledRoof(cv, 12, py - 26, 108, 26, GREEN, 8);                  // west wing
  tiledRoof(cv, W - 120, py - 26, 108, 26, GREEN, 8);             // east wing
  tiledRoof(cv, 112, py - 34, W - 224, 34, YELLOW, 10);           // the middle
  cv.rect(136, py - 52, W - 272, 18, LACQUER);
  for (let x = 138; x < W - 138; x += 8) { cv.rect(x, py - 52, 2, 18, GOLD); }
  tiledRoof(cv, 126, py - 74, W - 252, 24, YELLOW, 8);
  ridgeDecor(cv, 140, W - 142, py - 76);
  for (const ex of [30, W - 32]) ridgeDecor(cv, ex - 14, ex + 12, py - 28, GREEN);
  outline(cv);
  return cv;
}

/** Điện Thái Hòa: 12 × 6 tiles — the throne hall on its two-level terrace,
 *  the double yellow roof, eighty lacquered columns showing as a deep
 *  colonnade, the dragon steps up the middle. */
export function thaiHoa() {
  const cv = new Canvas(12 * T2, 6 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  platform(cv, 0, H - 52, W, 52, 0);
  platform(cv, 20, H - 88, W - 40, 38, 0);
  for (const y of [H - 50, H - 86]) for (let x = 4; x < W - 4; x += 8) { cv.rect(x, y, 2, 6, STONE_LIGHT); cv.rect(x, y + 6, 2, 1, STONE_DARK); }   // balustrades
  // The dragon steps: three flights, the middle a carved ramp.
  for (let y = H - 88; y < H; y += 4) { cv.rect(cx - 30, y, 60, 3, STONE_LIGHT); cv.rect(cx - 30, y + 3, 60, 1, STONE_DARK); }
  for (let y = H - 88; y < H; y++) cv.rect(cx - 8, y, 16, 1, (y % 6 < 3) ? [214, 196, 150] : [190, 172, 128]);
  // The hall: a deep colonnade, lattice doors behind.
  const hy = H - 128, hh = 40;
  cv.rect(40, hy, W - 80, hh, [70, 30, 24]);
  for (let x = 44; x < W - 44; x += 14) latticeDoor(cv, x + 3, hy + 6, 10, hh - 8);
  for (let x = 40; x < W - 40; x += 14) column(cv, x, hy, hh);
  cv.rect(36, hy - 4, W - 72, 4, LACQUER_DARK);
  for (let x = 38; x < W - 38; x += 7) cv.rect(x, hy - 4, 4, 2, GOLD);
  tiledRoof(cv, 24, hy - 34, W - 48, 34, YELLOW, 10);
  cv.rect(64, hy - 54, W - 128, 20, LACQUER);
  for (let x = 66; x < W - 66; x += 6) cv.rect(x, hy - 54, 2, 20, GOLD);
  cv.rect(cx - 24, hy - 52, 48, 14, LACQUER_DARK);               // the plaque
  cv.rect(cx - 23, hy - 51, 46, 12, [60, 30, 24]);
  for (let i = 0; i < 3; i++) cv.rect(cx - 16 + i * 12, hy - 48, 7, 6, GOLD);
  tiledRoof(cv, 52, hy - 80, W - 104, 28, YELLOW, 10);
  ridgeDecor(cv, 70, W - 72, hy - 82);
  outline(cv);
  return cv;
}

/** Hiển Lâm Các: 2 × 4 tiles — three tiers, each red and gold under a
 *  yellow roof, narrowing upward; the tallest building allowed here. */
export function hienLam() {
  const cv = new Canvas(2 * T2, 4 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  platform(cv, 4, H - 14, W - 8, 14, 0);
  for (const [y, w, rh] of [[H - 36, 46, 12], [H - 66, 34, 10], [H - 94, 22, 10]]) {
    cv.rect(cx - w / 2, y, w, 22, LACQUER);
    for (let x = cx - w / 2 + 2; x < cx + w / 2 - 2; x += 6) { cv.rect(x, y, 2, 22, [196, 64, 48]); cv.rect(x + 3, y + 4, 2, 6, GOLD); }
    tiledRoof(cv, cx - w / 2 - 6, y - rh, w + 12, rh, YELLOW, 4);
  }
  ridgeDecor(cv, cx - 8, cx + 6, H - 106);
  outline(cv);
  return cv;
}

// ── Kim Long ──

/** Thiên Mụ's Phước Duyên tower: 4 × 10 tiles — seven octagonal storeys of
 *  rose brick, each with its arched niche and its ledge, the gilded finial. */
export function thienMuTower() {
  const cv = new Canvas(4 * T2, 10 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  cv.rect(4, H - 16, W - 8, 16, STONE);
  cv.rect(4, H - 16, W - 8, 3, STONE_LIGHT);
  let y = H - 16;
  for (let tier = 0; tier < 7; tier++) {
    const tw = 88 - tier * 8, th = 30 - tier * 2;
    const x = Math.round(cx - tw / 2);
    y -= th;
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
      const facet = i < 8 ? 0.12 : i > tw - 12 ? -0.18 : 0;
      cv.set(x + i, y + j, mix(mix([206, 142, 114], [190, 124, 98], (j % 4 === 0) ? 0.6 : hash(i >> 2, j >> 2) * 0.3), facet > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(facet)));
    }
    arch(cv, cx, y + th - 3, 8, Math.max(8, th - 10), [236, 210, 170]);
    cv.rect(x - 6, y - 5, tw + 12, 5, [96, 82, 76]);
    cv.rect(x - 6, y - 5, tw + 12, 2, [130, 114, 104]);
    for (const ex of [x - 8, x + tw + 6]) cv.rect(ex, y - 7, 2, 3, [96, 82, 76]);
    y -= 5;
  }
  cv.rect(cx - 4, y - 14, 8, 14, [212, 172, 82]);
  disc(cv, cx, y - 18, 5, [234, 196, 100]);
  cv.rect(cx - 1, y - 30, 3, 10, [234, 196, 100]);
  outline(cv);
  return cv;
}

/** Thiên Mụ's temple hall (Đại Hùng Bảo Điện): 5 × 5 tiles — a long
 *  low hall under a dark tiled roof, its ridge dragons, lattice doors,
 *  incense smoke rising from the burner before it. */
export function thienMuHall() {
  const cv = new Canvas(5 * T2, 5 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  platform(cv, 0, H - 16, W, 16, 22);
  cv.rect(6, H - 62, W - 12, 46, [206, 190, 160]);
  bays(cv, 10, H - 58, W - 20, 42, 5, [150, 60, 46]);
  tiledRoof(cv, 0, 22, W, H - 84, DARK, 16);
  ridgeDecor(cv, 18, W - 20, 18, DARK);
  cv.rect(cx - 5, H - 12, 10, 6, [110, 92, 60]);                  // the burner
  for (let i = 0; i < 10; i++) cv.set(cx + Math.round(Math.sin(i * 0.9) * 2), H - 14 - i * 2, [230, 230, 236]);
  outline(cv);
  return cv;
}

/** Văn Miếu: 6 × 5 tiles — the temple of literature: a dark-roofed hall of
 *  red columns on a stone platform, an incense table before the doors. */
export function vanMieu() {
  const cv = new Canvas(6 * T2, 5 * T2);
  const W = cv.w, H = cv.h;
  platform(cv, 0, H - 18, W, 18, 28);
  bays(cv, 8, H - 62, W - 16, 44, 7, [150, 54, 40]);
  tiledRoof(cv, 0, 24, W, H - 86, DARK, 16);
  ridgeDecor(cv, 18, W - 20, 20, DARK);
  outline(cv);
  return cv;
}

/** A stele pavilion at Văn Miếu: 2 × 3 tiles — the carved stone tablet on
 *  its tortoise, under a little roof on red posts. */
export function stele() {
  const cv = new Canvas(2 * T2, 3 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  cv.ellipse(cx, H - 8, 18, 7, [120, 126, 100]);                  // the tortoise
  cv.ellipse(cx, H - 10, 14, 5, [150, 156, 126]);
  cv.rect(cx - 13, H - 54, 26, 44, [150, 148, 142]);
  cv.rect(cx - 11, H - 52, 22, 40, [122, 120, 116]);
  for (let y = H - 48; y < H - 16; y += 3) cv.rect(cx - 8, y, 16, 1, [168, 166, 160]);
  for (const x of [4, W - 8]) column(cv, x, 34, H - 44, [160, 50, 40]);
  tiledRoof(cv, 2, 14, W - 4, 22, DARK, 6);
  outline(cv);
  return cv;
}

/** Tàng Thư Lâu: 6 × 5 tiles — the royal library: two storeys on a raised
 *  stone base, red walls and gold-framed windows, glazed green roofs. */
export function tangThuLau() {
  const cv = new Canvas(6 * T2, 5 * T2);
  const W = cv.w, H = cv.h;
  platform(cv, 2, H - 16, W - 4, 16, 24);
  cv.rect(10, H - 62, W - 20, 46, [134, 56, 42]);
  for (const wx of [24, W - 48]) {
    cv.rect(wx, H - 52, 24, 24, [214, 186, 120]);
    for (let k = 0; k < 24; k += 4) { cv.rect(wx + k, H - 52, 1, 24, [120, 84, 52]); cv.rect(wx, H - 52 + k, 24, 1, [120, 84, 52]); }
  }
  latticeDoor(cv, W / 2 - 12, H - 52, 24, 36);
  for (let x = 10; x < W - 10; x += 24) column(cv, x, H - 62, 46, [190, 152, 92]);
  tiledRoof(cv, 0, H - 92, W, 30, GREEN, 10);
  cv.rect(36, H - 118, W - 72, 26, [134, 56, 42]);
  for (let x = 40; x < W - 40; x += 14) cv.rect(x, H - 112, 8, 12, [214, 186, 120]);
  tiledRoof(cv, 24, H - 150, W - 48, 34, GREEN, 10);
  ridgeDecor(cv, 40, W - 42, H - 152, GREEN);
  outline(cv);
  return cv;
}

/** A garden house of Kim Long: 4 × 4 tiles — dark wood under a tiled roof,
 *  carved wooden doors and lattice windows, a pot of flowers by the step. */
export function gardenHouse(spec) {
  const cv = new Canvas(4 * T2, 4 * T2);
  const W = cv.w, H = cv.h;
  const pal = spec.roofPal ?? DARK;
  cv.rect(4, 60, W - 8, H - 66, [110, 74, 50]);
  for (let x = 6; x < W - 6; x += 4) cv.rect(x, 60, 1, H - 66, [92, 60, 40]);
  for (const wx of [14, W - 34]) {
    cv.rect(wx, 74, 20, 18, [150, 108, 70]);
    for (let k = 2; k < 20; k += 4) cv.rect(wx + k, 74, 1, 18, [92, 60, 40]);
  }
  latticeDoor(cv, W / 2 - 10, 74, 20, H - 80, WOOD_DARK, [200, 158, 100]);
  for (const x of [4, W / 2 - 16, W / 2 + 12, W - 8]) column(cv, x, 60, H - 66, [120, 66, 44]);
  cv.rect(0, H - 6, W, 6, [170, 160, 144]);
  pot(cv, W - 22, H - 6);
  tiledRoof(cv, 0, 12, W, 50, pal, 12);
  outline(cv);
  return cv;
}

// ── The south bank ──

/** Ga Huế: 9 × 5 tiles — the cream station with its red-tiled roofs and
 *  the clock tower over the entrance, tall arched windows. */
export function gaHue() {
  const cv = new Canvas(9 * T2, 5 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  plaster(cv, 4, 60, W - 8, H - 66, [238, 224, 190]);
  for (let x = 16; x < W - 16; x += 26) {
    if (Math.abs(x + 6 - cx) < 30) continue;
    arch(cv, x + 6, H - 20, 12, 30, [250, 242, 222]);
    cv.rect(x, H - 50, 1, 30, [210, 196, 160]);
  }
  arch(cv, cx, H - 6, 28, 44, [250, 242, 222]);
  cv.rect(0, H - 6, W, 6, [180, 172, 158]);
  tiledRoof(cv, 0, 14, W, 48, TERRA, 14);
  // The clock tower.
  plaster(cv, cx - 22, 0, 44, 64, [244, 232, 204]);
  tiledRoof(cv, cx - 26, -2, 52, 14, TERRA, 6);
  disc(cv, cx, 30, 13, [92, 80, 70]);
  disc(cv, cx, 30, 11, [252, 248, 238]);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cv.set(cx + Math.cos(a) * 9, 30 + Math.sin(a) * 9, [70, 60, 54]); }
  cv.rect(cx, 22, 1, 8, [40, 36, 34]);
  cv.rect(cx, 30, 6, 1, [40, 36, 34]);
  cv.rect(cx - 20, 46, 40, 8, [176, 70, 50]);
  for (let i = 0; i < 6; i++) cv.rect(cx - 16 + i * 6, 49, 3, 2, [246, 226, 160]);
  outline(cv);
  return cv;
}

/** Quốc Học: 12 × 5 tiles — the oxblood school with its white trim, two
 *  rows of tall windows, and the white portico at the middle. */
export function quocHoc() {
  const cv = new Canvas(12 * T2, 5 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  const by = H - 88;
  cv.rect(4, by, W - 8, 88, [156, 60, 52]);
  for (let x = 4; x < W - 4; x += 44) cv.rect(x, by, 4, 88, [240, 236, 226]);
  cv.rect(4, by + 42, W - 8, 4, [240, 236, 226]);
  for (let x = 14; x < W - 20; x += 22) {
    if (Math.abs(x + 5 - cx) < 44) continue;
    for (const wy of [by + 10, by + 54]) {
      cv.rect(x, wy, 10, 24, [240, 236, 226]);
      cv.rect(x + 2, wy + 2, 6, 20, [64, 104, 88]);
      cv.rect(x + 2, wy + 11, 6, 1, [240, 236, 226]);
    }
  }
  tiledRoof(cv, 0, by - 56, W, 58, SLATE, 16);
  // The portico.
  cv.rect(cx - 38, by - 10, 76, 98, [156, 60, 52]);
  for (let i = 0; i < 24; i++) cv.rect(cx - 38 + i * 1.5, by - 10 - i, 76 - i * 3, 1, [244, 240, 232]);
  for (let x = cx - 34; x < cx + 34; x += 14) { cv.rect(x, by + 12, 6, 76, [248, 246, 240]); cv.rect(x + 4, by + 12, 2, 76, [214, 210, 200]); }
  cv.rect(cx - 42, by + 6, 84, 6, [240, 236, 226]);
  door(cv, cx, H, 20, 32);
  outline(cv);
  return cv;
}

/** Cung An Định: 8 × 5 tiles — the European-style palace: a pale façade of
 *  columns and arched windows, balustrades, a slate roof, a pediment. */
export function anDinh() {
  const cv = new Canvas(8 * T2, 5 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  plaster(cv, 6, 60, W - 12, H - 66, [236, 222, 192]);
  for (let x = 14; x < W - 14; x += 20) {
    arch(cv, x + 6, H - 50, 12, 22, [250, 242, 222]);
    arch(cv, x + 6, H - 10, 12, 22, [250, 242, 222]);
    cv.rect(x - 4, 64, 3, H - 70, [214, 200, 170]);
  }
  cv.rect(6, H - 46, W - 12, 4, [214, 200, 170]);
  for (let x = 8; x < W - 8; x += 4) cv.rect(x, H - 50, 2, 4, [246, 238, 220]);
  cv.rect(0, H - 6, W, 6, [180, 172, 158]);
  tiledRoof(cv, 0, 20, W, 42, SLATE, 12);
  for (let i = 0; i < 18; i++) cv.rect(cx - 30 + i * 1.7, 40 - i, 60 - i * 3.4, 1, [244, 234, 210]);
  disc(cv, cx, 32, 5, [214, 186, 110]);
  outline(cv);
  return cv;
}

// ── The Citadel's gates and the river pavilions ──

/** A gate tower of the Citadel: 4 × 4 tiles — weathered brick over the
 *  dark arched passage, a cornice, and the pavilion on top: red columns,
 *  two tiers of yellow roof. */
export function gateTower() {
  const cv = new Canvas(4 * T2, 4 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  brickWall(cv, 4, 60, W - 8, H - 60);
  arch(cv, cx, H, 30, 40, [176, 140, 112]);
  cv.rect(0, 56, W, 6, BRICK_LIGHT);
  for (let x = 0; x < W; x += 8) cv.rect(x, 50, 5, 6, BRICK_LIGHT);
  cv.rect(28, 30, W - 56, 22, LACQUER);
  for (let x = 30; x < W - 30; x += 10) column(cv, x, 30, 22);
  tiledRoof(cv, 14, 14, W - 28, 18, YELLOW, 6);
  cv.rect(44, 4, W - 88, 10, LACQUER);
  tiledRoof(cv, 36, -2, W - 72, 10, YELLOW, 4);
  outline(cv);
  return cv;
}

/** A side-wall gate tower from above: 3 × 4 tiles — a hipped yellow roof
 *  with its ridge along the wall, the brick face under the eaves. */
export function sideGateTower() {
  const cv = new Canvas(3 * T2, 4 * T2);
  const x0 = 20, x1 = 76, mid = 48;
  brickWall(cv, x0 + 4, 92, x1 - x0 - 8, 28);
  cv.rect(x0 + 4, 88, x1 - x0 - 8, 5, LACQUER);
  for (let x = x0 + 8; x < x1 - 6; x += 10) cv.rect(x, 88, 3, 5, [196, 64, 48]);
  for (let y = 12; y < 88; y++) for (let x = x0; x < x1; x++) {
    const d = Math.abs(x + 0.5 - mid);
    let c = d < 3 ? YELLOW.ridge : (x - x0) % 5 === 0 ? YELLOW.line : x < mid ? mix(YELLOW.base, YELLOW.light, 0.3) : YELLOW.base;
    if (y % 6 === 0 && d >= 3) c = mix(c, YELLOW.line, 0.6);
    if (x === x0 || x === x1 - 1) c = YELLOW.eave;
    cv.set(x, y, c);
  }
  cv.rect(x0, 84, x1 - x0, 4, YELLOW.eave);
  for (const [x, y] of [[x0 - 4, 8], [x1, 8], [x0 - 4, 84], [x1, 84]]) cv.rect(x, y, 4, 4, YELLOW.ridge);
  outline(cv);
  return cv;
}

/** Phu Văn Lâu: 4 × 3 tiles — the pavilion of edicts: two storeys of red
 *  columns on a stone base, yellow roofs, the board where edicts were posted. */
export function phuVanLau() {
  const cv = new Canvas(4 * T2, 3 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  platform(cv, 2, H - 16, W - 4, 16, 18);
  for (let x = 10; x < W - 10; x += 14) column(cv, x, H - 44, 28);
  cv.rect(cx - 16, H - 40, 32, 18, [240, 230, 200]);                // the edict board
  for (let y = H - 37; y < H - 25; y += 3) cv.rect(cx - 12, y, 24, 1, [120, 100, 80]);
  tiledRoof(cv, 2, H - 62, W - 4, 18, YELLOW, 6);
  cv.rect(32, H - 78, W - 64, 16, LACQUER);
  for (let x = 34; x < W - 34; x += 8) cv.rect(x, H - 78, 3, 16, GOLD);
  tiledRoof(cv, 20, H - 94, W - 40, 18, YELLOW, 6);
  ridgeDecor(cv, 30, W - 32, H - 96);
  outline(cv);
  return cv;
}

/** Nghênh Lương Đình: 2 × 2 tiles — the small open pavilion at the water,
 *  four red posts, a yellow roof, steps down to the river. */
export function nghenhLuong() {
  const cv = new Canvas(2 * T2, 2 * T2);
  const W = cv.w, H = cv.h;
  platform(cv, 2, H - 14, W - 4, 14, 0);
  for (const x of [8, 22, 38, 52]) column(cv, x, H - 38, 24);
  cv.rect(6, H - 22, W - 12, 3, LACQUER);
  tiledRoof(cv, 0, 8, W, 22, YELLOW, 7);
  ridgeDecor(cv, 10, W - 12, 6);
  outline(cv);
  return cv;
}

/** Cồn Hến's chè stall: 2 × 2 tiles — a hut under a striped awning, the pots
 *  and glasses on its counter. */
export function cheStall() {
  const cv = new Canvas(2 * T2, 2 * T2);
  const W = cv.w, H = cv.h;
  cv.rect(6, 28, W - 12, H - 30, [196, 170, 128]);
  for (let x = 6; x < W - 6; x += 4) cv.rect(x, 28, 1, H - 30, [176, 150, 108]);
  cv.rect(10, 40, W - 20, 6, [130, 96, 64]);
  for (let i = 0; i < 6; i++) { cv.rect(12 + i * 7, 34, 4, 6, [[236, 210, 160], [176, 120, 200], [120, 180, 90]][i % 3]); cv.rect(12 + i * 7, 34, 4, 1, [250, 250, 250]); }
  for (let x = 0; x < W; x++) for (let y = 14; y < 26; y++) cv.set(x, y, Math.floor(x / 6) % 2 ? [92, 140, 130] : [240, 236, 226]);
  for (let x = 0; x < W; x += 6) cv.rect(x, 26, 3, 2, [92, 140, 130]);
  tiledRoof(cv, 2, 4, W - 4, 10, DARK, 3);
  outline(cv);
  return cv;
}

