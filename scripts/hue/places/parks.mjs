// The riverside parks: the long lawns between the Hương and the streets on
// both banks — Lê Duẩn's on the north, Lê Lợi's on the south — with their
// winding paths (../roads.mjs PARK_PATHS), flower beds, benches and lamps;
// Cầu bán nguyệt, the half-moon bridge over the north park's pond; Đài phun
// nước, the fountain in the south park; and Cầu đi bộ gỗ lim, the ironwood
// boardwalk along the south bank, under Phú Xuân bridge.

import { Canvas, hash } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { drawn, glow, ground, mark, place, used } from '../core/world.mjs';
import { archBridge, plankDeck } from '../draw/buildings.mjs';
import { T } from '../layout.mjs';
import { PARK_PATHS } from '../roads.mjs';

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Cầu bán nguyệt', x: 41, y: 50.2, place: 'banNguyet' },
  { text: 'Đài phun nước', x: 72, y: 56.4, place: 'phunNuoc' },
  { text: 'Cầu đi bộ gỗ lim', x: 61.5, y: 55.6, place: 'goLim' },
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
  // Along each path, by turns: a flower bed, a bench, a lamp — on the path's
  // landward side, clear of the water.
  for (const [x0, x1, y] of PARK_PATHS) {
    const north = y < 54;
    for (let x = x0 + 1.5, i = 0; x < x1 - 1; x += 2.5, i++) {
      const px = Math.round(x * T), py = Math.round((y + Math.sin(x * 0.7) * 0.3) * T) + (north ? -11 : 12);
      if (i % 3 === 0) flowerBed(px, py);
      else if (i % 3 === 1) bench(px, py + (north ? 2 : -2));
      else parkLamp(px, py);
    }
  }

  // Cầu bán nguyệt: the half-moon bridge, carrying the north path over its pond.
  archBridge(40, 50, 2, 2, 'ew');

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
    place(cv, 71, 56, 1, { shadow: false });
  }

  // Cầu đi bộ gỗ lim: an ironwood boardwalk out over the river's edge, from
  // the south park round under Phú Xuân bridge, steps down to it at each end.
  {
    const x0 = 57, x1 = 74;
    plankDeck(x0, 55, x1 - x0 + 1, 1, true);
    for (const x of [x0, x1]) plankDeck(x, 56, 1, 1);
    for (let x = x0 * T; x < (x1 + 1) * T; x += 3 * T) {
      ground.rect(x, 55 * T - 4, 1, 4, [70, 52, 40]);
      ground.rect(x - 1, 55 * T - 6, 3, 2, [255, 226, 160]);
      glow(x, 55 * T - 5, [255, 214, 140], 2);
    }
    drawn.push({ type: 'boardwalk', x: x0 * T, y: 55 * T, w: (x1 - x0 + 1) * T, h: T });
  }
}
