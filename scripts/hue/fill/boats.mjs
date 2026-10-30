// Boats on the Hương: sampans with their woven hoods, and a dragon boat or
// two — kept clear of the bridges, the wharf and the islets.

import { rand } from '../core/canvas.mjs';
import { P, ROOF } from '../core/palette.mjs';
import { ground } from '../core/world.mjs';
import { ISLETS, RIVER_BRIDGES, T, isWater, isletE } from '../layout.mjs';

export const BOATS = [];

export function launchBoats() {
  {
    const sampan = (bx, by, flip) => {
      const w = 26;
      for (let x = 0; x < w; x++) {
        const taper = x < 4 ? 4 - x : x > w - 5 ? x - (w - 5) : 0;
        for (let y = 3 + Math.floor(taper / 2); y < 8; y++) ground.set(bx + x, by + y, y > 6 ? [92, 60, 40] : [138, 96, 62]);
      }
      const hx = flip ? 4 : 10;
      for (let x = hx; x < hx + 12; x++) for (let y = 0; y < 4; y++) ground.set(bx + x, by + y, (x + y) % 3 ? [116, 86, 56] : [92, 66, 44]);
      ground.rect(bx + 2, by + 9, w - 4, 1, P.shadow, 0.25);
    };
    const dragon = (bx, by) => {
      const w = 40;
      for (let x = 0; x < w; x++) for (let y = 3; y < 9; y++) ground.set(bx + x, by + y, y > 7 ? [120, 40, 32] : y > 5 ? [196, 160, 64] : [186, 54, 42]);
      ground.rect(bx + 10, by, 20, 4, [150, 44, 36]);
      for (let x = 9; x < 31; x++) ground.set(bx + x, by - 1, ROOF.imperial.base);
      ground.rect(bx - 4, by + 1, 5, 4, [196, 160, 64]);        // head
      ground.set(bx - 3, by + 2, [40, 30, 30]);
      ground.rect(bx + w, by + 2, 3, 3, [196, 160, 64]);       // tail
      ground.rect(bx + 2, by + 10, w - 4, 1, P.shadow, 0.25);
    };
    const clear = (tx, ty, w) =>
      !RIVER_BRIDGES.some(([a, b]) => tx + w > a - 2 && tx < b + 2)
      && !(tx + w > 40 && tx < 61)                                       // the wharf and the landing
      && !ISLETS.some((i) => isletE(i, tx * T, ty * T) < 2.5 || isletE(i, (tx + w) * T, ty * T) < 2.5)
      && [0, 0.5, 1].every((f) => [-T, 0, T].every((dy) => isWater((tx + w * f) * T, ty * T + dy)))
      && !BOATS.some(([x, y, bw]) => Math.abs(y - ty) < 2 && tx < x + bw + 2 && tx + w > x - 2);
    for (let i = 0; i < 400 && BOATS.length < 14; i++) {
      const big = BOATS.length % 5 === 4;
      const w = big ? 3 : 2;
      const tx = 2 + rand() * 92, ty = 52.8 + rand() * 6;
      if (!clear(tx, ty, w)) continue;
      if (big) dragon(tx * T, ty * T); else sampan(tx * T, ty * T, rand() < 0.5);
      BOATS.push([tx, ty, w]);
    }
  }
}
