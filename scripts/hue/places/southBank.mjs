// The south bank: Ga Huế, Hai Bà Trưng, Quốc Học, the food market in Lê Lợi park, the walking street, Cung An
// Định, the houses of Vỹ Dạ, and Ngự Bình hill.

import { Canvas, hash, mix } from '../core/canvas.mjs';
import { P, ROOF } from '../core/palette.mjs';
import { drawn, glow, ground, mark, place, solid, used } from '../core/world.mjs';
import { HOUSE, hall, roof } from '../draw/buildings.mjs';
import { K, parterre } from '../hd/art.mjs';
import { DISHES, anDinh, foodStall, haiBaTrung, halve, quocHoc, quocHocGate, saigonMorin } from '../hd/landmarks.mjs';
import { T } from '../layout.mjs';

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Ga Huế', x: 13.5, y: 68.5, place: 'gaHue' },
  { text: 'Trường Hai Bà Trưng', x: 28, y: 67.5, place: 'haiBaTrung' },
  { text: 'Trường Quốc Học', x: 41, y: 67.5, place: 'quocHoc' },
  { text: 'Chợ ẩm thực', x: 59, y: 67.2, place: 'foodMarket' },
  { text: 'Saigon Morin', x: 75.5, y: 68, place: 'saigonMorin' },
  { text: 'Cung An Định', x: 92, y: 70.5, place: 'anDinh' },
  { text: 'Vỹ Dạ', x: 108, y: 61, place: 'vyDa', theme: 'forest', anchor: 'left' },
  { text: 'Ngự Bình', x: 57, y: 91.4, place: 'nguBinh', theme: 'forest' },
];

/** The food market's stalls: five to a row, a row every four tiles (the
 *  stalls, their tables, a walk), each's top-left tile. */
export const STALLS = DISHES.map(({ dish }, i) => ({ dish, x: 52 + (i % 5) * 3, y: 67 + Math.floor(i / 5) * 4 }));

export function drawSouthBank() {
  // Ga Huế: the cream railway station, with its tracks running west–east.
  {
    for (let x = 6 * T; x < 47 * T; x++) {
      for (let y = 74 * T + 2; y < 76 * T - 2; y++) ground.set(x, y, mix([150, 140, 126], [130, 120, 108], hash(x, y) * 0.6));
      if (x % 6 < 2) ground.rect(x, 74 * T + 4, 2, T * 2 - 8, [104, 80, 60]);   // sleepers
      ground.set(x, 74 * T + 9, [96, 100, 108]);
      ground.set(x, 75 * T + 6, [96, 100, 108]);
    }
    mark(used, 6, 74, 41, 2);
    const cv = hall({ w: 9, h: 5, roofRows: 2, roofPal: ROOF.terra, wall: [236, 222, 186], pillar: [196, 170, 120], pillarStep: 12, windows: true, windowStep: 11, doorW: 12, doorFill: [80, 64, 50] });
    // A little clock tower over the door.
    cv.rect(cv.w / 2 - 10, 2, 20, 26, [240, 228, 196]);
    cv.ellipse(cv.w / 2, 12, 5, 5, [250, 246, 236]);
    cv.rect(cv.w / 2, 8, 1, 4, [40, 36, 34]);
    cv.spec = { kind: 'gaHue' };
    place(cv, 9, 68, 3);
  }

  // Hai Bà Trưng, the old Đồng Khánh girls' school, next door to Quốc Học
  // along Lê Lợi.
  {
    const cv = halve(haiBaTrung());
    cv.spec = { kind: 'haiBaTrung' };
    place(cv, 23, 67, 3);
  }

  // Quốc Học: the red school behind its wall and gate, which open on the
  // forecourt; the gate's middle passage is the way in.
  {
    const cv = halve(quocHoc());
    cv.spec = { kind: 'quocHoc' };
    place(cv, 35, 67, 3);
    const gate = halve(quocHocGate());
    gate.spec = { kind: 'quocHocGate' };
    place(gate, 35, 71, 1, { gaps: [40, 41], shadow: false });
  }

  // Huế's food market, in the park between the bridges: three rows of stalls
  // on a paved square (roads.mjs), each with the one dish it's known for,
  // tables and stools before them, lanterns that light up at night. Walk up
  // to a stall and it tells you its dish (meta.mjs: STALLS).
  for (const { dish, x: tx, y: ty } of STALLS) {
    const cv = halve(foodStall(dish));
    cv.spec = { kind: 'foodStall', dish };
    place(cv, tx, ty, 1, { shadow: false });
    for (const lx of [5, 16, 27]) glow(tx * T + lx + 0.5, ty * T + 11, [255, 170, 90], 3);
    // A low table and two stools out front.
    const fx = tx * T + 8, fy = (ty + 2) * T + 5;
    ground.rect(fx, fy, 12, 5, [150, 104, 66]);
    ground.rect(fx, fy, 12, 1, [184, 136, 92]);
    for (const sx of [fx - 4, fx + 14]) ground.rect(sx, fy + 1, 3, 3, [196, 64, 52]);
  }

  // Shophouses east of Hùng Vương, the old Phố Tây.
  for (const [x, pal] of [[81, ROOF.plum]]) place(HOUSE(pal, [222, 206, 176]), x, 71, 2);

  // Hotel Saigon Morin, on the corner of Lê Lợi and Hùng Vương where
  // Trường Tiền comes ashore.
  {
    const cv = halve(saigonMorin());
    cv.spec = { kind: 'saigonMorin' };
    place(cv, 71, 67, 3);
  }

  // Cung An Định: the European-style palace on the An Cựu canal, with a knot
  // garden behind it, off Lê Lợi, and another in front running down to the
  // water. A gravel walk runs through each on the palace's axis; the hedges
  // block, the walks and the gravel by the canal don't.
  {
    const knot = (ty, h, bedRows) => {
      const art = parterre(10 * T * K, h * K, { top: 0, bottom: bedRows * T * K, walk: 2 * T * K });
      ground.blit(halve(art), 87 * T, ty * T);
      drawn.push({ type: 'parterre', art, x: 87 * T, y: ty * T, w: 10 * T, h });
      mark(used, 86, ty, 12, Math.ceil(h / T));
      for (const tx of [87, 93]) mark(solid, tx, ty, 4, bedRows);
    };
    knot(67, 3 * T, 2);                    // behind, between the street and the palace
    knot(75, 3 * T + 3, 2);                // in front, down to the canal
    const cv = halve(anDinh());
    cv.spec = { kind: 'anDinh' };
    place(cv, 88, 69, 3);
  }


  // Ngự Bình itself is terrain (hills.mjs: NGU_BINH) — terraces and cliffs,
  // pines on the slopes (fill/greenery.mjs), stone stairs up its north face
  // (roads.mjs). On its flat summit, at the head of the stairs, the pavilion
  // where the Focus Zone is (meta.mjs puts its `focus` point before it).
  {
    const cv = new Canvas(2 * T, 2 * T);
    cv.rect(2, 24, 28, 8, [184, 176, 164]);
    cv.rect(2, 24, 28, 2, [206, 198, 186]);
    for (const x of [5, 15, 25]) cv.rect(x, 13, 2, 11, [196, 70, 52]);
    roof(cv, 1, 4, 30, 10, ROOF.glazed, 4);
    cv.spec = { kind: 'nghenhLuong' };
    place(cv, 56, 89, 1);
  }
}
