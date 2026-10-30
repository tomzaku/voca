// The ground everything stands on: grass (deeper green in the hills) and the
// paved roads.

import { hash, mix, noise } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { ground, mark, used } from '../core/world.mjs';
import { HILLS_Y, PH, PW, ROADS, T } from '../layout.mjs';

export function paintGrass() {
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const n = noise(x, y, 40) * 0.7 + noise(x, y, 11) * 0.3;
      let c = n < 0.38 ? P.grassDark : n > 0.62 ? P.grassLight : P.grass;
      const h = hash(x, y);
      if (h < 0.006) c = P.fleckLight;
      else if (h < 0.011) c = P.fleckDark;
      if (y >= HILLS_Y * T) {
        // The hills: a deeper green, with faint contour lines where the land rises.
        const lift = noise(x, y, 90);
        c = mix(c, [72, 134, 58], 0.35 + lift * 0.2);
        if ((lift * 9) % 1 < 0.05) c = mix(c, [58, 112, 48], 0.6);
      }
      ground.set(x, y, c);
    }
  }
}

export const paintRoad = (tx, ty, tw, th, mat) => {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let c;
      if (mat === 'stone') {
        const joint = (y % 8 === 0) || ((x + (Math.floor(y / 8) % 2) * 6) % 12 === 0);
        c = joint ? P.stoneJoint : mix(P.stone, P.stoneJoint, hash(x, y) * 0.25);
      } else {
        c = hash(x, y) < 0.05 ? P.dirtSpeck : mix(P.dirt, P.dirtSpeck, noise(x, y, 6) * 0.5);
      }
      ground.set(x, y, c);
    }
  }
};

export function paintRoads() {
  for (const [x, y, w, h] of ROADS) mark(used, x - 1, y - 1, w + 2, h + 2);
  for (const r of ROADS) paintRoad(...r);
  // Soft edges where a road meets grass: one darker pixel line.
  {
    const roadMask = new Uint8Array(PW * PH);
    for (const [tx, ty, tw, th] of ROADS) {
      for (let y = ty * T; y < (ty + th) * T; y++) for (let x = tx * T; x < (tx + tw) * T; x++) roadMask[y * PW + x] = 1;
    }
    for (let y = 1; y < PH - 1; y++) {
      for (let x = 1; x < PW - 1; x++) {
        if (!roadMask[y * PW + x]) continue;
        if (!roadMask[y * PW + x - 1] || !roadMask[y * PW + x + 1] || !roadMask[(y - 1) * PW + x] || !roadMask[(y + 1) * PW + x]) {
          ground.set(x, y, P.dirtEdge, 0.7);
        }
      }
    }
  }
}
