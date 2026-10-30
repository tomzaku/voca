// High-detail patches: parts of the map drawn a second time at twice the
// resolution, which the game lays over the ordinary map in the same place —
// the walls and paths are the map's own, only the drawing is finer.
//
// A patch starts from the map's pixels, enlarged. Then the ground — grass,
// roads, water — is shaded afresh at the finer size, and the things that
// have detailed art (./art.mjs: houses, the market, trees, lamps, parked
// bikes) are lifted out and drawn again in detail. Anything without its own
// art yet stays as the enlarged map shows it.

import { Canvas, hash, mix, noise } from '../core/canvas.mjs';
import { P, STREET } from '../core/palette.mjs';
import { drawn, ground, over } from '../core/world.mjs';
import { T, isWater } from '../layout.mjs';
import { shade } from '../paint/roads.mjs';
import { shoreDist } from '../paint/water.mjs';
import { ROADS, roadHit } from '../roads.mjs';
import { K, bicycle, cyclo, house, lamp, market, tree } from './art.mjs';

/** The patches, in tiles. */
export const DETAIL = [
  { key: 'dongba', x0: 80, y0: 30, x1: 100, y1: 52 },
];

const GRASS = [P.grass, P.grassLight, P.grassDark, P.fleckLight, P.fleckDark].map((c) => c.join());
const same = (d, i, c) => d[i] === c[0] && d[i + 1] === c[1] && d[i + 2] === c[2];

/** Grass at detail size: three greens, blades, the odd flower. */
function grassAt(X, Y) {
  const n = noise(X, Y, 22) * 0.6 + noise(X, Y, 7) * 0.4;
  let c = n < 0.4 ? [102, 162, 72] : n > 0.62 ? [122, 182, 84] : [112, 172, 78];
  const h = hash(X, Y);
  if (h < 0.03) c = [86, 144, 62];
  else if (h < 0.045) c = [146, 198, 104];
  if (hash(X * 3 + 1, Y * 7 + 2) < 0.0025) c = [[250, 250, 240], [250, 214, 110], [236, 160, 190]][Math.floor(hash(X, Y * 5) * 3)];
  return c;
}

/** Water at detail size: shallows by the shore, fine ripples. */
function waterAt(X, Y, mx, my) {
  const d = shoreDist(Math.floor(mx), Math.floor(my));
  let c = d <= 2 ? P.waterShallow : d <= 5 ? P.water : mix(P.water, P.waterDeep, noise(X, Y, 60));
  if (d > 3 && noise(X, Y * 4, 10) > 0.8 && hash(X, Y) < 0.6) c = mix(c, P.glint, 0.6);
  return c;
}

/** A road at detail size: finer pavement slabs, asphalt grain, a crisp kerb. */
function roadAt(X, Y, mx, my) {
  let best = null;
  for (const r of ROADS) {
    const hit = roadHit(r, mx, my);
    if (!hit) continue;
    const e = (r.width * T) / 2 - Math.abs(hit.o);
    if (!best || e > best.e) best = { r, e, o: hit.o, s: hit.s };
  }
  if (!best) return null;
  const { r, e, o, s } = best;
  if (r.kind === 'street') {
    if (e < 1) return STREET.kerbShadow;
    if (e < 4) {
      const tile = hash(Math.floor(X / 6), Math.floor(Y / 6));
      return (X % 6 === 0 || Y % 6 === 0) ? STREET.pavementJoint : mix(STREET.pavement, STREET.pavementJoint, tile * 0.35);
    }
    if (e < 5) return e < 4.5 ? [242, 238, 230] : STREET.kerb;
    let c = mix(STREET.asphalt, STREET.asphaltDark, noise(X, Y, 9));
    if (hash(X, Y) < 0.06) c = STREET.asphaltSpeck;
    if (r.main && Math.abs(o) < 1 && s % 18 < 10) c = STREET.centreLine;
    return c;
  }
  if (r.kind === 'stone') {
    const row = Math.floor(Y / 16), col = Math.floor((X + (row % 2) * 8) / 16);
    if (Y % 16 === 0 || (X + (row % 2) * 8) % 16 === 0) return P.stoneJoint;
    return mix(P.stone, P.stoneJoint, hash(col, row) * 0.4 + hash(X, Y) * 0.1);
  }
  // A lane: packed earth, pebbles, soft ruts, grass growing in at the edges.
  const half = (r.width * T) / 2;
  if (e < 2.5 && noise(X, Y, 6) * (2.5 - e) > 0.9) return grassAt(X, Y);
  let c = mix(P.dirt, P.dirtSpeck, noise(X, Y, 12) * 0.6);
  const rut = Math.abs(Math.abs(o) - half * 0.4);
  if (rut < 2) c = mix(c, [166, 142, 104], 0.35 * (1 - rut / 2));
  const h = hash(X, Y);
  if (h < 0.025) c = [226, 210, 180];
  else if (h < 0.04) c = [160, 136, 100];
  if (e < 2.5 && noise(X, Y, 6) * (2.5 - e) > 0.45) c = mix(c, [102, 162, 72], 0.5);
  return c;
}

/** Lift a thing out: wherever its old pixels were, mark the patch to be
 *  shaded afresh as ground. */
function liftOut(clear, overD, W, H, ox, oy, e) {
  const { cv } = e;
  for (let j = 0; j < cv.h; j++) for (let i = 0; i < cv.w; i++) {
    if (!cv.alpha(i, j)) continue;
    for (let dy = 0; dy < K; dy++) for (let dx = 0; dx < K; dx++) {
      const X = (e.x + i - ox) * K + dx, Y = (e.y + j - oy) * K + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      clear[Y * W + X] = 1;
      if (j < e.overTo) overD[(Y * W + X) * 4 + 3] = 0;
    }
  }
}

export function renderDetail(write) {
  return DETAIL.map(({ key, x0, y0, x1, y1 }) => {
    const ox = x0 * T, oy = y0 * T;
    const W = (x1 - x0) * T * K, H = (y1 - y0) * T * K;
    const g = new Canvas(W, H), o = new Canvas(W, H);
    // The map's own pixels, enlarged.
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const s = ((oy + (Y >> 1)) * ground.w + ox + (X >> 1)) * 4, d = (Y * W + X) * 4;
      for (let k = 0; k < 4; k++) { g.d[d + k] = ground.d[s + k]; o.d[d + k] = over.d[s + k]; }
    }
    const inside = (e, w, h) => e.x + w > ox && e.x < ox + (x1 - x0) * T && e.y + h > oy && e.y < oy + (y1 - y0) * T;

    // What gets drawn again in detail.
    const redraw = [];
    for (const e of drawn) {
      if (e.type === 'structure') {
        if (!inside(e, e.cv.w, e.cv.h)) continue;
        const spec = e.cv.spec;
        const art = spec?.kind === 'market' ? market() : spec?.kind === 'hall' && spec.windows ? house(spec) : null;
        if (art) redraw.push({ e, art, bottom: e.y + e.cv.h, overTo: e.overTo });
      } else if (e.type === 'tree') {
        if (!inside(e, e.cv.w, e.cv.h)) continue;
        const art = tree(e.kind, e.cv.w, e.cv.h, e.tx * 131 + e.ty * 17);
        if (art) redraw.push({ e, art, bottom: e.y + e.cv.h, overTo: e.overTo });
      } else if (inside(e, 1, 1)) {
        redraw.push({ e, bottom: e.y });
      }
    }

    // Lift the old pixels out, then shade the ground afresh: everywhere it
    // was lifted, and every untouched pixel of plain grass, road or water.
    const clear = new Uint8Array(W * H);
    for (const { e, art } of redraw) {
      if (art) liftOut(clear, o.d, W, H, ox, oy, e);
      else {
        const [w, h, top] = e.type === 'lamp' ? [3, 13, 11] : e.type === 'bike' ? [13, 10, 9] : [19, 15, 14];
        for (let Y = (e.y - top - oy) * K; Y < (e.y - top + h - oy) * K; Y++) for (let X = (e.x - 1 - ox) * K; X < (e.x - 1 + w - ox) * K; X++) {
          if (X >= 0 && Y >= 0 && X < W && Y < H) clear[Y * W + X] = 1;
        }
      }
    }
    for (let Y = 0; Y < H; Y++) {
      for (let X = 0; X < W; X++) {
        const mx = ox + (X + 0.5) / K, my = oy + (Y + 0.5) / K;
        const i = Y * W + X, d = g.d, p = i * 4;
        const fx = Math.floor(mx), fy = Math.floor(my);
        let c = null;
        if (isWater(mx, my)) {
          if (clear[i] || (d[p + 2] > d[p] + 40 && d[p + 2] > d[p + 1])) c = waterAt(X, Y, mx, my);
        } else {
          const road = roadAt(X, Y, mx, my);
          if (road) {
            const plain = shade(fx, fy);
            // Lanes fray into the grass, so their edge pixels count as plain too.
            if (clear[i] || (plain && same(d, p, plain)) || (!plain && GRASS.includes(`${d[p]},${d[p + 1]},${d[p + 2]}`))) c = road;
          } else if (clear[i] || GRASS.includes(`${d[p]},${d[p + 1]},${d[p + 2]}`)) c = grassAt(X, Y);
        }
        if (c) g.set(X, Y, c);
      }
    }

    // The things, in detail, back to front.
    redraw.sort((a, b) => a.bottom - b.bottom);
    for (const { e, art, overTo } of redraw) {
      const X = (e.x - ox) * K, Y = (e.y - oy) * K;
      if (art) {
        g.blit(art, X, Y);
        o.blit(art, X, Y, [0, overTo * K]);
      } else if (e.type === 'lamp') lamp(g, X, Y);
      else if (e.type === 'bike') bicycle(g, X, Y, e.frame);
      else if (e.type === 'cyclo') cyclo(g, X, Y);
    }
    write(key, g, o);
    return { key, x: ox, y: oy, ground: `hue-detail-${key}-ground.png`, over: `hue-detail-${key}-over.png` };
  });
}
