// Sanity: every keeper and the spawn reachable from the spawn. `seen` (the
// tiles you can walk to) also feeds the preview's cut-off tint.

import { walls } from './collision.mjs';
import { H, SPAWN, T, W } from './layout.mjs';
import { objects } from './meta.mjs';

export const seen = new Uint8Array(W * H);

export function checkReach() {
  {
    const sx = Math.floor(SPAWN[0]), sy = Math.floor(SPAWN[1]);
    const q = [[sx, sy]];
    seen[sy * W + sx] = 1;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || walls[ny * W + nx]) continue;
        seen[ny * W + nx] = 1;
        q.push([nx, ny]);
      }
    }
    const bad = objects.filter((o) => o.type === 'station' || o.type === 'spawn').filter((o) => {
      const tx = Math.floor(o.x / T), ty = Math.floor(o.y / T);
      return !seen[ty * W + tx];
    });
    if (bad.length) {
      for (const o of bad) console.error(`unreachable ${o.type} at tile ${Math.floor(o.x / T)},${Math.floor(o.y / T)}`, o.properties.map((p) => `${p.name}=${p.value}`).join(' '));
      process.exitCode = 1;
    }
  }
}
