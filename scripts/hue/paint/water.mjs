// Water: the river, canals, moats and lakes — and lotus. Drawn to show its
// depth from above: a dark line where the bank meets it, a ring of foam,
// a wide band of bright shallows that deepens towards the middle, the
// surface flecked with light. The banks are earth, a lip of soil over the
// water; only the Citadel's moat keeps a dressed-stone embankment.

import { hash, mix, noise, rand } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { drawn, ground } from '../core/world.mjs';
import { cliff } from '../hills.mjs';
import { PH, PW, inLake, inMoat, isWater } from '../layout.mjs';

/** The water's tones, shore to middle; the detailed patches repaint any
 *  pixel still one of these. */
export const WATER = {
  foam: [222, 244, 246], lip: [148, 214, 230], shallow: [104, 196, 224], shallow2: [90, 182, 216],
  mid: [60, 150, 206], deep: [44, 122, 188], deeper: [34, 102, 168], fleck: [214, 240, 250],
};

/** The colour of water `d` px from the shore at (x, y); `k` px to a map px
 *  at the resolution drawing it. */
export function waterTone(x, y, d, k = 1) {
  if (d <= 1) return noise(x, y, 4 * k) > 0.3 ? WATER.foam : WATER.lip;
  if (d <= 2) return WATER.lip;
  if (d <= 5) return (Math.floor(x / k) + Math.floor(y / k)) % 2 && d === 5 ? WATER.mid : hash(x, y) < 0.5 ? WATER.shallow : WATER.shallow2;
  let c = d <= 8 ? WATER.mid : mix(WATER.deep, WATER.deeper, Math.min(1, (d - 9) / 6) * 0.6 + noise(x, y, 40 * k) * 0.4);
  if (d > 5 && hash(x, y) < 0.012) c = WATER.fleck;
  else if (d > 5 && noise(x, y * 4, 7 * k) > 0.86) c = mix(c, WATER.fleck, 0.22);   // ripples, sparse
  return c;
}

export const waterMask = new Uint8Array(PW * PH);
export const wet = (x, y) => x >= 0 && y >= 0 && x < PW && y < PH && waterMask[y * PW + x] === 1;
/** Distance (px, capped) to the nearest dry pixel — drives the shallows. */
export const shoreDist = (x, y, cap = 16) => {
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

/** Water falling down a cliff face: streaks of white and pale blue, broken
 *  as it falls (`down` 0 at the lip, 1 at the foot), a dark lip where it
 *  leaves the top. */
function fallColor(x, y, down, k) {
  if (down < 0.06) return [44, 120, 170];
  const streak = noise(x * 3, y * 0.25, 5 * k);
  const c = streak > 0.62 ? [244, 252, 255] : streak > 0.38 ? [178, 228, 244] : [110, 190, 228];
  return down > 0.85 && hash(x, y) < 0.5 ? [236, 248, 252] : c;
}

/** The colour of the water at (X, Y) — map px (mx, my), `k` px to one: a
 *  waterfall where it pours down a cliff, white water churning at the foot,
 *  else the shore-to-middle tones. */
export function waterColor(X, Y, mx, my, k = 1) {
  const cl = cliff(mx, my);
  if (cl?.face !== undefined) return fallColor(X, Y, cl.d, k);
  if (cl?.shadow) return noise(X, Y, 3 * k) > 0.35 ? WATER.foam : WATER.lip;
  return waterTone(X, Y, shoreDist(Math.floor(mx), Math.floor(my)), k);
}

export function paintWater() {
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (isWater(x + 0.5, y + 0.5)) waterMask[y * PW + x] = 1;
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      if (!wet(x, y)) continue;
      ground.set(x, y, waterColor(x, y, x, y));
    }
  }
  // The bank: a dark line where it meets the water; above the water (the
  // bank's face, towards you) a lip of soil; the moat's dressed stone.
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      if (wet(x, y)) continue;
      const near = wet(x, y + 1) || wet(x, y - 1) || wet(x + 1, y) || wet(x - 1, y);
      const near2 = wet(x, y + 2) || wet(x, y - 2) || wet(x + 2, y) || wet(x - 2, y);
      const below = wet(x, y + 1) || wet(x, y + 2) || wet(x, y + 3);
      if (inMoat(x, y + 2) || inMoat(x, y - 2) || inMoat(x + 2, y) || inMoat(x - 2, y)) {
        if (near) ground.set(x, y, wet(x, y + 1) ? P.embankDark : P.embank);
        else if (near2) ground.set(x, y, P.embank, 0.6);
        continue;
      }
      if (near) ground.set(x, y, [34, 56, 66]);
      else if (below) ground.set(x, y, wet(x, y + 2) ? [104, 74, 50] : [134, 98, 64]);
      else if (near2) ground.set(x, y, [70, 112, 56]);
    }
  }
  // A few slow glints — sparse, so the water reads as calm.
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rand() * PW), y = Math.floor(rand() * PH);
    const len = 3 + Math.floor(rand() * 5);
    if (!wet(x, y) || !wet(x + len, y) || shoreDist(x, y) < 7) continue;
    for (let k = 0; k < len; k++) ground.set(x + k, y, WATER.fleck, k === 0 || k === len - 1 ? 0.5 : 0.85);
  }
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(rand() * PW), y = Math.floor(rand() * PH);
    if (!(inMoat(x, y) || inLake(x, y)) || shoreDist(x, y, 4) < 3) continue;
    if (hash(Math.floor(x / 20), Math.floor(y / 20)) < 0.45) continue; // clumps, not carpet
    if (rand() < 0.25) lotusAt(x, y);
  }
}
