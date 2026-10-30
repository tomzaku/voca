// Huế's trees, one function per kind, and the rules for where one may stand.

import { Canvas, rand } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { ground, mark, over, solid, used } from '../core/world.mjs';
import { H, RIVER_BRIDGES, T, W, isWater, nearSlot } from '../layout.mjs';
import { nearRoad, onAnyRoad, onRoad } from '../roads.mjs';

export const treeKinds = {
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
export function stand(cv, tx, ty, overRows, shadowRx, solidTiles = [[tx, ty]]) {
  ground.ellipse(tx * T + 9, ty * T + 15, shadowRx, Math.max(2, shadowRx / 3), P.shadow, 0.22);
  const ox = (tx + 0.5) * T - cv.w / 2, oy = (ty + 1) * T - cv.h;
  ground.blit(cv, ox, oy);
  over.blit(cv, ox, oy, [0, overRows]);
  for (const [x, y] of solidTiles) if (solid[y]?.[x] === false) solid[y][x] = true;
}

/** Cây đa — a banyan: an old, wide canopy on a thick trunk, aerial roots
 *  hanging. Three tiles across; the big tree of pagodas and village greens. */
export function banyan(tx, ty) {
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
export function willow(tx, ty) {
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
export function bang(tx, ty, red = false) {
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
export function bamboo(tx, ty) {
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
export function frangipani(tx, ty) {
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
export function canPlantWide(tx, ty) {
  return canPlant(tx - 1, ty) && canPlant(tx + 1, ty) && canPlant(tx, ty - 1);
}

/** Plant any kind of tree by name. */
export function plant(kind, tx, ty) {
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
export function plantAround(kind, cx, cy, r, n) {
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
export function palm(tx, ty) {
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
export function tree(tx, ty, kind = 'leaf') {
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
export function pine(tx, ty) {
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


/** Room for a roadside tree: its trunk off the road and clear of the next
 *  tree along. */
export function canPlantLoose(tx, ty) {
  for (const [i, j] of [[tx, ty], [tx, ty - 1], [tx - 1, ty], [tx + 1, ty]]) if (solid[j]?.[i] !== false) return false;
  return !isWater(tx * T + 8, ty * T + 8);
}

/** Room for a tree with its trunk at (tx, ty): nothing built, paved or wet
 *  around it. */
export function canPlant(tx, ty) {
  for (let j = ty - 2; j <= ty + 1; j++) {
    for (let k = tx - 1; k <= tx + 1; k++) {
      if (used[j]?.[k] !== false || solid[j]?.[k]) return false;
      if (isWater(k * T + 8, j * T + 8) || isWater(k * T, j * T) || isWater(k * T + 15, j * T + 15)) return false;
    }
  }
  return true;
}

// The riverbanks' rule: dry grass, not a road, a bridge, the wharf or a
// building — where canPlant's margins would never let a tree go.
export const BANK_KEEP_CLEAR = [
  ...RIVER_BRIDGES.map(([a, b]) => [a - 1, 46, b - a + 3, 15]),
  [41, 48, 19, 12],        // the dragon-boat wharf, its boat, Phu Văn Lâu's landing
  [99, 37, 11, 8],         // the Cồn Hến footbridge
];
export function bankOk(tx, ty) {
  if (solid[ty]?.[tx] !== false || onRoad(tx, ty)) return false;   // the trunk stands off the road
  for (const y of [ty, ty - 1]) {                                     // trunk and crown clear of buildings;
    if (solid[y]?.[tx] !== false) return false;                       // the crown may overhang a road
    if (used[y][tx] && !nearRoad(tx, y)) return false;
  }
  if (isWater(tx * T + 8, ty * T + 8)) return false;
  return !BANK_KEEP_CLEAR.some(([x, y, w, h]) => tx >= x && tx < x + w && ty >= y && ty < y + h);
}

// Every tree keeps a clear tile all round it, so however thick they grow
// there's a way between them; and stays off the lanes and doorsteps.
export function canPlantDense(tx, ty) {
  if (used[ty]?.[tx] !== false || used[ty - 1]?.[tx] !== false || onAnyRoad(tx, ty)) return false;
  for (let j = ty - 1; j <= ty + 1; j++) for (let i = tx - 1; i <= tx + 1; i++) if (solid[j]?.[i] !== false) return false;
  return !isWater(tx * T + 8, ty * T + 8) && !isWater(tx * T + 8, ty * T - 8) && !nearSlot(tx - 1, ty - 1);
}
