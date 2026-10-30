// Water: the river, canals, moats and lakes — shallows, the stone
// embankment, glints and lotus.

import { hash, mix, noise, rand } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { drawn, ground } from '../core/world.mjs';
import { PH, PW, inLake, inMoat, isWater } from '../layout.mjs';

export const waterMask = new Uint8Array(PW * PH);
export const wet = (x, y) => x >= 0 && y >= 0 && x < PW && y < PH && waterMask[y * PW + x] === 1;
/** Distance (px, capped) to the nearest dry pixel — drives the shallows. */
export const shoreDist = (x, y, cap = 6) => {
  for (let r = 1; r <= cap; r++) {
    if (!wet(x - r, y) || !wet(x + r, y) || !wet(x, y - r) || !wet(x, y + r)) return r;
  }
  return cap + 1;
};

// Lotus: pads and a few pink flowers on the moat, the ponds and Tịnh Tâm.
export const lotusAt = (x, y) => {
  ground.ellipse(x, y, 3, 2, rand() < 0.5 ? P.lotusPad : P.lotusPad2);
  ground.set(x + 1, y - 1, P.fleckDark);
  const flower = rand() < 0.35;
  if (flower) { ground.rect(x - 1, y - 2, 2, 2, P.lotus); ground.set(x, y - 3, [250, 196, 210]); }
  drawn.push({ type: 'lotus', x, y, flower });
};

export function paintWater() {
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (isWater(x + 0.5, y + 0.5)) waterMask[y * PW + x] = 1;
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      if (!wet(x, y)) continue;
      const d = shoreDist(x, y);
      let c = d <= 2 ? P.waterShallow : d <= 5 ? P.water : mix(P.water, P.waterDeep, noise(x, y, 30));
      ground.set(x, y, c);
    }
  }
  // Embankment: a stone lip on every dry pixel touching water, darker below.
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      if (wet(x, y)) continue;
      const near = wet(x, y + 1) || wet(x, y - 1) || wet(x + 1, y) || wet(x - 1, y);
      const near2 = wet(x, y + 2) || wet(x, y - 2) || wet(x + 2, y) || wet(x - 2, y);
      if (near) ground.set(x, y, wet(x, y + 1) ? P.embankDark : P.embank);
      else if (near2) ground.set(x, y, P.embank, 0.6);
    }
  }
  // A few slow glints — sparse, so the water reads as calm.
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rand() * PW), y = Math.floor(rand() * PH);
    const len = 3 + Math.floor(rand() * 5);
    if (!wet(x, y) || !wet(x + len, y) || shoreDist(x, y) < 4) continue;
    for (let k = 0; k < len; k++) ground.set(x + k, y, P.glint, k === 0 || k === len - 1 ? 0.4 : 0.75);
  }
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(rand() * PW), y = Math.floor(rand() * PH);
    if (!(inMoat(x, y) || inLake(x, y)) || shoreDist(x, y, 4) < 3) continue;
    if (hash(Math.floor(x / 20), Math.floor(y / 20)) < 0.45) continue; // clumps, not carpet
    if (rand() < 0.25) lotusAt(x, y);
  }
}
