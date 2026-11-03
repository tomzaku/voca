// Where everything is: the map's size, the river, canals, Citadel, gates,
// lakes and roads, the keepers' spots — and the tests built on them (is this
// pixel water? is this tile by a road?). Plain data and geometry; nothing here
// draws.

export const W = 120; // map size in tiles
export const H = 122;
// Below the city, from this row: the forested hills where the emperors lie.
export const HILLS_Y = 93;
export const T = 16; // tile size px (WorldScene draws the map at 2×)
export const PW = W * T;
export const PH = H * T;

// ── Layout (tile units unless noted) ──

/** A polyline in tile coordinates, measured in pixels for distance tests. */
export function polyline(points) {
  const segs = [];
  let s = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i].map((v) => v * T), [bx, by] = points[i + 1].map((v) => v * T);
    const len = Math.hypot(bx - ax, by - ay);
    segs.push({ ax, ay, bx, by, len, s0: s });
    s += len;
  }
  return { segs, length: s, vertexS: [0, ...segs.map((g) => g.s0 + g.len)] };
}
/** Distance from (x, y) px to a polyline, and how far along it that is. */
export function nearest(line, x, y) {
  let d = Infinity, s = 0;
  for (const g of line.segs) {
    const dx = g.bx - g.ax, dy = g.by - g.ay;
    const t = Math.max(0, Math.min(1, ((x - g.ax) * dx + (y - g.ay) * dy) / (g.len * g.len)));
    const dd = Math.hypot(x - (g.ax + dx * t), y - (g.ay + dy * t));
    if (dd < d) { d = dd; s = g.s0 + t * g.len; }
  }
  return { d, s };
}
export const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

// The Hương: west → east along the Citadel's front, then the bend north-east
// past Đông Ba, widest where it wraps around Cồn Hến. Along the city it
// leaves room on both banks for the riverside parks (paint/parks.mjs).
export const RIVER = polyline([[-4, 59], [40, 58.9], [80, 59.1], [97, 59], [106, 50], [111, 40], [115, 30], [120, 18], [126, 4]]);
export const [, , , S3, S4, , S6, S7] = RIVER.vertexS;
export const riverHalfWidth = (s) => {
  let hw = s < S3 ? 4 : s < S4 ? lerp(4, 8, (s - S3) / (S4 - S3)) : s < S6 ? 8 : lerp(8, 5.5, (s - S6) / (S7 - S6));
  return (hw + 0.25 * Math.sin(s / (7 * T))) * T;
};

// Islets: Dã Viên (under its bridge) and Cồn Hến (in the bend, lying along
// the flow).
export const DA_VIEN = { cx: 33.5 * T, cy: 59 * T, rx: 4.5 * T, ry: 1.6 * T, angle: 0 };
export const CON_HEN = { cx: 110.5 * T, cy: 41 * T, rx: 6.5 * T, ry: 3.4 * T, angle: Math.atan2(-9, 5) };
export const ISLETS = [DA_VIEN, CON_HEN];
export const isletE = (i, x, y) => {
  const dx = x - i.cx, dy = y - i.cy, c = Math.cos(i.angle), s = Math.sin(i.angle);
  return ((dx * c + dy * s) / i.rx) ** 2 + ((-dx * s + dy * c) / i.ry) ** 2;
};
export const onIslet = (x, y) => ISLETS.some((i) => isletE(i, x, y) <= 1);

// Canals: Đông Ba (between the Citadel and Gia Hội) and An Cựu (across the
// south bank).
export const CANALS = [
  polyline([[82.2, -2], [82.2, 55.6]]),
  polyline([[13, 81], [30, 80.4], [50, 80], [75, 80.6], [100, 79.6], [126, 80]]),
];
export const CANAL_HW = 1.3 * T;

// The Citadel (Kinh Thành): a 2-tile moat ring, then the wall ring. Inside
// it, the Imperial City (Hoàng Thành) with its own 1-tile moat and wall.
// The front moat is a row deeper than the rest: Kỳ Đài juts out into it from
// the wall, and the water still passes in front of it.
export const CITADEL = { moat: { x0: 28, y0: 3, x1: 80, y1: 48 }, wall: { x0: 30, y0: 5, x1: 78, y1: 45 } };
export const IMPERIAL = { moat: { x0: 41, y0: 15, x1: 69, y1: 41 }, wall: { x0: 42, y0: 16, x1: 68, y1: 40 } };
// Kỳ Đài's bastion, as Huế's is: out from the front wall on two straight
// flanks, then two faces meeting in a point aimed down the axis at Phu Văn
// Lâu — an arrowhead. The moat's outer bank bends round the point
// (MOAT_NOTCH), so the water runs past in a V rather than straight. Corners
// in tiles; the box is its footprint on the map (the wall it replaces, and
// the solid tiles).
export const BASTION = {
  x0: 50, x1: 60, y0: 43, y1: 49,
  poly: [[50, 45], [60, 45], [60, 46.4], [55, 48.2], [50, 46.4]],
};
export const MOAT_NOTCH = [[49.2, 47.9], [60.8, 47.9], [55, 49.7]];
// The Citadel's ten gates, each 2 tiles wide: `at` is the left column of a
// north or south gate, the top row of a west or east one. `place` is its
// story (src/game/mapPlaces.ts); the label is the name Huế calls it by.
export const GATES = [
  { side: 'south', at: 36, label: 'Chánh Nam Môn', place: 'chanhNam' },
  { side: 'south', at: 47, label: 'Cửa Quảng Đức', place: 'quangDuc' },
  { side: 'south', at: 61, label: 'Cửa Ngăn', place: 'cuaNgan' },
  { side: 'south', at: 72, label: 'Cửa Thượng Tứ', place: 'thuongTu' },
  { side: 'east', at: 20, label: 'Cửa Kẻ Trài', place: 'keTrai' },
  { side: 'east', at: 36, label: 'Cửa Đông Ba', place: 'dongBaGate' },
  { side: 'north', at: 54, label: 'Cửa Hậu', place: 'cuaHau' },
  { side: 'west', at: 12, label: 'Cửa An Hòa', place: 'anHoa' },
  { side: 'west', at: 30, label: 'Cửa Chánh Tây', place: 'chanhTay' },
  { side: 'west', at: 38, label: 'Cửa Hữu', place: 'cuaHuu' },
];
export const gatesOn = (side) => GATES.filter((g) => g.side === side).map((g) => g.at);
export const SOUTH_GATES = gatesOn('south');
export const WEST_GATE_Y = 30;                                // the gate Kim Long's road runs through
export const EAST_GATE_Y = 36;                                // Đông Ba's, to the market
export const NGO_MON = { x: 49, y: 34, w: 12, h: 6 };         // in the Imperial City's south wall

// The skills' keepers — one person per skill, at a landmark that suits it
// (see src/game/features.ts): words in the court's archive, talk in the
// market, listening in the royal theatre. Their menus reach every activity,
// including those whose landmarks (Thiên Mụ, Quốc Học…) have no keeper of
// their own.
export const FEATURES = [
  ['vocabulary', 34, 26.8, 'Tàng Thư Lâu'],      // on its island, beside the bridge
  ['speaking', 91, 47.5, 'Chợ Đông Ba'],
  ['listening', 64, 23.3, 'Duyệt Thị Đường'],    // on the paved way before its door
  ['writing', 20, 44.5, 'Văn Miếu'],
  ['you', 13, 12.5, 'Nhà vườn An Hiên'],
  // One keeper for every collection and level, before the throne hall.
  ['collections', 55, 30.5, 'Điện Thái Hòa'],
];
// Arrive at the south end of Trường Tiền.
export const SPAWN = [76.5, 66];
// The river bridges' columns, west to east: Nguyễn Hoàng, Dã Viên, Phú Xuân,
// Trường Tiền.
export const RIVER_BRIDGES = [[19, 23], [32, 35], [66, 69], [75, 78]];

// Tàng Thư Lâu: like the real one, the library stands on an island in Học
// Hải lake, reached by one small bridge.
export const LIBRARY = { lake: { x: 31, y: 19, w: 10, h: 11 }, island: { x: 32, y: 21, w: 8, h: 7 }, bridgeX: 35 };

export const LAKES = [
  { kind: 'ellipse', cx: 55 * T, cy: 9.8 * T, rx: 7 * T, ry: 2.3 * T },  // Tịnh Tâm
  { kind: 'rect', x: 49, y: 31, w: 5, h: 2 },                            // Thái Dịch lake, either side
  { kind: 'rect', x: 56, y: 31, w: 5, h: 2 },                            // of Trung Đạo, before Thái Hòa
  { kind: 'rect', ...LIBRARY.lake },
  // The pond in the north riverside park, under Cầu bán nguyệt.
  { kind: 'ellipse', cx: 41 * T, cy: 54 * T, rx: 2.4 * T, ry: 0.85 * T },
  // In the tomb hills: Lưu Khiêm at Tự Đức's; Trừng Minh either side of
  // Minh Mạng's axis, and the crescent of Tân Nguyệt round his tomb.
  { kind: 'ellipse', cx: 8 * T, cy: 103 * T, rx: 4.5 * T, ry: 2.6 * T },
  { kind: 'ellipse', cx: 73.3 * T, cy: 100 * T, rx: 2.2 * T, ry: 3.4 * T },
  { kind: 'ellipse', cx: 84.7 * T, cy: 100 * T, rx: 2.2 * T, ry: 3.4 * T },
  { kind: 'crescent', cx: 79 * T, cy: 92.5 * T, rx: 5 * T, ry: 3.3 * T, inner: { cy: 92 * T, rx: 4 * T, ry: 2.4 * T } },
  // The falls' pools: one up on the mesa between Khải Định's and Minh
  // Mạng's, one at the foot of its cliff on the highland.
  { kind: 'ellipse', cx: 53.5 * T, cy: 97.4 * T, rx: 3.2 * T, ry: 1.9 * T },
  { kind: 'ellipse', cx: 53.5 * T, cy: 107.4 * T, rx: 3.4 * T, ry: 1.5 * T },
];

/** The hill stream: out of the mesa's pool, over its cliff in a waterfall
 *  to the pool below, over the highland's cliff in a second, under the
 *  tombs' road and away into the forest (places/falls.mjs). */
export const STREAM = polyline([[53.5, 97.5], [53.5, 104.8], [53.4, 107.4], [53.6, 110.4], [53.4, 113.4], [53.7, 116.4], [53.2, 119.5], [53.8, 122.5]]);
export const STREAM_HW = 0.85 * T;
export const inStream = (x, y) => y > 96 * T && nearest(STREAM, x, y).d < STREAM_HW;

export const inBox = (tx, ty, b) => tx >= b.x0 && tx < b.x1 && ty >= b.y0 && ty < b.y1;
/** Is (x, y) inside the polygon `pts` (even-odd rule)? */
export const inPoly = (x, y, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
export const inMoat = (x, y) => {
  const tx = x / T, ty = y / T;
  const citadel = (inBox(tx, ty, CITADEL.moat) || inPoly(tx, ty, MOAT_NOTCH))
    && !inBox(tx, ty, CITADEL.wall) && !inPoly(tx, ty, BASTION.poly);
  const imperial = inBox(tx, ty, IMPERIAL.moat) && !inBox(tx, ty, IMPERIAL.wall);
  return citadel || imperial;
};
export const inTileRect = (x, y, r) => x >= r.x * T && x < (r.x + r.w) * T && y >= r.y * T && y < (r.y + r.h) * T;
export const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
export const inLake = (x, y) => !inTileRect(x, y, LIBRARY.island) && LAKES.some((l) =>
  l.kind === 'ellipse' ? inEllipse(x, y, l.cx, l.cy, l.rx, l.ry)
  : l.kind === 'crescent' ? y > l.cy && inEllipse(x, y, l.cx, l.cy, l.rx, l.ry) && !inEllipse(x, y, l.cx, l.inner.cy, l.inner.rx, l.inner.ry)
  : inTileRect(x, y, l));
export const inRiver = (x, y) => {
  const { d, s } = nearest(RIVER, x, y);
  return d < riverHalfWidth(s) && !onIslet(x, y);
};
export const inCanal = (x, y) => CANALS.some((c) => nearest(c, x, y).d < CANAL_HW);
export const isWater = (x, y) => inRiver(x, y) || inCanal(x, y) || inMoat(x, y) || inLake(x, y) || inStream(x, y);

// The river's bridges run from Lê Duẩn (row 52) across to Lê Lợi (row 66).
export const BRIDGE_Y0 = 52.7 * T;
export const BRIDGE_Y1 = 65.3 * T;
export const BANK_N = 55 * T;
export const BANK_S = 63 * T;

// Cầu đi bộ gỗ lim, the ironwood boardwalk along the south bank (parks.mjs
// lays it): one row of planks in three runs, broken by the two bridges, and
// steps two rows down at each outer end. Here so the bridges can keep their
// piers off it.
export const BOARDWALK_Y = 61;
export const BOARDWALK_RUNS = [[51, 65, 51], [69, 74, 74], [78, 89, 89]];
export const onBoardwalk = (tx, ty) => BOARDWALK_RUNS.some(([a, b, step]) =>
  (ty === BOARDWALK_Y && tx >= a && tx <= b) || (tx === step && ty > BOARDWALK_Y && ty <= BOARDWALK_Y + 2));

/** Too close to a keeper or the spawn to build or plant on. */
export const nearSlot = (tx, ty) => [...FEATURES.map(([, x, y]) => [x, y]), SPAWN].some(([x, y]) => Math.abs(tx + 1 - x) < 4 && Math.abs(ty + 1 - y) < 4);
