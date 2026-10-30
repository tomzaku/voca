// The ground everything stands on: grass, a deeper green in the hills.

import { hash, mix, noise } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { ground } from '../core/world.mjs';
import { height, light, TREELINE } from '../hills.mjs';
import { HILLS_Y, PH, PW, T } from '../layout.mjs';

/** The grass at map pixel (x, y), before anything's built on it. */
export function grassColor(x, y) {
  const n = noise(x, y, 40) * 0.7 + noise(x, y, 11) * 0.3;
  let c = n < 0.38 ? P.grassDark : n > 0.62 ? P.grassLight : P.grass;
  const h = hash(x, y);
  if (h < 0.006) c = P.fleckLight;
  else if (h < 0.011) c = P.fleckDark;
  return y >= (HILLS_Y - 4) * T ? hillTint(c, x, y) : c;
}

/** The hills: grass deepening as the land rises, lit on the slopes that
 *  face the north-west and shaded on the others, contour lines where it
 *  climbs, and above the tree line bare rock and scree. */
export function hillTint(c, x, y) {
  const h = height(x, y);
  if (h <= 0.01) return mix(c, [72, 134, 58], 0.3);
  c = mix(c, [64, 120, 54], Math.min(0.6, 0.3 + h * 0.4));
  const l = light(x, y);
  c = l > 0 ? mix(c, [168, 206, 120], l * 0.45) : mix(c, [28, 60, 40], -l * 0.55);
  if (h > TREELINE - 0.08) {
    const rock = mix([150, 142, 128], [118, 112, 102], noise(x, y, 5));
    const r = mix(rock, l > 0 ? [196, 188, 172] : [88, 82, 76], Math.abs(l) * 0.5);
    c = h > TREELINE ? r : mix(c, r, (h - TREELINE + 0.08) / 0.08 * (noise(x, y, 3) > 0.4 ? 1 : 0.3));
  }
  if ((h * 10) % 1 < 0.05) c = mix(c, [40, 70, 40], 0.35);
  return c;
}

export function paintGrass() {
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) ground.set(x, y, grassColor(x, y));
}
