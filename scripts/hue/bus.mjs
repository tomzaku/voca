// Huế's buses: they run on the roads — the streets, lanes and paved ways, and
// the river's bridges between them — to stops across the city, from the
// market to the tombs. This writes where a bus may drive (the map's hidden
// `roads` layer) and where it stops (`busStop` points, named by the place's
// story id); WorldScene finds the way. Each stop has its shelter at the
// roadside. The generator fails if a stop isn't on
// a road, or can't be reached by road from the others.

import { Canvas } from './core/canvas.mjs';
import { deck, drawn, ground, mark, over, solid, used } from './core/world.mjs';
import { BRIDGE_Y0, BRIDGE_Y1, H, RIVER_BRIDGES, T, W, isWater } from './layout.mjs';
import { ROADS, roadGap, roadHit } from './roads.mjs';

/** The stops, in tiles, each on a road by its place; `shelter`, where its
 *  shelter's top-left tile goes, when the nearest free spot isn't right. */
export const BUS_STOPS = [
  { place: 'dongBa', x: 90, y: 52.4 },
  { place: 'kyDai', x: 51, y: 52.4, shelter: [49, 53] },  // on the grass at the kerb, beside Nghênh Lương Đình's landing
  { place: 'vanMieu', x: 20, y: 49 },
  { place: 'thienMu', x: 3, y: 44 },
  { place: 'tinhTam', x: 47, y: 13 },
  { place: 'gaHue', x: 28, y: 65.6 },
  { place: 'quocHoc', x: 41, y: 65.6 },
  { place: 'walkingStreet', x: 55.5, y: 65.6, shelter: [54, 63] },
  { place: 'nguBinh', x: 52, y: 82.6 },
  { place: 'vyDa', x: 107, y: 62.3 },
  // The tombs' shelters at the lane's edge, beside the foot of each stair
  // (the lane frays into the grass, so the nearest free spot reads as set back).
  { place: 'tuDuc', x: 10, y: 114.8, shelter: [11, 115] },
  { place: 'khaiDinh', x: 34.5, y: 114.8, shelter: [36, 115] },
  { place: 'minhMang', x: 79, y: 114.8, shelter: [80, 115] },
];

/** Where a bus may drive: 1 on a road (stone courts and park paths aside —
 *  a bus doesn't cross a park) or a river bridge, else 0. */
export function busRoads() {
  const data = new Array(W * H).fill(0);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
    const road = ROADS.some((r) => r.kind !== 'path' && !r.court && roadHit(r, cx, cy));
    const bridge = RIVER_BRIDGES.some(([a, b]) => tx >= a && tx < b) && cy >= BRIDGE_Y0 && cy < BRIDGE_Y1;
    if (road || bridge) data[ty * W + tx] = 1;
  }
  return data;
}

/** Problems with the stops: off the road, or cut off from the first one. */
export function checkBus(data) {
  const problems = [];
  const at = (s) => [Math.floor(s.x), Math.floor(s.y)];
  for (const s of BUS_STOPS) {
    const [tx, ty] = at(s);
    if (!data[ty * W + tx]) problems.push(`bus stop ${s.place} (${tx},${ty}) isn't on a road`);
  }
  const seen = new Uint8Array(W * H);
  const [sx, sy] = at(BUS_STOPS[0]);
  const q = [[sx, sy]];
  seen[sy * W + sx] = 1;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !data[ny * W + nx]) continue;
      seen[ny * W + nx] = 1;
      q.push([nx, ny]);
    }
  }
  for (const s of BUS_STOPS) {
    const [tx, ty] = at(s);
    if (data[ty * W + tx] && !seen[ty * W + tx]) problems.push(`bus stop ${s.place} (${tx},${ty}) can't be reached by road`);
  }
  return problems;
}

/** A bus stop's shelter at the roadside beside each stop: a green roof on
 *  posts, a bench, the blue sign with its bus. It stands at the kerb — its
 *  front row touching the road's edge — at the nearest such spot to the
 *  stop. It doesn't block; trees and houses keep off it. Returns where each
 *  went (tiles), for the meta. */
export function drawBusStops() {
  const free = (tx, ty) => [0, 1].every((dx) => [0, 1].every((dy) => {
    const x = tx + dx, y = ty + dy;
    return solid[y]?.[x] === false && !isWater(x * T + 8, y * T + 8)
      && !ROADS.some((r) => roadHit(r, (x + 0.5) * T, (y + 0.5) * T))
      && !roofOver(x, y);
  }));
  // Something already drawn over this tile — a roof, a tree's crown.
  const roofOver = (x, y) => {
    for (let py = y * T; py < (y + 1) * T; py += 2) for (let px = x * T; px < (x + 1) * T; px += 2) if (over.alpha(px, py)) return true;
    return false;
  };
  return BUS_STOPS.map((s) => {
    const sx = Math.round(s.x) - 1, sy = Math.floor(s.y);
    // Free 2×2 spots whose tiles touch the road's edge without being on it,
    // the nearest first.
    const kerb = (tx, ty) => {
      const gaps = [0, 1].flatMap((dx) => [0, 1].map((dy) => roadGap(tx + dx, ty + dy)));
      return Math.min(...gaps) >= -0.3 && Math.min(...gaps) <= 0.6;
    };
    const tries = [];
    for (let dy = -6; dy <= 5; dy++) for (let dx = -6; dx <= 5; dx++) tries.push([sx + dx, sy + dy]);
    tries.sort((a, b) => Math.hypot(a[0] + 1 - s.x, a[1] + 1 - s.y) - Math.hypot(b[0] + 1 - s.x, b[1] + 1 - s.y));
    const spot = s.shelter ?? tries.find(([x, y]) => free(x, y) && kerb(x, y));
    if (!spot) return null;
    const [tx, ty] = spot;
    const cv = new Canvas(2 * T, 2 * T);
    cv.rect(2, 7, 28, 4, [46, 130, 84]);
    cv.rect(2, 7, 28, 1, [92, 176, 122]);
    cv.rect(2, 10, 28, 1, [30, 92, 58]);
    for (const x of [4, 26]) cv.rect(x, 11, 2, 17, [80, 84, 92]);
    cv.rect(8, 21, 16, 2, [168, 120, 78]);
    cv.rect(8, 23, 1, 4, [70, 60, 54]); cv.rect(23, 23, 1, 4, [70, 60, 54]);
    cv.rect(15, 0, 1, 7, [80, 84, 92]);                  // the sign on its pole
    cv.rect(11, 0, 9, 6, [40, 92, 180]);
    cv.rect(13, 1, 5, 3, [250, 250, 250]);
    cv.rect(13, 4, 1, 1, [40, 40, 40]); cv.rect(17, 4, 1, 1, [40, 40, 40]);
    ground.ellipse(tx * T + 17, ty * T + 29, 13, 2, [0, 0, 0], 0.2);
    ground.blit(cv, tx * T, ty * T);
    over.blit(cv, tx * T, ty * T, [0, 12]);
    mark(deck, tx, ty, 2, 2);
    mark(used, tx, ty, 2, 2);
    drawn.push({ type: 'busShelter', x: tx * T, y: ty * T });
    return [tx + 1, ty + 1.5];
  });
}
