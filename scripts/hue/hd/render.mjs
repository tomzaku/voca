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
import { cliff as cliffAt } from '../hills.mjs';
import { H as MAP_H, HILLS_Y, T, W as MAP_W, isWater } from '../layout.mjs';
import { grassColor, hillTint } from '../paint/terrain.mjs';
import { shade } from '../paint/roads.mjs';
import { shoreDist } from '../paint/water.mjs';
import { ROADS, roadHit } from '../roads.mjs';
import { K, bench, bicycle, boardwalk, cyclo, flowerBed, fountain, dragonBoat, forestCanopy, halfMoon, house, kyDai, ladder, lamp, market, paddy, parkLamp, sampan, tree, truongTienDeck, wallTile } from './art.mjs';
import { anDinh, cheStall, gaHue, gardenHouse, gateTower, hienLam, ngoMon, nghenhLuong, phuVanLau, quocHoc, sideGateTower, stele, tangThuLau, thaiHoa, thienMuHall, thienMuTower, vanMieu } from './landmarks.mjs';
import { biDinh, biDinhKhaiDinh, biDinhMinhMang, daiHongMon, grave, minhLau, obelisk, thienDinh, tombGate, tombHall, xungKhiem } from './tombs.mjs';
import { canChanh, causeway, daiCungMon, dienTho, duyetThiDuong, lotus, sideHall, thaiMieu, theMieu, tinhTamPavilion, truongSanh } from './imperial.mjs';

/** The buildings with detailed art of their own, by the name their canvas
 *  carries (cv.spec.kind); other halls with windows are drawn as houses. */
/** A ladder's repeating rows (one rung's worth). */
const LADDER = ladder(6);

const BUILDINGS = {
  ngoMon, thaiHoa, hienLam, thienMuTower, thienMuHall, vanMieu, stele, tangThuLau,
  gaHue, quocHoc, anDinh, gateTower, sideGateTower, phuVanLau, nghenhLuong, cheStall,
  biDinh, biDinhKhaiDinh, biDinhMinhMang, daiHongMon, grave, minhLau, thienDinh, tombGate, xungKhiem,
  market, kyDai, fountain, halfMoon, theMieu, thaiMieu, dienTho, truongSanh, canChanh, sideHall, daiCungMon, duyetThiDuong, tinhTamPavilion };

/** The patches, in tiles: the whole map, in pieces small enough for any
 *  GPU's largest texture (40 × 41 tiles is 1280 × 1312 px). */
const PATCH_W = 40, PATCH_H = 41;
export const DETAIL = [];
for (let y0 = 0; y0 < MAP_H; y0 += PATCH_H) {
  for (let x0 = 0; x0 < MAP_W; x0 += PATCH_W) {
    DETAIL.push({ key: `${x0 / PATCH_W}-${y0 / PATCH_H}`, x0, y0, x1: Math.min(MAP_W, x0 + PATCH_W), y1: Math.min(MAP_H, y0 + PATCH_H) });
  }
}

const same = (d, i, c) => d[i] === c[0] && d[i + 1] === c[1] && d[i + 2] === c[2];

/** Grass at detail size: three greens, blades, the odd flower; the hills'
 *  tint over it below the city. */
function grassAt(X, Y, mx, my) {
  const c = flatGrassAt(X, Y);
  return my >= (HILLS_Y - 4) * T ? hillTint(c, mx, my) : c;
}
function flatGrassAt(X, Y) {
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
function roadAt(X, Y, mx, my, roads) {
  let best = null;
  for (const r of roads) {
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
  if (r.kind === 'path') {
    if (e < 1) return [184, 168, 136];
    const h = hash(X, Y);
    return h < 0.16 ? [200, 186, 156] : h < 0.22 ? [244, 236, 220] : mix([222, 210, 182], [212, 198, 168], noise(X, Y, 6));
  }
  if (r.kind === 'stone') {
    if (e < 1) return [118, 110, 98];
    if (e < 2) return [226, 220, 208];
    if (e < 3) return P.stoneEdge;
    const row = Math.floor(Y / 16), col = Math.floor((X + (row % 2) * 8) / 16);
    if (Y % 16 === 0 || (X + (row % 2) * 8) % 16 === 0) return P.stoneJoint;
    return mix(P.stone, P.stoneJoint, hash(col, row) * 0.4 + hash(X, Y) * 0.1);
  }
  // A lane: packed earth, pebbles, soft ruts, grass growing in at the edges.
  const half = (r.width * T) / 2;
  if (e < 2.5 && noise(X, Y, 6) * (2.5 - e) > 0.9) return grassAt(X, Y, mx, my);
  let c = mix(P.dirt, P.dirtSpeck, noise(X, Y, 12) * 0.6);
  const rut = Math.abs(Math.abs(o) - half * 0.4);
  if (rut < 2) c = mix(c, [166, 142, 104], 0.35 * (1 - rut / 2));
  const h = hash(X, Y);
  if (h < 0.025) c = [226, 210, 180];
  else if (h < 0.04) c = [160, 136, 100];
  if (e < 2.5 && noise(X, Y, 6) * (2.5 - e) > 0.45) c = mix(c, [102, 162, 72], 0.5);
  return c;
}

/** Paving in detail, the walking street's slabs (`w, h` detail px; `X0, Y0`
 *  where it starts on the map, so its joints line up with the street's). */
function paving(w, h, X0, Y0) {
  const cv = new Canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = X0 + x, Y = Y0 + y;
    const row = Math.floor(Y / 16), col = Math.floor((X + (row % 2) * 8) / 16);
    let c = (Y % 16 === 0 || (X + (row % 2) * 8) % 16 === 0) ? P.stoneJoint : mix(P.stone, P.stoneJoint, hash(col, row) * 0.4 + hash(X, Y) * 0.1);
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (e < 2) c = [118, 110, 98];
    else if (e < 4) c = [226, 220, 208];
    else if (e < 6) c = P.stoneEdge;
    cv.set(x, y, c);
  }
  return cv;
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
    const forest = [];
    const ladderTiles = [];
    for (const e of drawn) {
      if (e.type === 'structure') {
        if (!inside(e, e.cv.w, e.cv.h)) continue;
        const spec = e.cv.spec;
        const art = spec?.kind === 'tombHall' ? tombHall(e.cv.spec) : spec?.kind === 'obelisk' ? obelisk(spec) : BUILDINGS[spec?.kind]?.() ?? (spec?.kind === 'hall' ? (spec.windows ? house(spec) : spec.w === 4 && spec.h === 4 ? gardenHouse(spec) : null) : null);
        if (art) redraw.push({ e, art, bottom: e.y + e.cv.h, overTo: e.overTo });
      } else if (e.type === 'tree') {
        if (!inside(e, e.cv.w, e.cv.h)) continue;
        const art = tree(e.kind, e.cv.w, e.cv.h, e.tx * 131 + e.ty * 17);
        if (art) redraw.push({ e, art, bottom: e.y + e.cv.h, overTo: e.overTo });
      } else if (e.type === 'busShelter') {
        continue;                                   // drawn as the map has it
      } else if (e.type === 'paddy') {
        if (!inside(e, e.w, e.h)) continue;
        redraw.push({ e, art: paddy(e.w * K, e.h * K, e.stage), bottom: e.y - 1500, overTo: 0 });
      } else if (e.type === 'ladder') {
        if (!inside(e, 16, 24)) continue;
        ladderTiles.push(e);
      } else if (e.type === 'wall') {
        if (!inside(e, 16, 16)) continue;
        redraw.push({ e, art: wallTile(e.horizontal, e.tx * 7 + e.ty), bottom: e.y - 2000, overTo: 0 });
      } else if (e.type === 'forest') {
        if (inside(e, 16, 16) || inside({ x: e.x - 16, y: e.y - 16 }, 48, 48)) forest.push(e);
      } else if (e.type === 'ttDeck') {
        if (!inside(e, e.w, e.h)) continue;
        redraw.push({ e, art: truongTienDeck(e.w * K, e.h * K), bottom: e.y - 1000, overTo: 0 });
      } else if (e.type === 'boardwalk') {
        if (!inside(e, e.w, e.h)) continue;
        redraw.push({ e, art: boardwalk(e.w * K, e.h * K), bottom: e.y, overTo: 0 });
      } else if (e.type === 'span') {
        if (!inside(e, e.w, e.h)) continue;
        // A wide landing is paved like the walking street; a narrow one is a causeway.
        redraw.push({ e, art: e.paved ? paving(e.w * K, e.h * K, e.x * K, e.y * K) : causeway(e.w * K, e.h * K), bottom: e.y - 1500, overTo: 0 });
      } else if (inside(e, 1, 1)) {
        redraw.push({ e, bottom: e.y });
      }
    }

    // Lift the old pixels out, then shade the ground afresh: everywhere it
    // was lifted, and every untouched pixel of plain grass, road or water.
    // The roads that reach this patch.
    const roads = ROADS.filter((r) => {
      const xs = r.points.map((p) => p[0]), ys = r.points.map((p) => p[1]), half = r.width / 2;
      return Math.max(...xs) + half >= x0 && Math.min(...xs) - half <= x1 && Math.max(...ys) + half >= y0 && Math.min(...ys) - half <= y1;
    });
    const clear = new Uint8Array(W * H);
    for (const { e, art } of redraw) {
      if (art && e.cv) liftOut(clear, o.d, W, H, ox, oy, e);
      else if (!art) {
        // Its box about (x, y): width, height, how far up and left it reaches.
        const [w, h, top, left] = {
          lamp: [3, 13, 11, 1], bike: [13, 10, 9, 1], lotus: [9, 7, 4, 4], cyclo: [19, 15, 14, 1],
          bed: [20, 10, 5, 10], bench: [13, 8, 5, 6], parkLamp: [3, 11, 9, 1],
          sampan: [32, 13, 2, 3], dragonBoat: [50, 14, 2, 5],
        }[e.type];
        for (let Y = (e.y - top - oy) * K; Y < (e.y - top + h - oy) * K; Y++) for (let X = (e.x - left - ox) * K; X < (e.x - left + w - ox) * K; X++) {
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
          const road = roadAt(X, Y, mx, my, roads);
          const grass = same(d, p, grassColor(fx, fy));
          if (road) {
            const plain = shade(fx, fy);
            // Lanes fray into the grass, so their edge pixels count as plain too.
            if (clear[i] || (plain && same(d, p, plain)) || (!plain && grass)) c = road;
          } else if (clear[i] || grass) c = grassAt(X, Y, mx, my);
        }
        if (c) g.set(X, Y, c);
      }
    }

    // The forest's canopy, in passes over the whole patch, before the rest.
    if (forest.length) forestCanopy(g, forest, ox, oy);

    // Ladders over the cliff faces, after the ground is shaded afresh.
    for (const e of ladderTiles) {
      for (let Y = (e.y - oy) * K; Y < (e.y + 24 - oy) * K; Y++) {
        const my = oy + Y / K;
        if (cliffAt(e.tx * T + 8, my)?.face === undefined) continue;
        const X = (e.tx * T + 3 - ox) * K, r = Y % 6;
        g.blit(LADDER, X, Y - r, [r, r + 1]);
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
      else if (e.type === 'lotus') lotus(g, X, Y, e.flower);
      else if (e.type === 'sampan') sampan(g, X, Y, e.flip);
      else if (e.type === 'dragonBoat') dragonBoat(g, X, Y);
      else if (e.type === 'bed') flowerBed(g, X, Y);
      else if (e.type === 'bench') bench(g, X, Y);
      else if (e.type === 'parkLamp') parkLamp(g, X, Y);
    }
    write(key, g, o);
    return { key, x: ox, y: oy, ground: `hue-detail-${key}-ground.png`, over: `hue-detail-${key}-over.png` };
  });
}
