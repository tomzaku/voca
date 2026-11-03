// Planting the city: trees along the banks and lanes, the trees that belong
// to a place, the forest round the edge and in the hills, then groves and
// single trees over whatever's left.

import { hash, mix, noise, rand } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { deck, drawn, ground, mark, solid, used } from '../core/world.mjs';
import { bankOk, bush, canPlant, canPlantDense, canPlantLoose, grandTree, palm, pine, plant, plantAround, tree } from '../draw/trees.mjs';
import { NGU_BINH, cliff, drawLadder, height, light, markCliffs } from '../hills.mjs';
import { H, HILLS_Y, RIVER, T, W, isWater, nearSlot, onIslet, riverHalfWidth } from '../layout.mjs';
import { ROADS, onAnyRoad, roadGap } from '../roads.mjs';
import { SCHOOL_GROUNDS } from '../places/southBank.mjs';

/** Past the tombs' road the mountains rise: closed forest from this row. */
const MOUNTAIN_Y = 118;

/** A hillside tile's ground: tufts of darker grass, wild flowers, stones,
 *  the odd patch of bare earth — painted under whatever grows there. */
function groundDetail(tx, ty) {
  if (used[ty][tx]) return;
  const x0 = tx * T, y0 = ty * T;
  const plain = (x, y) => !cliff(x, y) && !used[Math.floor(y / T)]?.[Math.floor(x / T)];
  const r = hash(tx * 29 + 5, ty * 31 + 7);
  if (r < 0.06) {
    // Bare earth, worn round, darker at its rim.
    const cx = x0 + 8, cy = y0 + 9, rx = 5 + hash(tx, ty * 3) * 4, ry = 3 + hash(tx * 3, ty) * 2;
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (noise(x, y, 3) - 0.5) * 0.5;
      if (e > 1.15 || !plain(x, y)) continue;
      ground.set(x, y, e > 0.8 ? [92, 112, 52] : hash(x, y) < 0.15 ? [150, 110, 72] : [128, 92, 60]);
    }
  }
  for (let i = 0; i < 3; i++) {
    const h = hash(tx * 7 + i, ty * 11 + i), x = x0 + 2 + Math.floor(hash(tx + i, ty * 5) * 12), y = y0 + 3 + Math.floor(hash(tx * 5, ty + i) * 11);
    if (!plain(x, y) || !plain(x + 2, y + 2)) continue;
    if (h < 0.18) {
      // A tuft: blades in a darker green, a lit tip.
      for (const [dx, dy] of [[0, 0], [1, -1], [2, 0], [-1, -1], [1, 1], [0, 1], [2, 1]]) ground.set(x + dx, y + dy, [52, 112, 50]);
      ground.set(x + 1, y - 2, [124, 186, 88]);
    } else if (h < 0.3) {
      // Wild flowers.
      const c = [[248, 248, 236], [250, 214, 96], [236, 140, 180], [140, 170, 240]][Math.floor(hash(x, y) * 4)];
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) ground.set(x + dx, y + dy, c);
      ground.set(x, y, [250, 220, 90]);
      ground.set(x + 1, y + 2, [52, 112, 50]);
    } else if (h < 0.36) {
      // A stone half sunk in the grass.
      ground.rect(x - 1, y + 2, 5, 1, [34, 60, 40]);
      ground.rect(x - 1, y, 5, 2, [126, 128, 120]);
      ground.rect(x, y - 1, 3, 1, [166, 168, 158]);
      ground.set(x, y, [196, 198, 188]);
    }
  }
}

/** On a school's walls, or the pavement before its gate: no tree, or it hides them. */
const bySchoolGate = (tx, ty) => Object.values(SCHOOL_GROUNDS).some((g) => tx >= g.x0 - 1 && tx <= g.x1 + 1 && ty >= g.front - 2 && ty <= g.back + 1);

export function plantGreenery() {
  // Purple bằng lăng along both banks — the city's colour.
  for (let x = 2; x < 96; x += 4) {
    if (!bySchoolGate(x, 68) && canPlant(x, 68)) tree(x, 68, x % 3 ? 'lilac' : 'leaf');
    if (x < 28 && canPlant(x, 45)) tree(x, 45, 'lilac');
  }
  // The Perfume River's banks, lined with trees the way Huế's are. The
  // riverside roads run close to the water, so these stand on the grass strip
  // between — where canPlant's margins would never let a tree go. bankOk is
  // their own rule: dry grass, not a road, a bridge, the wharf or a building.
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
  for (const [x, y] of [[30, 59], [37, 59], [105, 45], [108, 47], [114, 39], [116, 36], [112, 45], [104, 43]]) {
    if (bankOk(x, y) && onIslet(x * T + 8, y * T + 8)) tree(x, y, 'deep');
  }
  // Areca palms in the garden villages — Vỹ Dạ across the river, Kim Long upriver.
  for (const [x, y] of [[104, 65], [107, 70], [111, 68], [116, 71], [102, 74], [118, 64], [3, 10], [7, 16], [17, 17], [23, 26], [5, 28]]) {
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
  for (const [cx, cy] of [[106, 75], [114, 81]]) plantAround('bamboo', cx, cy, 5, 2);          // Vỹ Dạ
  plantAround('frangipani', 64, 33, 2, 2);      // the royal garden in the Imperial City
  plantAround('bang', 65, 37, 2, 1);
  plantAround('bang', 40, 71, 6, 2);
  plantAround('bangRed', 88, 81, 6, 2);
  plantAround('banyan', 70, 83, 6, 1);
  // Pines around Thiên Mụ (Ngự Bình's grow on its terraces, below).
  for (const [x, y] of [[1, 36], [1, 41], [8, 36]]) pine(x, y);
  // A few flame trees for a warm accent.
  for (const [x, y] of [[24, 9], [100, 26], [44, 71], [109, 77]]) if (canPlant(x, y)) tree(x, y, 'flame');
  // Trees along the lanes, every few steps on both sides.
  for (const r of ROADS) {
    if (r.kind === 'stone' || r.kind === 'path') continue;
    const kinds = ['leaf', 'deep', 'leaf', 'flame', 'leaf', 'lilac'];
    for (let s = T; s < r.line.length - T; s += 3 * T) {
      const g = r.line.segs.find((seg) => s >= seg.s0 && s < seg.s0 + seg.len);
      const t = (s - g.s0) / g.len;
      const cx = g.ax + (g.bx - g.ax) * t, cy = g.ay + (g.by - g.ay) * t;
      const nx = -(g.by - g.ay) / g.len, ny = (g.bx - g.ax) / g.len;
      const reach = (r.width / 2 + 0.5) * T;
      for (const side of [-1, 1]) {
        const tx = Math.floor((cx + nx * reach * side) / T), ty = Math.floor((cy + ny * reach * side) / T);
        // On a switchback the spot beside one bend can be on the next.
        if (roadGap(tx, ty) < 0.5) continue;
        if (!bySchoolGate(tx, ty) && bankOk(tx, ty) && canPlantLoose(tx, ty)) plant(kinds[(tx + ty) % kinds.length], tx, ty);
      }
    }
  }
  // Forest round the edge of the map — the green hills Huế sits in, thickest
  // to the south where the land rises towards the tombs. A canopy of crowns
  // packed edge to edge; the buddy stays out of it.
  // The hills' cliffs block the way — but not on a road or in a tomb's grounds.
  // Ladders climb them here and there; no tree grows on one.
  for (const [tx, ty] of markCliffs(solid, (tx, ty) => used[ty][tx] || roadGap(tx, ty) < 1)) {
    drawLadder(ground, tx, ty, drawn);
    mark(deck, tx, ty - 1, 1, 3);
  }
  // Ngự Bình's pines: thick on its slopes, the summit left open round the
  // pavilion — a hill you can see is a hill from the river.
  {
    const { x0, y0, x1, y1, fall } = NGU_BINH;
    for (let ty = Math.floor(y0 - fall); ty < HILLS_Y - 2; ty++) {
      for (let tx = Math.floor(x0 - fall); tx <= Math.ceil(x1 + fall); tx++) {
        const h = height(tx * T + 8, ty * T + 8);
        const summit = tx >= x0 && tx < x1 && ty >= y0 && ty < y1;
        if (h < 0.1 || hash(tx * 17, ty * 5) > (summit ? 0.12 : 0.55)) continue;
        if (solid[ty][tx] || solid[ty - 1]?.[tx] || used[ty][tx] || roadGap(tx, ty) < 1.5) continue;
        pine(tx, ty);
      }
    }
  }
  {
    const forest = [];
    const hillside = [];
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const edge = Math.min(tx, W - 1 - tx, ty, H - 1 - ty);
        const n = noise(tx * T, ty * T, 70);
        const depth = (ty > H / 2 ? 2.8 + Math.max(0, ty - (H - 9)) * 0.6 : 2.2) + n * 3.6;
        // ...and woods in the open land, away from the lanes.
        const wood = noise(tx * T + 900, ty * T + 300, 110) > 0.7 && roadGap(tx, ty) >= 2;
        const hills = ty >= HILLS_Y && roadGap(tx, ty) >= 1;
        if (edge >= depth && !wood && !hills) continue;
        if (used[ty][tx] || solid[ty][tx] || onAnyRoad(tx, ty) || isWater(tx * T + 8, ty * T + 8)) continue;
        if (nearSlot(tx - 1, ty - 1) || (used[ty + 1]?.[tx] && !wood && !hills)) continue;
        // In the hills, open woodland so the land's levels and cliffs show;
        // past the tombs' road, where the mountains rise, closed forest.
        if (ty >= MOUNTAIN_Y || ty < HILLS_Y - 2) forest.push([tx, ty]);
        else hillside.push([tx, ty]);
      }
    }
    const shades = [[34, 94, 50], [48, 116, 56], [66, 140, 64], [96, 168, 78]];
    for (const pass of [0, 1, 2, 3]) {
      for (const [tx, ty] of forest) {
        for (let k = 0; k < 2; k++) {
          const h = hash(tx * 7 + k, ty * 13 + k);
          const cx = tx * T + 4 + h * 8, cy = ty * T + 4 + hash(ty * 5 + k, tx * 3) * 8;
          const r = 9 + h * 4;
          // On the hills, lit or shaded with the slope the tree stands on.
          const l = light(cx, cy);
          const lit = (c) => (l > 0 ? mix(c, [196, 232, 146], l * 0.5) : mix(c, [10, 34, 28], -l * 0.6));
          if (pass === 0) ground.ellipse(cx + 2, cy + 4, r, r * 0.8, P.shadow, 0.35);
          else if (pass === 1) ground.ellipse(cx, cy, r, r * 0.85, lit(shades[0]));
          else if (pass === 2) ground.ellipse(cx - 1, cy - 1, r - 2, r * 0.7, lit(shades[1 + (h > 0.6 ? 1 : 0)]));
          else ground.ellipse(cx - 3, cy - 4, r * 0.4, r * 0.3, lit(shades[3]), 0.8);
        }
      }
    }
    for (const [tx, ty] of forest) { solid[ty][tx] = true; used[ty][tx] = true; drawn.push({ type: 'forest', tx, ty, x: tx * T, y: ty * T }); }
    // The hillsides: the ground's own detail first, then big old trees
    // with room between them, bushes, the odd pine and flowering tree.
    for (const [tx, ty] of hillside) groundDetail(tx, ty);
    for (const [tx, ty] of hillside) {
      const r = hash(tx * 13, ty * 7);
      if (solid[ty][tx] || solid[ty - 1]?.[tx] || cliff(tx * T + 8, ty * T + 12)?.face !== undefined) continue;
      if (r < 0.085) { if (![[-2, 0], [2, 0], [0, -2], [-1, -1], [1, -1], [-2, -1], [2, -1]].some(([dx, dy]) => solid[ty + dy]?.[tx + dx])) grandTree(tx, ty); }
      else if (r < 0.13) bush(tx, ty);
      else if (r < 0.15) pine(tx, ty);
      else if (r < 0.16) tree(tx, ty, hash(tx, ty) < 0.5 ? 'lilac' : 'flame');
    }
  }

  // Groves in the open, then single trees scattered over what's left.
  for (let g = 0; g < 40; g++) {
    const cx = 2 + rand() * (W - 4), cy = 3 + rand() * (H - 6);
    plantAround(rand() < 0.6 ? 'leaf' : 'deep', cx, cy, 3, 4);
  }
  {
    let placed = 0;
    for (let i = 0; i < 40000 && placed < 700; i++) {
      const tx = 1 + Math.floor(rand() * (W - 2)), ty = 2 + Math.floor(rand() * (H - 3));
      if (!canPlantDense(tx, ty)) continue;
      const r = rand();
      plant(r < 0.4 ? 'leaf' : r < 0.55 ? 'deep' : r < 0.67 ? 'lilac' : r < 0.79 ? 'bang' : r < 0.86 ? 'bangRed' : r < 0.94 ? 'bamboo' : 'frangipani', tx, ty);
      placed++;
    }
  }
}
