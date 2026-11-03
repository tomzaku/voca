// The ground everything stands on: grass, a deeper green in the hills.

import { hash, mix, noise } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { ground } from '../core/world.mjs';
import { cliff, height, level, light } from '../hills.mjs';
import { HILLS_Y, PH, PW, T } from '../layout.mjs';

/** The grass at map pixel (x, y), before anything's built on it. */
export function grassColor(x, y) {
  const n = noise(x, y, 40) * 0.7 + noise(x, y, 11) * 0.3;
  let c = n < 0.38 ? P.grassDark : n > 0.62 ? P.grassLight : P.grass;
  const h = hash(x, y);
  if (h < 0.006) c = P.fleckLight;
  else if (h < 0.011) c = P.fleckDark;
  return tinted(c, x, y);
}

/** The hills' tint over the grass at (x, y): everywhere in the range, and
 *  on Ngự Bình out in the plain, fading in at its foot. */
export function tinted(c, x, y) {
  if (y >= (HILLS_Y - 4) * T) return hillTint(c, x, y);
  const h = height(x, y);
  return h > 0.005 ? mix(c, hillTint(c, x, y), Math.min(1, h / 0.12)) : c;
}

/** The hills: the same grass, a shade cooler; and where the land steps up,
 *  a cliff — columns of sandstone, each rounded (lit on its left), split by
 *  strata and crevices and darkening to the foot, grass hanging over its
 *  lip in tufts — then the shadow it casts. Where the land steps up away
 *  from you, a band of shade. Ngự Bình's terraces are drawn the same way,
 *  shorter. */
export function hillTint(c, x, y) {
  const h = height(x, y);
  c = mix(c, [64, 124, 58], h > 0.01 ? 0.22 : 0.12);
  const l = light(x, y);
  if (l) c = l > 0 ? mix(c, [168, 206, 120], l * 0.3) : mix(c, [28, 60, 40], -l * 0.35);
  const cl = cliff(x, y);
  if (cl?.face !== undefined) {
    const down = cl.d;                                                        // 0 at the top of the face, 1 at its foot
    const col = 10, sx = x + Math.floor(noise(x, y, 16) * 5);
    const u = (((sx % col) + col) % col) / col;
    let r = mix([214, 186, 140], [158, 126, 90], u);                         // a column, lit on its left
    if (u > 0.86) r = [108, 82, 60];                                         // the crevice between columns
    const stratum = (y + Math.floor(noise(x, 0, 7) * 4)) % 8;
    if (stratum === 0) r = mix(r, [116, 88, 62], 0.55);
    else if (stratum === 1) r = mix(r, [236, 214, 176], 0.25);
    if (hash(x, y) < 0.03) r = mix(r, [96, 72, 52], 0.5);
    r = mix(r, [74, 54, 40], down * 0.5);
    // Grass hanging over the lip, in tufts of uneven length, outlined.
    const tuft = 3 + Math.floor(noise(x, 1, 4) * 7);
    const px = down * 26;
    if (px < tuft - 1) r = px < 2 ? [104, 168, 80] : [72, 136, 64];
    else if (px < tuft) r = [36, 74, 44];
    return r;
  }
  if (cl?.shadow) return mix(c, [20, 40, 30], cl.shadow * 0.5);
  if (cl?.lip) return mix(c, [118, 180, 88], 0.6);                           // the lit edge of the top
  if (cl?.back) return mix(c, [30, 64, 40], cl.back * 0.3);
  return c;
}

export function paintGrass() {
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) ground.set(x, y, grassColor(x, y));
}
