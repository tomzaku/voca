// The falls in the tomb hills: the stream out of the mesa's pool pours over
// two cliffs (paint/water.mjs draws the falling water) and runs south under
// the tombs' road — here, the rope bridge that carries the road over it, and
// mossy boulders round the pools.

import { hash, mix } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { deck, ground, mark, solid } from '../core/world.mjs';
import { STREAM_HW, T, isWater, nearest, STREAM } from '../layout.mjs';
import { ROADS, roadHit } from '../roads.mjs';

/** A boulder: a rounded stone lit from the left, moss on its crown. */
function boulder(x, y, r) {
  ground.ellipse(x + 1, y + r * 0.6, r + 1, r * 0.45, P.shadow, 0.35);
  ground.ellipse(x, y, r + 1, r * 0.8 + 1, [52, 54, 52]);
  ground.ellipse(x, y, r, r * 0.8, [128, 130, 122]);
  ground.ellipse(x - r * 0.3, y - r * 0.25, r * 0.55, r * 0.4, [172, 174, 164]);
  ground.ellipse(x, y - r * 0.55, r * 0.6, r * 0.25, [86, 140, 70]);
}

/** A wooden bridge on ropes, `x0`–`x1` px across the stream, from `y0` to
 *  `y1` px (the road's width): planks laid across the way, each its own
 *  shade, posts at the corners and a rope rail sagging between them. */
function ropeBridge(x0, x1, y0, y1) {
  for (let x = x0; x < x1; x++) {
    const plank = Math.floor((x - x0) / 4), t = hash(plank, 3);
    for (let y = y0 + 2; y < y1 - 2; y++) {
      let c = mix([156, 110, 68], [124, 84, 52], t);
      if ((x - x0) % 4 === 3) c = [72, 48, 32];                                   // the gap between planks
      else if (y === y0 + 2) c = mix(c, [200, 156, 104], 0.5);
      if (hash(x, y) < 0.04) c = mix(c, [84, 56, 36], 0.5);                       // grain
      ground.set(x, y, c);
    }
    // The rope rails, sagging to the middle, a shadow under the south one.
    const sag = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 2);
    ground.set(x, y0 + sag, [196, 168, 118]); ground.set(x, y0 + sag + 1, [120, 96, 64]);
    ground.set(x, y1 - 3 + sag, [196, 168, 118]); ground.set(x, y1 - 2 + sag, [120, 96, 64]);
    ground.set(x, y1 + 1, P.shadow, 0.4);
  }
  for (const px of [x0 - 1, x1 - 2]) for (const py of [y0 - 3, y1 - 6]) {
    ground.rect(px, py, 3, 7, [84, 56, 36]);
    ground.rect(px, py, 1, 7, [140, 100, 64]);
    ground.rect(px - 1, py - 1, 5, 2, [64, 42, 28]);
  }
}

export function drawFalls() {
  // Where the stream passes under the tombs' road: the road's band across it.
  const road = ROADS.find((r) => r.kind === 'mountain' && r.points.length > 60 && roadHit(r, 53.5 * T, 116.4 * T));
  if (road) {
    const cx = nearest(STREAM, 53.5 * T, 116.4 * T);
    let y0 = Infinity, y1 = -Infinity;
    for (let y = 112 * T; y < 120 * T; y++) if (roadHit(road, 53.5 * T, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const x0 = Math.floor(53.5 * T - STREAM_HW - 4 + (cx.d ? 0 : 0)), x1 = Math.ceil(53.5 * T + STREAM_HW + 4);
    ropeBridge(x0, x1, y0, y1 + 1);
    const tx0 = Math.floor(x0 / T), tx1 = Math.floor((x1 - 1) / T), ty0 = Math.floor(y0 / T), ty1 = Math.floor(y1 / T);
    mark(deck, tx0, ty0, tx1 - tx0 + 1, ty1 - ty0 + 1);
  }
  // Boulders round the pools and down the stream's banks.
  for (const [x, y, r] of [[49.6, 96.6, 5], [57.6, 98.2, 4], [56.9, 95.9, 3], [49.4, 106.8, 5], [57.7, 107.9, 4], [51.4, 112.6, 3], [55.9, 113.2, 4], [51.6, 118.8, 3]]) {
    if (isWater(x * T, y * T)) continue;
    boulder(x * T, y * T, r);
    solid[Math.floor(y)][Math.floor(x)] = true;
  }
}
