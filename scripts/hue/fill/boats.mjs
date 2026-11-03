// The boats that used to sit moored at random on the Hương — gone, since
// they never moved. Their spots are still drawn from the shared random stream
// in the same order, so everything placed after them (the trees, the
// lanterns) stays exactly where it was. The dragon boat at its wharf is
// drawn with the river (../places/river.mjs).

import { rand } from '../core/canvas.mjs';
import { deck } from '../core/world.mjs';
import { ISLETS, RIVER_BRIDGES, T, isWater, isletE } from '../layout.mjs';

export function skipBoats() {
  const picked = [];
  const clear = (tx, ty, w) =>
    !RIVER_BRIDGES.some(([a, b]) => tx + w > a - 2 && tx < b + 2)
    && !(tx + w > 40 && tx < 61)
    && !ISLETS.some((i) => isletE(i, tx * T, ty * T) < 2.5 || isletE(i, (tx + w) * T, ty * T) < 2.5)
    && [0, 0.5, 1].every((f) => [-T, 0, T].every((dy) => isWater((tx + w * f) * T, ty * T + dy)))
    && ![Math.floor(ty), Math.floor(ty + 0.7)].some((y) => [0, 0.5, 1].some((f) => deck[y]?.[Math.floor(tx + w * f)]))
    && !picked.some(([x, y, bw]) => Math.abs(y - ty) < 2 && tx < x + bw + 2 && tx + w > x - 2);
  for (let i = 0; i < 400 && picked.length < 14; i++) {
    const big = picked.length % 5 === 4;
    const w = big ? 3 : 2;
    const tx = 2 + rand() * 92, ty = 55.8 + rand() * 6;
    if (!clear(tx, ty, w)) continue;
    if (!big) rand();   // which way a sampan faced
    picked.push([tx, ty, w]);
  }
}
