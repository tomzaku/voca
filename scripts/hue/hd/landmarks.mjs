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
const RED_TILE = { base: [192, 76, 54], line: [164, 60, 44], light: [222, 110, 80], eave: [118, 40, 32], ridge: [140, 50, 38] };
const CORAL = [198, 74, 68], CORAL_DARK = [164, 54, 50], CORAL_LIGHT = [218, 104, 94];
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

/** Rubble stone: each pixel takes the stone whose jittered centre is
 *  nearest, with a mortar joint where two stones meet. */
function rubble(cv, x0, y0, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let d1 = 1e9, d2 = 1e9, id = 0;
    const gx = Math.floor(i / 7), gy = Math.floor(j / 6);
    for (let v = gy - 1; v <= gy + 1; v++) for (let u = gx - 1; u <= gx + 1; u++) {
      const d = Math.hypot(i - (u + hash(u, v * 3)) * 7, (j - (v + hash(u * 5, v)) * 6) * 1.2);
      if (d < d1) { d2 = d1; d1 = d; id = u * 31 + v; } else if (d < d2) d2 = d;
    }
    let c = d2 - d1 < 1.2 ? [118, 108, 90] : mix([206, 196, 166], [164, 152, 122], hash(id, 7));
    if (j < 2) c = [214, 206, 182];
    cv.set(x0 + i, y0 + j, c);
  }
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

/** Quốc Học: 12 × 5 tiles — the school as it stands: coral-red walls
 *  picked out in white, a hipped roof of red tile, the pediment over the
 *  middle bay; tall shuttered windows under white hoods upstairs, arched
 *  ones below, all on a footing of rubble stone. */
export function quocHoc() {
  const cv = new Canvas(12 * T2, 5 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  const top = 54, floor = 104, foot = H - 12;
  const WHITE = [244, 238, 228], WHITE_DARK = [214, 204, 192];
  const SHUTTER = [112, 64, 46], SHUTTER_DARK = [82, 44, 32];
  for (let y = top; y < foot; y++) for (let x = 4; x < W - 4; x++) {
    cv.set(x, y, mix(CORAL, CORAL_DARK, hash(x, y) * 0.2 + ((y - top) / (foot - top)) * 0.2));
  }
  rubble(cv, 2, foot, W - 4, H - foot);
  cv.rect(4, top, W - 8, 4, WHITE);
  cv.rect(4, floor, W - 8, 4, WHITE);
  cv.rect(4, floor + 4, W - 8, 1, WHITE_DARK);
  for (let x = 20; x < W - 20; x += 24) {
    if (Math.abs(x + 7 - cx) < 40) continue;
    // Upstairs: a tall shuttered window, a white hood on brackets, a sill.
    cv.rect(x - 4, top + 10, 22, 4, WHITE);
    cv.rect(x - 2, top + 14, 2, 3, WHITE_DARK); cv.rect(x + 14, top + 14, 2, 3, WHITE_DARK);
    cv.rect(x, top + 16, 14, 26, SHUTTER);
    for (let y = top + 17; y < top + 42; y += 3) cv.rect(x, y, 14, 1, SHUTTER_DARK);
    cv.rect(x + 6, top + 16, 2, 26, SHUTTER_DARK);
    cv.rect(x - 3, top + 42, 20, 3, WHITE);
    // Below: an arched window in a white surround.
    for (let y = floor + 12; y < foot - 4; y++) for (let i = -10; i < 10; i++) {
      const dy = floor + 19 - y;
      if (dy > 0 && (i + 0.5) ** 2 + dy * dy > 100) continue;
      const inner = Math.abs(i + 0.5) < 7 && (dy <= 0 || (i + 0.5) ** 2 + dy * dy <= 49);
      cv.set(x + 7 + i, y, !inner ? WHITE : Math.abs(i + 0.5) < 1 || y % 3 === 0 ? SHUTTER_DARK : SHUTTER);
    }
    cv.rect(x - 4, foot - 4, 22, 3, WHITE);
    cv.rect(x - 7, top + 4, 2, foot - top - 4, CORAL_LIGHT);           // pilasters
  }
  tiledRoof(cv, 0, 12, W, top - 10, RED_TILE, 18);
  // The middle bay stands forward under its pediment.
  const bx = cx - 38, bw = 76;
  for (let y = top - 6; y < foot; y++) for (let x = bx; x < bx + bw; x++) cv.set(x, y, mix(CORAL_LIGHT, CORAL, hash(x, y) * 0.3));
  for (let i = 0; i < 30; i++) {
    const half = Math.round((bw / 2 + 4) * (1 - i / 30));
    cv.rect(cx - half, top - 6 - i, half * 2, 1, i < 3 || i === 29 ? WHITE : mix(CORAL, CORAL_DARK, 0.15));
    cv.set(cx - half, top - 6 - i, WHITE); cv.set(cx - half + 1, top - 6 - i, WHITE);
    cv.set(cx + half - 1, top - 6 - i, WHITE); cv.set(cx + half - 2, top - 6 - i, WHITE);
  }
  cv.ellipse(cx, top - 18, 7, 5, WHITE);
  cv.ellipse(cx, top - 18, 5, 3.5, [196, 160, 80]);
  cv.rect(bx - 2, top - 6, bw + 4, 4, WHITE);
  for (const x of [bx, bx + bw - 6]) cv.rect(x, top - 2, 6, foot - top + 2, WHITE_DARK);
  for (let x = bx + 12; x < bx + bw - 12; x += 18) {
    cv.rect(x - 2, top + 8, 16, 3, WHITE);
    cv.rect(x, top + 12, 12, 28, SHUTTER);
    for (let y = top + 13; y < top + 40; y += 3) cv.rect(x, y, 12, 1, SHUTTER_DARK);
  }
  cv.rect(bx - 2, floor, bw + 4, 4, WHITE);
  door(cv, cx, foot, 22, 30);
  for (let x = cx - 18; x < cx + 18; x++) cv.set(x, foot - 34 - Math.round(Math.sqrt(Math.max(0, 324 - (x - cx) ** 2)) / 3), WHITE);
  cv.rect(cx - 16, foot, 32, H - foot, STONE_LIGHT);
  for (let y = foot + 3; y < H; y += 3) cv.rect(cx - 16, y, 32, 1, STONE_DARK);
  outline(cv);
  return cv;
}

/** Hai Bà Trưng: 10 × 5 tiles — the old Đồng Khánh girls' school beside
 *  Quốc Học: two storeys in dusty rose picked out in white, an open arcade
 *  along the ground floor, shuttered windows above, a hipped roof of red
 *  tile and a gabled middle bay with its plaque. */
export function haiBaTrung() {
  const cv = new Canvas(10 * T2, 5 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  const ROSE = [218, 142, 132], ROSE_DARK = [192, 118, 110], ROSE_LIGHT = [234, 170, 160];
  const WHITE = [246, 240, 230], WHITE_DARK = [216, 206, 194];
  const SHUTTER = [96, 108, 84], SHUTTER_DARK = [70, 80, 62];
  const top = 54, floor = 102, foot = H - 8;
  for (let y = top; y < foot; y++) for (let x = 4; x < W - 4; x++) {
    cv.set(x, y, mix(ROSE, ROSE_DARK, hash(x, y) * 0.2 + ((y - top) / (foot - top)) * 0.2));
  }
  cv.rect(4, top, W - 8, 4, WHITE);
  cv.rect(4, floor - 4, W - 8, 5, WHITE);
  cv.rect(4, floor + 1, W - 8, 1, WHITE_DARK);
  for (let x = 14; x < W - 14; x += 22) {
    if (Math.abs(x + 6 - cx) < 30) continue;
    // Upstairs: a shuttered window with a white surround.
    cv.rect(x - 2, top + 10, 16, 30, WHITE);
    cv.rect(x, top + 12, 12, 26, SHUTTER);
    for (let y = top + 13; y < top + 38; y += 3) cv.rect(x, y, 12, 1, SHUTTER_DARK);
    cv.rect(x + 5, top + 12, 2, 26, SHUTTER_DARK);
    // Below: the arcade, an arch into the shaded gallery.
    for (let y = floor + 6; y < foot; y++) for (let i = -9; i < 9; i++) {
      const dy = floor + 15 - y;
      if (dy > 0 && (i + 0.5) ** 2 + dy * dy > 81) continue;
      cv.set(x + 6 + i, y, y > foot - 10 ? [118, 92, 84] : [92, 64, 60]);
    }
    for (let a = 0; a <= 16; a++) { const t = Math.PI * (a / 16); cv.set(x + 6 - Math.cos(t) * 10, floor + 15 - Math.sin(t) * 10, WHITE); }
    cv.rect(x - 5, top + 4, 2, foot - top - 4, ROSE_LIGHT);
  }
  tiledRoof(cv, 0, 12, W, top - 10, RED_TILE, 16);
  // The middle bay, forward under its gable.
  const bx = cx - 28, bw = 56;
  for (let y = top - 4; y < foot; y++) for (let x = bx; x < bx + bw; x++) cv.set(x, y, mix(ROSE_LIGHT, ROSE, hash(x, y) * 0.3));
  for (let i = 0; i < 24; i++) {
    const half = Math.round((bw / 2 + 3) * (1 - i / 26));
    cv.rect(cx - half, top - 4 - i, half * 2, 1, i < 2 ? WHITE : ROSE);
    cv.rect(cx - half, top - 4 - i, 2, 1, WHITE); cv.rect(cx + half - 2, top - 4 - i, 2, 1, WHITE);
  }
  cv.rect(cx - 10, top - 18, 20, 7, WHITE);
  cv.rect(cx - 8, top - 16, 16, 3, [196, 160, 80]);
  for (const x of [bx, bx + bw - 5]) cv.rect(x, top - 4, 5, foot - top + 4, WHITE_DARK);
  for (const x of [cx - 18, cx + 6]) {
    cv.rect(x - 2, top + 8, 16, 32, WHITE);
    cv.rect(x, top + 10, 12, 28, SHUTTER);
    for (let y = top + 11; y < top + 38; y += 3) cv.rect(x, y, 12, 1, SHUTTER_DARK);
  }
  cv.rect(bx - 2, floor - 4, bw + 4, 5, WHITE);
  door(cv, cx, foot, 20, 28);
  cv.rect(0, foot, W, H - foot, STONE);
  cv.rect(0, foot, W, 1, STONE_LIGHT);
  outline(cv);
  return cv;
}

/** Hotel Saigon Morin: 9 × 5 tiles — Huế's oldest hotel, at the south end
 *  of Trường Tiền: four storeys of cream picked out in white, green
 *  shutters, iron balconies, an arcade along the street, and its name along
 *  the parapet. */
export function saigonMorin() {
  const cv = new Canvas(9 * T2, 5 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  const CREAM = [242, 228, 192], CREAM_DARK = [222, 204, 164], WHITE = [250, 246, 236], WHITE_DARK = [220, 214, 200];
  const SHUTTER = [70, 112, 88], SHUTTER_DARK = [50, 84, 66], IRON = [52, 50, 54];
  const top = 26, foot = H - 6, floors = [top + 8, top + 36, top + 64], ground = top + 92;
  for (let y = top; y < foot; y++) for (let x = 4; x < W - 4; x++) cv.set(x, y, mix(CREAM, CREAM_DARK, hash(x, y) * 0.2 + ((y - top) / (foot - top)) * 0.25));
  // The parapet, with the name board raised in the middle.
  cv.rect(2, top - 6, W - 4, 8, WHITE);
  for (let x = 6; x < W - 6; x += 5) cv.rect(x, top - 4, 3, 4, WHITE_DARK);
  cv.rect(cx - 50, top - 18, 100, 14, WHITE);
  cv.rect(cx - 46, top - 15, 92, 8, [168, 40, 36]);
  for (let x = cx - 42; x < cx + 42; x += 5) cv.rect(x, top - 13, 3, 4, [250, 220, 130]);
  for (const y of floors.slice(1).concat(ground)) { cv.rect(2, y - 4, W - 4, 3, WHITE); cv.rect(2, y - 1, W - 4, 1, WHITE_DARK); }
  for (let x = 14; x < W - 14; x += 20) {
    for (const [f, y] of floors.entries()) {
      // A tall window, shutters folded open either side, a white hood.
      cv.rect(x - 1, y - 2, 14, 2, WHITE);
      cv.rect(x + 2, y, 8, 20, [64, 72, 84]);
      cv.rect(x + 2, y + 9, 8, 1, WHITE_DARK);
      for (const sx of [x - 1, x + 10]) { cv.rect(sx, y, 3, 20, SHUTTER); for (let yy = y + 1; yy < y + 20; yy += 3) cv.rect(sx, yy, 3, 1, SHUTTER_DARK); }
      // Iron balconies on the middle bays.
      if (Math.abs(x + 6 - cx) < 56 && f < 2) {
        cv.rect(x - 3, y + 20, 18, 2, WHITE_DARK);
        for (let i = x - 3; i < x + 15; i += 2) cv.rect(i, y + 15, 1, 5, IRON);
        cv.rect(x - 3, y + 14, 18, 1, IRON);
      } else cv.rect(x - 1, y + 20, 14, 2, WHITE);
    }
    // The arcade along the street.
    for (let y = ground + 4; y < foot; y++) for (let i = -7; i < 7; i++) {
      const dy = ground + 11 - y;
      if (dy > 0 && (i + 0.5) ** 2 + dy * dy > 49) continue;
      cv.set(x + 6 + i, y, y > foot - 8 ? [128, 108, 90] : [96, 76, 64]);
    }
    for (let a = 0; a <= 14; a++) { const t = Math.PI * (a / 14); cv.set(x + 6 - Math.cos(t) * 8, ground + 11 - Math.sin(t) * 8, WHITE); }
    cv.rect(x - 4, top + 2, 2, foot - top - 2, WHITE_DARK);           // pilasters
  }
  // Awnings over the café tables along the arcade.
  for (let x = 12; x < W - 12; x += 40) {
    for (let i = 0; i < 16; i++) cv.rect(x + i * 2, ground + 2, 2, 6, i % 2 ? [250, 246, 236] : [176, 52, 44]);
  }
  cv.rect(0, foot, W, H - foot, STONE);
  cv.rect(0, foot, W, 1, STONE_LIGHT);
  outline(cv);
  return cv;
}

/** Quốc Học's gate on its wall, 12 × 3 tiles: four red pillars under two
 *  tiers of tiled roof, a balustrade between them pierced with white
 *  squares, the name board over the way in; either side, the low red wall
 *  in white-framed panels, lotus buds on its posts. The middle is open. */
export function quocHocGate() {
  const cv = new Canvas(12 * T2, 3 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  const WHITE = [244, 238, 228], WHITE_DARK = [210, 200, 190];
  const wallTop = H - 30;
  // The wall, in panels, either side of the gate.
  for (const [x0, x1] of [[2, cx - 66], [cx + 66, W - 2]]) {
    for (let y = wallTop; y < H - 2; y++) for (let x = x0; x < x1; x++) cv.set(x, y, mix(CORAL, CORAL_DARK, hash(x, y) * 0.25 + (y - wallTop) / 60));
    cv.rect(x0, wallTop - 4, x1 - x0, 4, WHITE);
    for (let x = x0 + 3; x < x1 - 2; x += 6) disc(cv, x, wallTop - 5, 1.5, WHITE);
    cv.rect(x0, H - 6, x1 - x0, 4, CORAL_DARK);
    const posts = [x0, x1 - 8];
    for (let x = x0 + 40; x < x1 - 30; x += 44) posts.push(x);
    for (let p = 0; p < posts.length - 1; p++) {
      const a = posts[p] + 12, b = posts[p + 1] - 4;
      if (b - a < 10) continue;
      cv.rect(a, wallTop + 6, b - a, 14, WHITE); cv.rect(a + 1, wallTop + 7, b - a - 2, 12, CORAL);
      const m = Math.round((a + b) / 2);
      if (p % 2) { cv.rect(m - 5, wallTop + 7, 10, 12, WHITE); cv.rect(m - 3, wallTop + 9, 6, 8, CORAL_DARK); cv.rect(m - 1, wallTop + 9, 2, 8, WHITE); cv.rect(m - 3, wallTop + 12, 6, 2, WHITE); }
    }
    for (const x of posts) {
      cv.rect(x, wallTop - 14, 8, H - 2 - wallTop + 14, CORAL);
      cv.rect(x, wallTop - 14, 2, H - 2 - wallTop + 14, CORAL_LIGHT);
      cv.rect(x - 1, wallTop - 16, 10, 3, WHITE);
      // A lotus bud.
      cv.ellipse(x + 4, wallTop - 21, 4, 5, WHITE);
      cv.rect(x + 3, wallTop - 28, 2, 3, WHITE);
      cv.set(x + 2, wallTop - 21, WHITE_DARK); cv.set(x + 6, wallTop - 21, WHITE_DARK);
    }
  }
  // The gate: four pillars, the outer two passages narrow, the middle wide.
  const base = H - 2;
  for (const x of [cx - 64, cx - 34, cx + 28, cx + 58]) {
    cv.rect(x, 40, 6, base - 40, CORAL);
    cv.rect(x, 40, 2, base - 40, CORAL_LIGHT);
    cv.rect(x + 5, 40, 1, base - 40, CORAL_DARK);
    cv.rect(x + 1, base - 10, 4, 6, WHITE);
  }
  // Over the side passages, panels pierced with white squares.
  for (const [x0, x1] of [[cx - 58, cx - 34], [cx + 34, cx + 58]]) {
    cv.rect(x0, 40, x1 - x0, 20, CORAL);
    for (let x = x0 + 3; x < x1 - 5; x += 8) { cv.rect(x, 44, 5, 5, WHITE); cv.set(x + 2, 46, CORAL_DARK); }
  }
  // The lintel over the middle and its name board.
  cv.rect(cx - 34, 40, 68, 12, CORAL);
  cv.rect(cx - 22, 42, 44, 8, [176, 52, 40]);
  cv.rect(cx - 22, 42, 44, 1, GOLD); cv.rect(cx - 22, 49, 44, 1, GOLD);
  for (let x = cx - 18; x < cx + 18; x += 3) cv.rect(x, 45, 2, 2, GOLD);
  // Iron gate leaves folded back against the inner pillars.
  for (const x of [cx - 28, cx + 22]) for (let i = 0; i < 6; i += 2) cv.rect(x + i, 58, 1, base - 60, [70, 46, 40]);
  // The lower roof, the balustrade on it, the upper roof on two posts.
  tiledRoof(cv, cx - 82, 28, 164, 14, RED_TILE, 6);
  cv.rect(cx - 60, 18, 120, 10, CORAL);
  cv.rect(cx - 60, 18, 120, 2, WHITE);
  for (let x = cx - 56; x < cx + 54; x += 7) { cv.rect(x, 21, 4, 4, WHITE); cv.set(x + 1, 22, CORAL_DARK); }
  for (const x of [cx - 30, cx + 24]) { cv.rect(x, 8, 6, 12, CORAL); cv.rect(x, 8, 2, 12, CORAL_LIGHT); }
  tiledRoof(cv, cx - 46, 2, 92, 10, RED_TILE, 4);
  ridgeDecor(cv, cx - 40, cx + 40, 2, RED_TILE);
  for (const [x, y] of [[cx, -1], [cx - 84, 28], [cx + 82, 28]]) cv.ellipse(x, y + 1, 3, 3, WHITE_DARK);
  outline(cv);
  return cv;
}

/** Cung An Định: 8 × 6 tiles — Khải Định's palace as it stands: an ochre
 *  façade picked out in cream, two storeys of arched windows behind
 *  red-brown shutters, a balustraded parapet, a crowned tower at each end;
 *  and in front, on its curved terrace of rubble stone, the orange pavilion
 *  with its lattice frieze and dark, dragon-ridged roof. The map draws it at
 *  half size (places/southBank.mjs). */
export function anDinh() {
  const cv = new Canvas(8 * T2, 6 * T2);
  const W = cv.w, H = cv.h, cx = W / 2;
  const OCHRE = [232, 190, 70], OCHRE_DARK = [204, 158, 52], CREAM = [246, 236, 206], CREAM_DARK = [214, 200, 166];
  const SHUTTER = [138, 62, 44], SHUTTER_DARK = [104, 44, 32];
  const wall = (x, y, w, h) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let c = mix(OCHRE, OCHRE_DARK, hash(x + i, y + j) * 0.18 + (j / h) * 0.25);
      if (i < 2 || i >= w - 2) c = mix(c, [0, 0, 0], 0.1);
      cv.set(x + i, y + j, c);
    }
  };
  // An arched window: a cream surround, shutters of slats, a keystone.
  const win = (x, bottom, w = 12, h = 24) => {
    const r = w / 2, top = bottom - h;
    for (let y = top - 3; y < bottom + 2; y++) for (let i = -r - 3; i < r + 3; i++) {
      const dy = top + r - y;
      if (dy > 0 && i * i + dy * dy > (r + 3) ** 2) continue;
      cv.set(x + r + i, y, CREAM);
    }
    for (let y = top; y < bottom; y++) for (let i = -r; i < r; i++) {
      const dy = top + r - y;
      if (dy > 0 && (i + 0.5) ** 2 + dy * dy > r * r) continue;
      cv.set(x + r + i, y, Math.abs(i + 0.5) < 1 ? SHUTTER_DARK : y % 3 === 0 ? SHUTTER_DARK : SHUTTER);
    }
    cv.rect(x + r - 2, top - 4, 4, 3, CREAM_DARK);
    cv.rect(x - 3, bottom + 1, w + 6, 2, CREAM_DARK);
  };
  const balustrade = (x, y, w) => {
    cv.rect(x, y, w, 2, CREAM);
    for (let i = x + 1; i < x + w - 1; i += 3) cv.rect(i, y + 2, 2, 5, CREAM_DARK);
    cv.rect(x, y + 7, w, 2, CREAM);
  };

  // The main block: two storeys under a parapet, cream bands between them.
  const top = 62, mid = 118, foot = H - 8;
  cv.rect(10, top - 8, W - 20, 6, [92, 90, 96]);                        // the low roof behind the parapet
  wall(12, top, W - 24, foot - top);
  balustrade(10, top - 3, W - 20);
  cv.rect(10, top + 6, W - 20, 3, CREAM);
  cv.rect(10, mid, W - 20, 5, CREAM);
  cv.rect(10, mid + 5, W - 20, 1, CREAM_DARK);
  for (let x = 80; x < W - 80; x += 20) {
    win(x, mid - 6);
    win(x, foot - 6, 12, 30);
    cv.rect(x - 6, top + 9, 2, foot - top - 9, CREAM_DARK);              // pilasters
  }
  cv.rect(W - 86, top + 9, 2, foot - top - 9, CREAM_DARK);
  // The end towers: a storey higher, quoined in cream, crowned.
  for (const tx of [16, W - 70]) {
    wall(tx, 34, 54, foot - 34);
    for (let y = 34; y < foot; y += 8) { cv.rect(tx, y, 5, 5, CREAM); cv.rect(tx + 49, y, 5, 5, CREAM); }
    cv.rect(tx - 2, 32, 58, 4, CREAM);
    cv.rect(tx - 2, top + 6, 58, 3, CREAM);
    cv.rect(tx - 2, mid, 58, 5, CREAM);
    balustrade(tx + 6, 25, 42);
    for (const b of [mid - 6, foot - 6]) { win(tx + 12, b); win(tx + 30, b); }
    win(tx + 21, top - 2, 12, 20);
    // The crown: stepped cream tiers to a finial.
    const c0 = tx + 27;
    cv.rect(c0 - 14, 18, 28, 7, CREAM);
    cv.rect(c0 - 14, 23, 28, 2, CREAM_DARK);
    cv.rect(c0 - 9, 11, 18, 7, OCHRE);
    cv.rect(c0 - 10, 10, 20, 2, CREAM);
    cv.rect(c0 - 5, 5, 10, 5, CREAM);
    cv.rect(c0 - 1, 0, 2, 5, [120, 104, 80]);
    for (const dx of [-12, 10]) cv.rect(c0 + dx, 14, 2, 4, CREAM);
  }
  cv.rect(0, foot, W, H - foot, [178, 170, 156]);
  cv.rect(0, foot, W, 1, [206, 200, 188]);

  // The pavilion in front, on its terrace.
  const tl = cx - 62, tw = 124, ty = H - 34;
  rubble(cv, tl, ty, tw, H - ty);
  balustrade(tl - 2, ty - 9, tw + 4);
  const px = cx - 34, pw = 68, pb = ty - 9;
  cv.rect(px, pb - 2, pw, 2, [196, 120, 52]);
  for (let x = px + 2; x < px + pw; x += 15) column(cv, x, pb - 42, 40, [222, 130, 52]);
  // The balcony rail round the upper floor, and the lattice frieze.
  cv.rect(px, pb - 22, pw, 2, CREAM);
  for (let x = px + 1; x < px + pw - 1; x += 3) cv.rect(x, pb - 20, 2, 5, CREAM_DARK);
  cv.rect(px, pb - 15, pw, 2, CREAM);
  for (let y = pb - 52; y < pb - 42; y++) for (let x = px; x < px + pw; x++) {
    cv.set(x, y, (x + y) % 4 === 0 || (x - y) % 4 === 0 ? [140, 64, 32] : [226, 136, 56]);
  }
  cv.rect(px, pb - 42, pw, 2, [176, 92, 40]);
  // Its roof: dark tile, curving up at the corners, the ridge crested.
  const DARK_ROOF = { base: [86, 84, 84], line: [70, 68, 70], light: [118, 116, 114], eave: [50, 48, 50], ridge: [70, 66, 62] };
  tiledRoof(cv, px - 12, pb - 74, pw + 24, 22, DARK_ROOF, 10);
  ridgeDecor(cv, px - 2, px + pw + 2, pb - 78, DARK_ROOF);
  for (let i = -3; i <= 3; i++) cv.rect(cx + i * 3, pb - 84 + Math.abs(i), 2, 6 - Math.abs(i), [150, 140, 120]);
  outline(cv);
  return cv;
}

/** Halve a detail canvas back to the map's own size: a pixel takes the mean
 *  of the opaque detail pixels under it, if at least half of them are. */
export function halve(art) {
  const cv = new Canvas(art.w / 2, art.h / 2);
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    const s = [0, 0, 0];
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const i = ((y * 2 + (k >> 1)) * art.w + x * 2 + (k & 1)) * 4;
      if (!art.d[i + 3]) continue;
      for (let c = 0; c < 3; c++) s[c] += art.d[i + c];
      n++;
    }
    if (n >= 2) cv.set(x, y, s.map((v) => v / n));
  }
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

/** The food market's dishes, west to east along each row: what each stall
 *  sells (its story is `places.dish…`, e.g. dishBunBo), and the colour of
 *  its awning. Five to a row (places/southBank.mjs STALLS). */
export const DISHES = [
  { dish: 'bunBo', awning: [196, 58, 46] }, { dish: 'comHen', awning: [62, 128, 112] },
  { dish: 'banhBeo', awning: [222, 150, 52] }, { dish: 'banhLoc', awning: [84, 140, 70] },
  { dish: 'nemLui', awning: [168, 70, 50] },
  { dish: 'banhKhoai', awning: [214, 176, 60] }, { dish: 'che', awning: [150, 96, 168] },
  { dish: 'meXung', awning: [186, 52, 70] }, { dish: 'pho', awning: [52, 104, 150] },
  { dish: 'xoi', awning: [120, 160, 60] },
  { dish: 'banhCanh', awning: [208, 112, 60] }, { dish: 'bunHen', awning: [70, 120, 140] },
  { dish: 'banhUot', awning: [196, 90, 110] }, { dish: 'banhMi', awning: [160, 110, 60] },
  { dish: 'caPheMuoi', awning: [92, 70, 56] },
];

/** A stall in the food market, 2 × 2 tiles: a striped awning on two posts,
 *  paper lanterns along its edge, and on the counter the one dish it's
 *  known for, drawn so you can tell which. */
export function foodStall(dish) {
  const cv = new Canvas(2 * T2, 2 * T2);
  const W = cv.w, H = cv.h;
  const { awning } = DISHES.find((d) => d.dish === dish);
  const WOOD = [150, 104, 66], WOOD_D = [112, 76, 48];
  // Back wall and the counter.
  cv.rect(6, 22, W - 12, 22, [214, 196, 160]);
  for (let x = 6; x < W - 6; x += 5) cv.rect(x, 22, 1, 22, [196, 176, 138]);
  cv.rect(4, 42, W - 8, 6, WOOD);
  cv.rect(4, 42, W - 8, 1, [184, 136, 92]);
  cv.rect(6, 48, W - 12, H - 52, WOOD_D);
  for (let x = 8; x < W - 8; x += 6) cv.rect(x, 50, 3, H - 56, [128, 88, 56]);
  for (const x of [4, W - 7]) cv.rect(x, 12, 3, H - 14, WOOD_D);
  // The awning, striped, its scalloped edge, and lanterns along it.
  for (let y = 6; y < 16; y++) for (let x = 1; x < W - 1; x++) cv.set(x, y, Math.floor(x / 6) % 2 ? awning : [244, 238, 226]);
  for (let x = 1; x < W - 1; x += 6) cv.rect(x, 16, 4, 2, awning);
  cv.rect(1, 5, W - 2, 1, mix(awning, [0, 0, 0], 0.3));
  for (const x of [10, 32, 54]) { cv.rect(x, 18, 1, 2, [60, 50, 40]); cv.ellipse(x + 0.5, 23, 3, 3.5, [232, 64, 48]); cv.rect(x - 1, 20, 3, 1, [250, 210, 90]); }
  const bowl = (x, y, inside, w = 8) => {
    cv.ellipse(x, y, w / 2, 2, [246, 244, 236]);
    cv.ellipse(x, y - 0.5, w / 2 - 1, 1.2, inside);
    cv.rect(x - w / 2 + 1, y + 1, w - 2, 2, [230, 228, 220]);
  };
  const cy = 40;
  if (dish === 'bunBo') {
    // A great pot of red broth steaming, bowls ready beside it.
    cv.rect(10, cy - 12, 20, 12, [150, 150, 156]); cv.rect(10, cy - 12, 20, 2, [196, 196, 202]);
    cv.ellipse(20, cy - 12, 9, 2, [200, 64, 36]);
    for (const [x, y] of [[16, cy - 18], [22, cy - 20], [19, cy - 24]]) cv.set(x, y, [240, 240, 240]);
    bowl(38, cy - 1, [204, 74, 40]); bowl(50, cy - 1, [204, 74, 40]); cv.rect(46, cy - 3, 6, 1, [120, 180, 80]);
  } else if (dish === 'comHen') {
    // Rice in a basket, a heap of tiny dark mussels, little bowls of it.
    cv.ellipse(14, cy - 4, 8, 4, [176, 132, 76]); cv.ellipse(14, cy - 6, 6, 2.5, [246, 244, 236]);
    cv.ellipse(31, cy - 4, 7, 3.5, [70, 64, 52]);
    for (let i = 0; i < 10; i++) cv.set(26 + hash(i, 3) * 10, cy - 6 + hash(3, i) * 4, [120, 110, 88]);
    bowl(45, cy - 1, [230, 220, 190]); bowl(54, cy - 1, [230, 220, 190]); cv.set(45, cy - 2, [80, 70, 56]); cv.set(54, cy - 2, [200, 80, 50]);
  } else if (dish === 'banhBeo') {
    // Trays of little saucers, each a white cake with orange shrimp on top.
    cv.rect(8, cy - 6, 48, 6, [176, 132, 76]);
    for (let r = 0; r < 2; r++) for (let x = 11 + r * 2; x < 54; x += 5) {
      cv.ellipse(x, cy - 5 + r * 3, 2, 1.2, [246, 244, 236]); cv.set(x, cy - 5 + r * 3, [232, 120, 60]);
    }
  } else if (dish === 'banhLoc') {
    // Banana-leaf parcels of bánh nậm, and clear tapioca dumplings, shrimp inside.
    for (let i = 0; i < 4; i++) { cv.rect(9 + i * 7, cy - 5 - (i % 2) * 2, 6, 4, [92, 150, 70]); cv.rect(9 + i * 7, cy - 5 - (i % 2) * 2, 6, 1, [130, 186, 96]); }
    cv.ellipse(46, cy - 3, 10, 3, [246, 244, 236]);
    for (const x of [40, 44, 48, 52]) { cv.ellipse(x, cy - 4, 1.8, 1.5, [226, 222, 206]); cv.set(x, cy - 4, [230, 120, 70]); }
  } else if (dish === 'nemLui') {
    // A charcoal grill, skewers of pork on lemongrass sizzling over it.
    cv.rect(8, cy - 6, 30, 6, [60, 56, 58]);
    for (let x = 9; x < 37; x++) if (hash(x, 9) < 0.5) cv.set(x, cy - 6, [250, 140, 50]);
    for (let i = 0; i < 6; i++) { cv.rect(10 + i * 4, cy - 9, 1, 6, [180, 200, 110]); cv.rect(10 + i * 4, cy - 9, 2, 3, [170, 96, 60]); }
    cv.ellipse(48, cy - 2, 8, 2.5, [246, 244, 236]);
    for (const x of [44, 48, 52]) cv.rect(x - 1, cy - 3, 3, 1, [170, 96, 60]);
  } else if (dish === 'banhKhoai') {
    // Small iron pans, the yellow pancakes folded in them.
    for (const x of [14, 28]) { cv.ellipse(x, cy - 3, 6, 2.5, [50, 48, 50]); cv.ellipse(x, cy - 3.5, 4, 1.5, [236, 188, 70]); cv.rect(x + 5, cy - 4, 5, 1, [50, 48, 50]); }
    bowl(46, cy - 1, [236, 188, 70], 10); cv.rect(42, cy - 3, 4, 1, [110, 170, 80]);
  } else if (dish === 'che') {
    // Glasses of chè in their colours, jars of the toppings behind.
    for (let i = 0; i < 4; i++) cv.rect(9 + i * 7, cy - 10, 5, 8, [[236, 210, 160], [176, 120, 200], [120, 180, 90], [200, 120, 80]][i]);
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 6, c = [[236, 210, 160], [176, 120, 200], [120, 180, 90], [240, 200, 120]][i % 4];
      cv.rect(x, cy - 4, 4, 5, c); cv.rect(x, cy - 4, 4, 1, [250, 250, 250]); cv.rect(x + 1, cy - 2, 2, 1, [90, 60, 50]);
    }
  } else if (dish === 'meXung') {
    // Boxes of sesame brittle stacked in red and gold, slabs on a plate.
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
      const x = 9 + i * 8 + r * 4, y = cy - 4 - r * 4;
      cv.rect(x, y, 7, 4, r % 2 ? [226, 180, 60] : [190, 44, 40]); cv.rect(x + 2, y + 1, 3, 2, r % 2 ? [190, 44, 40] : [226, 180, 60]);
    }
    cv.ellipse(48, cy - 2, 8, 2.5, [246, 244, 236]);
    for (const x of [44, 48, 52]) cv.rect(x - 1, cy - 4, 3, 2, [210, 160, 90]);
  } else if (dish === 'pho') {
    // The stockpot of clear beef broth, a bowl of flat noodles, herbs and lime.
    cv.rect(10, cy - 12, 20, 12, [150, 150, 156]); cv.rect(10, cy - 12, 20, 2, [196, 196, 202]);
    cv.ellipse(20, cy - 12, 9, 2, [214, 170, 96]);
    for (const [x, y] of [[15, cy - 18], [21, cy - 21], [25, cy - 17]]) cv.set(x, y, [240, 240, 240]);
    bowl(40, cy - 1, [222, 190, 130], 10);
    for (const x of [37, 40, 43]) cv.rect(x, cy - 2, 2, 1, [246, 240, 226]);
    cv.rect(38, cy - 3, 3, 1, [150, 84, 70]);
    cv.ellipse(52, cy - 2, 4, 2, [96, 160, 72]); cv.set(55, cy - 3, [190, 220, 90]);
  } else if (dish === 'banhCanh') {
    // A pot of thick orange crab broth, a bowl of fat tapioca noodles.
    cv.rect(10, cy - 12, 20, 12, [150, 150, 156]); cv.rect(10, cy - 12, 20, 2, [196, 196, 202]);
    cv.ellipse(20, cy - 12, 9, 2, [226, 120, 60]);
    for (const [x, y] of [[16, cy - 18], [23, cy - 20]]) cv.set(x, y, [240, 240, 240]);
    bowl(42, cy - 1, [226, 130, 70], 10);
    for (const x of [38, 41, 44]) cv.rect(x, cy - 2, 2, 1, [246, 236, 210]);
    cv.ellipse(53, cy - 2, 3, 1.5, [210, 80, 50]);
  } else if (dish === 'bunHen') {
    // A basin of tiny clams, a heap of rice noodles, bowls of bún hến.
    cv.ellipse(15, cy - 4, 8, 3.5, [70, 64, 52]);
    for (let i = 0; i < 10; i++) cv.set(9 + hash(i, 5) * 12, cy - 6 + hash(5, i) * 4, [120, 110, 88]);
    cv.ellipse(31, cy - 4, 6, 3, [246, 242, 230]);
    for (let i = 0; i < 5; i++) cv.rect(27 + i * 2, cy - 6 + (i % 2), 1, 3, [226, 222, 206]);
    bowl(45, cy - 1, [236, 226, 196]); bowl(54, cy - 1, [236, 226, 196]);
    cv.set(44, cy - 2, [80, 70, 56]); cv.set(53, cy - 2, [110, 170, 80]);
  } else if (dish === 'banhUot') {
    // Rolls of soft rice sheet on a plate, pork grilling beside them.
    cv.ellipse(18, cy - 3, 11, 3.5, [246, 244, 236]);
    for (const x of [11, 16, 21, 26]) { cv.rect(x - 2, cy - 6, 4, 4, [244, 240, 228]); cv.rect(x - 2, cy - 6, 4, 1, [228, 222, 206]); }
    cv.rect(34, cy - 6, 22, 5, [60, 56, 58]);
    for (let x = 35; x < 55; x++) if (hash(x, 7) < 0.5) cv.set(x, cy - 6, [250, 140, 50]);
    for (const x of [37, 43, 49]) cv.rect(x, cy - 9, 5, 3, [176, 100, 60]);
  } else if (dish === 'banhMi') {
    // Golden baguettes stacked in a glass case, one split and filled.
    cv.rect(8, cy - 14, 30, 13, [206, 226, 230]);
    cv.rect(8, cy - 14, 30, 1, [240, 248, 250]);
    for (const [x, y] of [[11, cy - 11], [20, cy - 11], [15, cy - 7], [24, cy - 7]]) { cv.ellipse(x + 4, y, 5, 2, [214, 150, 70]); cv.rect(x + 1, y - 1, 6, 1, [236, 188, 110]); }
    cv.ellipse(48, cy - 3, 8, 2.5, [214, 150, 70]);
    cv.rect(41, cy - 4, 14, 1, [120, 180, 80]); cv.rect(42, cy - 3, 12, 1, [196, 90, 70]);
  } else if (dish === 'caPheMuoi') {
    // Phin filters dripping into glasses, and the salted cream on top.
    for (const x of [12, 24]) {
      cv.rect(x - 3, cy - 9, 7, 8, [120, 76, 50]); cv.rect(x - 3, cy - 9, 7, 2, [236, 222, 196]);
      cv.rect(x - 4, cy - 13, 9, 3, [176, 176, 182]); cv.rect(x - 2, cy - 15, 5, 2, [150, 150, 156]);
    }
    for (const x of [38, 46, 54]) { cv.rect(x - 3, cy - 8, 6, 7, [104, 66, 44]); cv.rect(x - 3, cy - 8, 6, 3, [240, 226, 196]); cv.rect(x - 3, cy - 8, 1, 7, [250, 250, 250]); }
  } else if (dish === 'xoi') {
    // A bamboo steamer of sticky rice, and portions on leaves in their
    // colours: gấc red, pandan green, mung-bean yellow.
    cv.ellipse(16, cy - 5, 8, 5, [176, 132, 76]); cv.ellipse(16, cy - 8, 7, 2.5, [246, 242, 228]);
    for (let y = cy - 4; y < cy; y += 2) cv.rect(9, y, 14, 1, [150, 108, 60]);
    for (const [x, c] of [[32, [210, 70, 56]], [42, [110, 170, 90]], [52, [236, 196, 80]]]) {
      cv.ellipse(x, cy - 2, 5, 2, [80, 140, 64]);
      cv.ellipse(x, cy - 3.5, 3.5, 2, c);
      cv.set(x - 1, cy - 4, mix(c, [255, 255, 255], 0.4));
    }
  }
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

