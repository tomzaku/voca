// The road network, laid out like the real city: Lê Duẩn and Trần Hưng Đạo
// along the Citadel's front, turning north-east with the river as Chi Lăng;
// Lê Lợi on the south bank; Hùng Vương running south-east from Phú Xuân
// bridge over the An Cựu canal; Điện Biên Phủ south past the station into the
// hills; the lanes of Kim Long and Gia Hội; the winding tombs' road; and the
// paved courts of the Citadel.
//
// A road is a path (tile coordinates) with a width, of one of three kinds:
//   street — asphalt between kerbs and pavements; `main` ones have a centre line
//   lane   — packed dirt with wheel ruts and grass creeping in at the edges
//   stone  — paved: the Citadel's courts, forecourts, the walking street
//   path   — gravel: the footpaths winding through the riverside parks
// Its ends are cut square, so a straight road is exactly the rectangle it
// covers; where it bends, the bend is rounded.
//
// Roads are only paint — anything that isn't a wall is walkable — but they
// show where the city expects you, and keep houses and trees off them.

import { EAST_GATE_Y, H, SOUTH_GATES, T, W, WEST_GATE_Y, polyline } from './layout.mjs';

/** Points round an ellipse, closed with a little overlap so the ring's
 *  square ends don't leave a notch where they meet. */
const ringAround = (cx, cy, rx, ry, n) => Array.from({ length: n + 2 }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});
/** The parks' paths: [from x, to x, at y] — the north park's under Lê
 *  Duẩn, the south park's above Lê Lợi, broken where the bridges, the
 *  dragon-boat wharf and Phu Văn Lâu's landing come down to the water. */
export const PARK_PATHS = [
  [1, 18, 51], [24, 31, 51], [36, 47.5, 51], [60, 65, 51], [70, 74, 51], [84, 95, 51],
  [1, 18, 61.2], [24, 31, 61.2], [36, 56, 61.2], [79, 96, 61.2],
];
/** A gently winding line from x0 to x1 about row y. */
const wavy = (x0, x1, y) => Array.from({ length: Math.max(2, Math.round(x1 - x0) + 1) }, (_, i) => {
  const x = x0 + ((x1 - x0) * i) / Math.max(1, Math.round(x1 - x0));
  return [x, y + Math.sin(x * 0.7) * 0.3];
});
const road = (kind, width, points, opts = {}) => ({ kind, width, points, line: polyline(points), ...opts });
/** A straight road covering the tile rectangle (x, y, w, h). */
const box = (x, y, w, h, kind, opts) => (w >= h
  ? road(kind, h, [[x, y + h / 2], [x + w, y + h / 2]], opts)
  : road(kind, w, [[x + w / 2, y], [x + w / 2, y + h]], opts));

export const ROADS = [
  // Kim Long: village lanes between the garden houses.
  box(2, 12, 26, 2, 'lane'), box(2, 22, 26, 2, 'lane'), box(2, 31, 26, 2, 'lane'),
  box(2, 12, 2, 36, 'lane'), box(26, 8, 2, 40, 'lane'),
  box(14, 44, 12, 1, 'stone'), box(19, 45, 2, 3, 'stone'),        // Văn Miếu's forecourt
  box(28, WEST_GATE_Y, 7, 2, 'street'),                           // in at Cửa Chánh Tây
  // Along the north bank, the length of the city — Kim Long, Lê Duẩn under
  // the Citadel, Trần Hưng Đạo past Đông Ba — then round the bend as Chi Lăng
  // to Cồn Hến's footbridge.
  road('street', 2, [[0, 49], [96, 49], [99.5, 44.5], [100.5, 40.5]], { main: true }),
  // Gia Hội's old street, from the Đông Ba gate's bridge down to the river.
  road('lane', 2, [[84, 37], [94, 37], [100.5, 40]]),
  // Inside the Citadel
  box(31, 41, 46, 3, 'stone'),                                    // the esplanade along the front wall
  ...SOUTH_GATES.map((g) => box(g, 44, 2, 4, 'stone')),
  box(35, 30, 2, 11, 'stone'),                                    // from the west gate down past the library
  box(32, 21, 8, 7, 'stone'),                                     // the library's island courtyard
  box(69, EAST_GATE_Y, 11, 2, 'stone'), box(70, 38, 2, 3, 'stone'),
  box(72, 12, 2, 24, 'stone'),                                    // up the east side, to the lane to Tịnh Tâm
  // Hồ Tịnh Tâm: a paved walk all round the lake (past Cửa Hậu at its
  // north), a street in to it from Cửa An Hòa, and a lane round from the
  // east, from Cửa Kẻ Trài.
  road('stone', 1.4, ringAround(55, 9.5, 8.8, 4.2, 40)),
  road('street', 2, [[30, 13], [47.6, 13]]),
  road('lane', 1, [[76.5, 21.5], [76.5, 11.6], [63.4, 11.6]]),
  // The Imperial City: the lane behind Thái Hòa, the court before it, the
  // way in through Ngọ Môn and up to Đại Cung Môn
  box(44, 23, 23, 1, 'stone'), box(44, 30, 23, 1, 'stone'),
  box(54, 22, 2, 1, 'stone'), box(54, 31, 2, 3, 'stone'),
  // The south bank
  road('street', 2, [[0, 63], [97, 63]], { main: true }),         // Lê Lợi, along the river
  // Điện Biên Phủ: south past Ga Huế, over the tracks and the canal, up into
  // the hills to the tombs.
  road('street', 2, [[21, 64], [21, 81], [22.5, 88], [22.5, 97], [21, 103], [21, 107.5]]),
  // Hùng Vương: south-east from Phú Xuân bridge, over the An Cựu canal.
  road('street', 2, [[67.5, 64], [68, 69], [70.5, 74], [70.5, 81]], { main: true }),
  box(48, 64, 3, 12, 'street'),                                   // from Lê Lợi park down to the canal
  // South of the canal: the lane round Ngự Bình, and on down through the
  // pines to Minh Mạng's tomb.
  road('lane', 2, [[44, 80], [52, 79], [60, 79.5], [70.5, 80.5]]),
  road('lane', 2, [[70.5, 81], [68, 86], [66, 92], [66.5, 99], [68, 107.5]]),
  // The tombs' road, winding through the hills from gate to gate.
  road('lane', 2, [[2, 107.5], [10, 107.5], [16, 108.3], [21, 107.5], [27, 108.3], [34.5, 107.5], [42, 108.3],
    [50, 108.6], [58, 108.2], [66, 107.6], [72, 108.3], [79, 107.5], [88, 107.5]]),
  // Footpaths winding through the riverside parks, between the bridges.
  ...PARK_PATHS.map(([x0, x1, y]) => road('path', 0.8, wavy(x0, x1, y))),
  box(35, 69, 12, 1, 'stone'),                                    // Quốc Học's forecourt
  // Phố đi bộ Nguyễn Đình Chiểu: the walking street along the south bank,
  // from under Phú Xuân bridge to Trường Tiền, by the ironwood boardwalk.
  road('stone', 1.6, [[56.5, 61.2], [75, 61.2]]),
];

/** Where (x, y) px lies on a road: its signed offset from the centre line and
 *  how far along it, in px — or null if it's off the road. Square ends. */
export function roadHit(r, x, y) {
  const half = (r.width * T) / 2;
  const segs = r.line.segs;
  let best = null;
  segs.forEach((g, i) => {
    const dx = g.bx - g.ax, dy = g.by - g.ay;
    let t = ((x - g.ax) * dx + (y - g.ay) * dy) / (g.len * g.len);
    if ((i === 0 && t < 0) || (i === segs.length - 1 && t > 1)) return;
    t = Math.max(0, Math.min(1, t));
    const px = g.ax + dx * t, py = g.ay + dy * t;
    const d = Math.hypot(x - px, y - py);
    if (d >= half || (best && d >= Math.abs(best.o))) return;
    const side = Math.sign(dx * (y - g.ay) - dy * (x - g.ax)) || 1;
    best = { o: side * d, s: g.s0 + t * g.len };
  });
  return best;
}

/** How far each tile's centre is from the nearest road's edge, in tiles
 *  (negative inside one). Ends count as rounded here, so the margin runs
 *  round them too. */
const GAP = (() => {
  const gap = Array.from({ length: H }, () => new Float32Array(W).fill(Infinity));
  for (const r of ROADS) {
    const half = r.width / 2;
    const xs = r.points.map((p) => p[0]), ys = r.points.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - half - 3)), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs) + half + 3));
    const y0 = Math.max(0, Math.floor(Math.min(...ys) - half - 3)), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys) + half + 3));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
        let d = Infinity;
        for (const g of r.line.segs) {
          const dx = g.bx - g.ax, dy = g.by - g.ay;
          const t = Math.max(0, Math.min(1, ((cx - g.ax) * dx + (cy - g.ay) * dy) / (g.len * g.len)));
          d = Math.min(d, Math.hypot(cx - (g.ax + dx * t), cy - (g.ay + dy * t)));
        }
        gap[ty][tx] = Math.min(gap[ty][tx], d / T - half);
      }
    }
  }
  return gap;
})();
export const roadGap = (tx, ty) => GAP[ty]?.[tx] ?? Infinity;

/** A tile on a road. */
export const onRoad = (tx, ty) => ROADS.some((r) => roadHit(r, (tx + 0.5) * T, (ty + 0.5) * T));
/** On a road, or within a tile of one — kept clear for walking. */
export const nearRoad = (tx, ty) => roadGap(tx, ty) < 1;
export const onAnyRoad = nearRoad;
