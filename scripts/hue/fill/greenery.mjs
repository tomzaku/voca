// Planting the city: trees along the banks and lanes, the trees that belong
// to a place, the forest round the edge and in the hills, then groves and
// single trees over whatever's left.

import { hash, noise, rand } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { ground, solid, used } from '../core/world.mjs';
import { bankOk, canPlant, canPlantDense, canPlantLoose, palm, pine, plant, plantAround, tree } from '../draw/trees.mjs';
import { H, HILLS_Y, RIVER, T, W, isWater, nearSlot, onIslet, riverHalfWidth } from '../layout.mjs';
import { ROADS, onAnyRoad, roadGap } from '../roads.mjs';

export function plantGreenery() {
  // Purple bằng lăng along both banks — the city's colour.
  for (let x = 2; x < 96; x += 4) {
    if (canPlant(x, 65)) tree(x, 65, x % 3 ? 'lilac' : 'leaf');
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
  for (const [x, y] of [[30, 56], [37, 56], [105, 45], [108, 47], [114, 39], [116, 36], [112, 45], [104, 43]]) {
    if (bankOk(x, y) && onIslet(x * T + 8, y * T + 8)) tree(x, y, 'deep');
  }
  // Areca palms in the garden villages — Vỹ Dạ across the river, Kim Long upriver.
  for (const [x, y] of [[104, 62], [107, 67], [111, 65], [116, 68], [102, 71], [118, 61], [3, 10], [7, 16], [17, 17], [23, 26], [5, 28]]) {
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
  for (const [cx, cy] of [[106, 72], [114, 78]]) plantAround('bamboo', cx, cy, 5, 2);          // Vỹ Dạ
  plantAround('frangipani', 64, 33, 2, 2);      // the royal garden in the Imperial City
  plantAround('bang', 65, 37, 2, 1);
  plantAround('bang', 40, 68, 6, 2);
  plantAround('bangRed', 88, 78, 6, 2);
  plantAround('banyan', 70, 80, 6, 1);
  // Pines on Ngự Bình and around Thiên Mụ.
  for (const [x, y] of [[53, 83], [56, 82], [59, 83], [51, 86], [61, 86], [55, 87], [58, 88], [1, 36], [1, 41], [8, 36]]) pine(x, y);
  // A few flame trees for a warm accent.
  for (const [x, y] of [[24, 9], [100, 26], [44, 68], [109, 74]]) if (canPlant(x, y)) tree(x, y, 'flame');
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
        if (bankOk(tx, ty) && canPlantLoose(tx, ty)) plant(kinds[(tx + ty) % kinds.length], tx, ty);
      }
    }
  }
  // Forest round the edge of the map — the green hills Huế sits in, thickest
  // to the south where the land rises towards the tombs. A canopy of crowns
  // packed edge to edge; the buddy stays out of it.
  {
    const forest = [];
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
        forest.push([tx, ty]);
      }
    }
    const shades = [[34, 94, 50], [48, 116, 56], [66, 140, 64], [96, 168, 78]];
    for (const pass of [0, 1, 2, 3]) {
      for (const [tx, ty] of forest) {
        for (let k = 0; k < 2; k++) {
          const h = hash(tx * 7 + k, ty * 13 + k);
          const cx = tx * T + 4 + h * 8, cy = ty * T + 4 + hash(ty * 5 + k, tx * 3) * 8;
          const r = 9 + h * 4;
          if (pass === 0) ground.ellipse(cx + 2, cy + 4, r, r * 0.8, P.shadow, 0.35);
          else if (pass === 1) ground.ellipse(cx, cy, r, r * 0.85, shades[0]);
          else if (pass === 2) ground.ellipse(cx - 1, cy - 1, r - 2, r * 0.7, shades[1 + (h > 0.6 ? 1 : 0)]);
          else ground.ellipse(cx - 3, cy - 4, r * 0.4, r * 0.3, shades[3], 0.8);
        }
      }
    }
    for (const [tx, ty] of forest) { solid[ty][tx] = true; used[ty][tx] = true; }
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
