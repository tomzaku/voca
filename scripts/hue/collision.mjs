// The collision grid: a tile blocks if a third of it is water (unless it's a deck), or if
// something was built on it.

import { deck, solid } from './core/world.mjs';
import { H, T, W } from './layout.mjs';
import { wet } from './paint/water.mjs';

export const walls = new Array(W * H).fill(0);

export function buildWalls() {
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      let wetPx = 0;
      for (let y = 0; y < T; y += 2) for (let x = 0; x < T; x += 2) if (wet(tx * T + x, ty * T + y)) wetPx++;
      const blocked = solid[ty][tx] || (!deck[ty][tx] && wetPx >= 64 / 3);
      walls[ty * W + tx] = blocked ? 1 : 0;
    }
  }
}
