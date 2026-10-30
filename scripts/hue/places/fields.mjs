// Rice fields on the flat land below the hills, west of Điện Biên Phủ and
// out towards Vỹ Dạ: paddies of standing water between raised earth bunds,
// the rice in them young, growing or ripe and golden; a scarecrow on a bund.
// The bunds are the paths through (the paddies themselves block); farmers
// in nón lá work the paddies (`farmer` points — WorldScene puts them there).

import { hash, mix, noise } from '../core/canvas.mjs';
import { drawn, ground, mark, solid, used } from '../core/world.mjs';
import { T } from '../layout.mjs';

/** The fields: [x0, y0, w, h] in tiles. */
export const FIELDS = [[1, 82, 18, 7], [94, 82, 24, 7]];
/** Where farmers work, in tiles (meta.mjs writes them). */
export const FARMERS = [];

const PLOT_W = 3, PLOT_H = 2;

/** A paddy's rice at map pixel (x, y): water between the rows of plants,
 *  `stage` 0 young, 1 growing, 2 ripe. */
function paddy(x, y, stage) {
  const water = mix([96, 150, 160], [80, 132, 146], noise(x, y, 7));
  const row = x % 3 === 1, tuft = y % 4 < (stage === 0 ? 1 : stage === 1 ? 3 : 4);
  if (!row || !tuft) return stage === 2 && y % 4 === 3 ? [176, 150, 70] : water;
  if (stage === 2) return (y + x) % 2 ? [226, 192, 84] : [204, 166, 62];
  return stage === 0 ? [132, 196, 96] : (y % 4 === 0 ? [104, 172, 74] : [82, 148, 62]);
}

export function drawFields() {
  for (const [x0, y0, w, h] of FIELDS) {
    // The bunds first, all over: packed earth, grass along their tops.
    for (let y = y0 * T; y < (y0 + h) * T; y++) for (let x = x0 * T; x < (x0 + w) * T; x++) {
      ground.set(x, y, hash(x, y) < 0.25 ? [96, 150, 70] : mix([150, 118, 80], [132, 102, 70], noise(x, y, 4)));
    }
    mark(used, x0, y0, w, h);
    // Then the paddies, each a little sunk below its bunds.
    for (let py = y0; py + PLOT_H <= y0 + h; py += PLOT_H + 1) {
      for (let px = x0 + ((py - y0) % 2); px + PLOT_W <= x0 + w; px += PLOT_W + 1) {
        const stage = Math.floor(hash(px * 3, py * 5) * 3);
        for (let y = py * T + 1; y < (py + PLOT_H) * T - 1; y++) for (let x = px * T + 1; x < (px + PLOT_W) * T - 1; x++) {
          ground.set(x, y, paddy(x, y, stage));
        }
        for (let x = px * T + 1; x < (px + PLOT_W) * T - 1; x++) ground.set(x, py * T + 1, [70, 110, 120]);   // the bund's shadow on the water
        mark(solid, px, py, PLOT_W, PLOT_H);
        drawn.push({ type: 'paddy', x: px * T + 1, y: py * T + 1, w: PLOT_W * T - 2, h: PLOT_H * T - 2, stage });
        if (hash(px, py) < 0.4) FARMERS.push([px + 1 + hash(py, px), py + 1.4]);
      }
    }
    // A scarecrow on a bund: a cross of sticks in a shirt and a nón lá.
    const sx = (x0 + 3) * T + 8, sy = (y0 + PLOT_H) * T + 12;
    ground.rect(sx, sy - 14, 1, 14, [110, 80, 50]);
    ground.rect(sx - 5, sy - 11, 11, 1, [110, 80, 50]);
    ground.rect(sx - 3, sy - 11, 7, 5, [176, 70, 52]);
    for (let r = 0; r < 4; r++) ground.rect(sx - r - 1, sy - 17 + r, 2 * r + 3, 1, r === 3 ? [176, 146, 92] : [222, 196, 140]);
    ground.ellipse(sx + 2, sy + 1, 4, 1, [0, 0, 0], 0.25);
  }
}
