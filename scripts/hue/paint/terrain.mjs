// The ground everything stands on: grass, a deeper green in the hills.

import { hash, mix, noise } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { ground } from '../core/world.mjs';
import { HILLS_Y, PH, PW, T } from '../layout.mjs';

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
