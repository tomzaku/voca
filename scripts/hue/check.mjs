// Sanity checks, failing the run (exit code 1) with what's wrong:
//   - the spawn and every keeper can be walked to from the spawn, and none
//     stands on something built;
//   - every named place can be walked near enough to light its label (the
//     check that would have caught Hồ Tịnh Tâm sealed in by the theatre);
//   - every label on show names the place whose story it tells;
//   - nothing that blocks stands on a road (a tree on a path, say).
// `seen` (the tiles you can walk to) also feeds the preview's cut-off tint.

import { solid } from './core/world.mjs';
import { walls } from './collision.mjs';
import { ROADS, roadHit } from './roads.mjs';
import { H, SPAWN, T, W } from './layout.mjs';
import { objects } from './meta.mjs';

export const seen = new Uint8Array(W * H);

/** How near (tiles) the buddy must come for a label to light — WorldScene's
 *  PLACE_REACH, 170 screen px at 2×, less a little for the buddy's own size. */
const LABEL_REACH = 5;

const props = (o) => Object.fromEntries(o.properties.map((p) => [p.name, p.value]));
const where = (o) => `tile ${Math.floor(o.x / T)},${Math.floor(o.y / T)}`;

export function checkReach() {
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

  const problems = [];
  for (const o of objects) {
    const p = props(o);
    if (o.type === 'station' || o.type === 'spawn') {
      const tx = Math.floor(o.x / T), ty = Math.floor(o.y / T);
      if (!seen[ty * W + tx]) problems.push(`unreachable ${o.type} at ${where(o)} (${p.feature ?? ''})`);
      if (solid[ty][tx]) problems.push(`${o.type} at ${where(o)} (${p.feature ?? ''}) stands on something built`);
    }
    if (o.type === 'label' && p.hidden !== 'true') {
      if (!p.place) problems.push(`label "${p.text}" at ${where(o)} names no place`);
      // The label's centre: it's placed by its left edge, a character about a
      // fifth of a tile wide.
      const cx = o.x / T + p.text.length * 0.095, cy = o.y / T;
      let near = false;
      for (let ty = Math.floor(cy - LABEL_REACH); ty <= cy + LABEL_REACH && !near; ty++) {
        for (let tx = Math.floor(cx - LABEL_REACH); tx <= cx + LABEL_REACH && !near; tx++) {
          if (tx < 0 || ty < 0 || tx >= W || ty >= H || !seen[ty * W + tx]) continue;
          near = Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) <= LABEL_REACH;
        }
      }
      if (!near) problems.push(`can't walk near enough to "${p.text}" (${where(o)}) to light it`);
    }
  }
  // Nothing solid on a road: a blocked tile any real part of which a road
  // covers (courts excepted — things are meant to stand on them).
  const SAMPLES = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (!solid[ty][tx]) continue;
    const on = ROADS.find((r) => !r.court && SAMPLES.some(([sx, sy]) => roadHit(r, (tx + sx) * T, (ty + sy) * T)));
    if (on) problems.push(`tile ${tx},${ty} blocks a ${on.kind} at (${on.points[0].join(', ')}…)`);
  }
  if (problems.length) {
    for (const m of problems) console.error(m);
    process.exitCode = 1;
  }
}
