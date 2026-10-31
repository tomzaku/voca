// The riverside parks: the long lawns between the Hương and the streets on
// both banks — Lê Duẩn's on the north, Lê Lợi's on the south — with their
// winding paths (../roads.mjs PARK_PATHS), flower beds, benches and lamps;
// Cầu bán nguyệt, the half-moon bridge over the north park's pond; Đài phun
// nước, the fountain in the south park; and Cầu đi bộ gỗ lim, the ironwood
// boardwalk along the south bank, under Phú Xuân bridge.

import { Canvas, hash } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { deck, drawn, glow, ground, mark, place, used } from '../core/world.mjs';
import { plankDeck } from '../draw/buildings.mjs';
import { T, isWater } from '../layout.mjs';
import { PARK_PATHS, ROADS, roadHit } from '../roads.mjs';

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Cầu bán nguyệt', x: 41, y: 53.2, place: 'banNguyet' },
  { text: 'Đài phun nước', x: 72, y: 63.4, place: 'phunNuoc' },
  { text: 'Phố đi bộ', x: 63, y: 65.4, place: 'walkingStreet' },
  { text: 'Cầu đi bộ gỗ lim', x: 61.5, y: 62.6, place: 'goLim' },
];

const BLOOMS = [[236, 150, 178], [250, 214, 110], [190, 150, 220], [240, 240, 236], [230, 90, 80]];

/** A flower bed: an oval of earth, edged, full of flowers. */
function flowerBed(x, y) {
  ground.ellipse(x, y, 9, 4, [120, 90, 64]);
  for (let i = 0; i < 14; i++) {
    const fx = x - 7 + hash(x + i, y) * 14, fy = y - 2.5 + hash(y + i, x) * 5;
    ground.set(fx, fy, BLOOMS[i % BLOOMS.length]);
  }
  drawn.push({ type: 'bed', x, y });
  mark(used, Math.floor(x / T), Math.floor(y / T), 1, 1);
}

/** A park bench, its back to the river. */
function bench(x, y) {
  ground.rect(x - 5, y - 4, 11, 2, [140, 96, 60]);
  ground.rect(x - 5, y - 2, 11, 2, [168, 120, 78]);
  ground.rect(x - 4, y, 1, 2, [70, 60, 54]);
  ground.rect(x + 4, y, 1, 2, [70, 60, 54]);
  drawn.push({ type: 'bench', x, y });
  mark(used, Math.floor(x / T), Math.floor(y / T), 1, 1);
}

/** A park lamp: lower than the streets', a round lantern. */
function parkLamp(x, y) {
  ground.rect(x, y - 7, 1, 7, [60, 64, 70]);
  ground.rect(x - 1, y - 9, 3, 2, [255, 236, 180]);
  glow(x, y - 8, [255, 224, 160], 3);
  drawn.push({ type: 'parkLamp', x, y });
}

export function drawParks() {
  // A street piano on Phố đi bộ, by the walking street's kerb: an upright in
  // dark wood, its keys showing, a stool before it (the meta's `play` point).
  {
    const cv = new Canvas(2 * T, 2 * T);
    cv.rect(4, 6, 24, 18, [70, 42, 30]);
    cv.rect(4, 6, 24, 2, [110, 72, 50]);
    cv.rect(6, 9, 20, 6, [92, 58, 40]);
    cv.rect(4, 16, 24, 5, [244, 238, 222]);
    for (let x = 6; x < 27; x += 3) cv.rect(x, 16, 1, 5, [120, 110, 100]);
    for (const x of [7, 10, 16, 19, 22]) cv.rect(x, 16, 2, 3, [30, 26, 24]);
    cv.rect(4, 21, 24, 3, [58, 34, 24]);
    cv.rect(5, 24, 2, 6, [58, 34, 24]); cv.rect(25, 24, 2, 6, [58, 34, 24]);
    cv.rect(11, 27, 10, 2, [150, 100, 60]);                  // the stool
    place(cv, 61, 62, 1, { shadow: false });
  }

  // Phố đi bộ: red lanterns strung across the walking street on poles.
  for (let x = 57 * T; x < 75 * T; x += 2 * T) {
    for (const y of [63.5 * T, 64.9 * T]) ground.rect(x, y - 8, 1, 8, [70, 52, 40]);
    for (let i = 0; i < 4; i++) {
      const lx = x + 4 + i * 6, ly = 63.5 * T - 6 + Math.round(Math.sin((i / 3) * Math.PI) * 3);
      ground.rect(lx, ly, 2, 3, [214, 72, 56]);
      glow(lx + 1, ly + 1, [255, 140, 90], 2);
    }
  }

  // Along each path, by turns: a flower bed, a bench, a lamp — on the path's
  // landward side, clear of the water.
  for (const [x0, x1, y] of PARK_PATHS) {
    const north = y < 58;
    for (let x = x0 + 1.5, i = 0; x < x1 - 1; x += 2.5, i++) {
      const px = Math.round(x * T), py = Math.round((y + Math.sin(x * 0.7) * 0.3) * T) + (north ? -11 : 12);
      if (isWater(px, py) || isWater(px - 8, py) || isWater(px + 8, py)) continue;   // not in the pond
      // Nor on a bridge, a landing or a gate's paved way the path passes through.
      const tx = Math.floor(px / T), ty = Math.floor(py / T);
      if (deck[ty]?.[tx] || deck[ty]?.[tx + 1] || deck[ty]?.[tx - 1] || ROADS.some((r) => r.kind !== 'path' && [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]].some(([dx, dy]) => roadHit(r, px + dx, py + dy)))) continue;
      if (i % 3 === 0) flowerBed(px, py);
      else if (i % 3 === 1) bench(px, py + (north ? 2 : -2));
      else parkLamp(px, py);
    }
  }

  // A plank footbridge carries the north park's path over the Đông Ba canal —
  // about as wide as the path, centred where it crosses (row ~54.1).
  plankDeck(80, 53.5, 4, 1.25, true);

  // Cầu bán nguyệt: the half-moon bridge, seen side-on from the river — a
  // steep stone arch over the pond, the deck and its balustrade riding high
  // over it, the arch's reflection closing the circle.
  {
    const cv = new Canvas(4 * T, 2 * T);
    const cx = 32, base = 30, r = 13;
    for (let x = 0; x < cv.w; x++) {
      const d = Math.abs(x + 0.5 - cx);
      const deck = Math.round(base - 6 - Math.max(0, 15 - d * d / 22));     // the deck's hump
      for (let y = deck; y < base; y++) {
        const inArch = d < r && (base - y) < Math.sqrt(r * r - d * d);
        if (!inArch) cv.set(x, y, y === deck ? [236, 232, 222] : (x + y) % 5 === 0 ? [168, 162, 150] : [206, 200, 188]);
      }
      if (x % 4 === 0) cv.rect(x, deck - 3, 1, 3, [226, 222, 212]);         // balusters
      cv.set(x, deck - 3, [236, 232, 222]);
    }
    for (let x = cx - r; x <= cx + r; x++) {
      const h = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
      for (let y = 0; y < h * 0.45; y++) cv.set(x, base + y, [176, 170, 160], 0.35);  // its reflection
    }
    cv.spec = { kind: 'halfMoon' };
    place(cv, 39, 53, 0, { shadow: false });
    mark(deck, 39, 53, 4, 2);
  }

  // Đài phun nước: a round basin, the fountain rising in tiers from its middle.
  {
    const cv = new Canvas(2 * T, 2 * T);
    cv.ellipse(16, 20, 15, 9, [176, 168, 156]);
    cv.ellipse(16, 20, 13, 7, P.water);
    cv.ellipse(16, 21, 10, 5, P.waterShallow);
    cv.rect(14, 8, 4, 12, [196, 190, 178]);
    cv.ellipse(16, 12, 6, 2.5, [196, 190, 178]);
    for (const [dx, dy] of [[-4, -2], [4, -2], [-2, -5], [2, -5], [0, -7], [-6, 2], [6, 2]]) cv.set(16 + dx, 9 + dy, [214, 236, 250]);
    cv.spec = { kind: 'fountain' };
    place(cv, 71, 63, 1, { shadow: false });
  }

  // Cầu đi bộ gỗ lim: an ironwood boardwalk out over the river's edge, from
  // the south park round under Phú Xuân bridge, steps down to it at each end.
  {
    // It runs on under Phú Xuân bridge: the planks go right up to the
    // bridge on both sides, and the bridge's deck passes over them.
    for (const [x0, x1, ends] of [[57, 65, [57]], [69, 74, [74]]]) {
      plankDeck(x0, 62, x1 - x0 + 1, 1, true);
      for (const x of ends) plankDeck(x, 63, 1, 1);
      for (let x = x0 * T; x < (x1 + 1) * T; x += 3 * T) {
        ground.rect(x, 62 * T - 4, 1, 4, [70, 52, 40]);
        ground.rect(x - 1, 62 * T - 6, 3, 2, [255, 226, 160]);
        glow(x, 62 * T - 5, [255, 214, 140], 2);
      }
      drawn.push({ type: 'boardwalk', x: x0 * T, y: 62 * T, w: (x1 - x0 + 1) * T, h: T });
    }
  }
}
