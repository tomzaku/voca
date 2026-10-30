// The ground everything stands on: grass, a deeper green in the hills.

import { hash, mix, noise } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { ground } from '../core/world.mjs';
import { cliff, height, level, light, TREELINE } from '../hills.mjs';
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

/** The hills: grass deepening as the land rises and brightening terrace by
 *  terrace, lit on the slopes that face the north-west and shaded on the
 *  others; the cliffs between terraces — rock face, a lip of grass along the
 *  top, a shadow at the foot; above the tree line bare rock. */
export function hillTint(c, x, y) {
  const h = height(x, y);
  if (h <= 0.01) return mix(c, [72, 134, 58], 0.3);
  const lv = level(x, y);
  c = mix(c, [64, 120, 54], 0.3);
  c = mix(c, [150, 196, 104], Math.min(0.5, lv * 0.11));
  const l = light(x, y);
  c = l > 0 ? mix(c, [168, 206, 120], l * 0.3) : mix(c, [28, 60, 40], -l * 0.35);
  if (h > TREELINE) {
    const rock = mix([156, 146, 128], [124, 116, 104], noise(x, y, 5));
    c = mix(rock, l > 0 ? [200, 192, 176] : [92, 86, 78], Math.abs(l) * 0.4);
  }
  const cl = cliff(x, y);
  if (cl?.face !== undefined) {
    // The rock face: weathered stone in vertical runs, darker towards the foot.
    const run = Math.floor(x / 5) + Math.floor(noise(x, y, 6) * 3);
    c = mix(run % 3 === 0 ? [120, 106, 90] : [146, 130, 110], [66, 58, 50], cl.face * 0.7);
    if (Math.floor(x) % 5 === 0) c = mix(c, [56, 50, 44], 0.55);                 // cracks
    if (cl.face < 0.12) c = [176, 162, 140];                                    // the lit top edge
    if (cl.face > 0.9) c = mix(c, [40, 36, 32], 0.4);
  } else if (cl?.shadow) c = mix(c, [20, 40, 30], cl.shadow * 0.45);
  else if (cl?.lip) c = mix(c, [60, 104, 52], 0.7);
  return c;
}

export function paintGrass() {
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) ground.set(x, y, grassColor(x, y));
}
