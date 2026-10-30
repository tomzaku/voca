// Painting the roads (see ../roads.mjs for the network), then the street
// furniture: lamps along the streets that light up at night, zebra crossings
// at the bridges, and bicycles and xích lô parked where people stop.

import { hash, mix, noise } from '../core/canvas.mjs';
import { P, STREET } from '../core/palette.mjs';
import { deck, glow, ground, mark, used } from '../core/world.mjs';
import { H, PH, PW, RIVER_BRIDGES, T, W, isWater } from '../layout.mjs';
import { ROADS, roadGap, roadHit } from '../roads.mjs';

const { asphalt: ASPHALT, asphaltDark: ASPHALT_DARK, asphaltSpeck: ASPHALT_SPECK, pavement: PAVEMENT, pavementJoint: PAVEMENT_JOINT, kerb: KERB, kerbShadow: KERB_SHADOW, centreLine: CENTRE_LINE } = STREET;
const RUT = [166, 142, 104];

/** Which road each pixel shows — where roads meet, the one it's deepest
 *  inside, so a side street's carriageway runs on across the main road's
 *  pavement — and how many streets cover it (no centre line in a junction). */
const at = new Int16Array(PW * PH).fill(-1);
const depth = new Float32Array(PW * PH);
const offset = new Float32Array(PW * PH);
const along = new Float32Array(PW * PH);
const streets = new Uint8Array(PW * PH);

/** The colour of road pixel (x, y), or null where grass shows through. */
function shade(x, y) {
  const k = y * PW + x;
  const r = ROADS[at[k]], e = depth[k], o = offset[k], half = (r.width * T) / 2;
  let c;
  if (r.kind === 'stone') {
    const joint = (y % 8 === 0) || ((x + (Math.floor(y / 8) % 2) * 6) % 12 === 0);
    c = joint ? P.stoneJoint : mix(P.stone, P.stoneJoint, hash(x, y) * 0.25);
    if (e < 1) c = P.stoneEdge;
  } else if (r.kind === 'street') {
    if (e < 1) c = KERB_SHADOW;
    else if (e < 4) c = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 && (x % 4 === 0 || y % 4 === 0) ? PAVEMENT_JOINT : mix(PAVEMENT, PAVEMENT_JOINT, hash(x, y) * 0.3);
    else if (e < 5) c = KERB;
    else {
      c = mix(ASPHALT, ASPHALT_DARK, noise(x, y, 5));
      if (hash(x, y) < 0.04) c = ASPHALT_SPECK;
      if (r.main && streets[k] === 1 && Math.abs(o) < 1 && along[k] % 18 < 10) c = CENTRE_LINE;
    }
  } else {
    // A lane: packed earth worn into two soft ruts, grass growing in
    // along its edges.
    const grassy = e < 2.5 ? noise(x, y, 3) * (2.5 - e) : 0;
    if (grassy > 0.9) return null;
    c = mix(P.dirt, P.dirtSpeck, noise(x, y, 6) * 0.5);
    if (hash(x, y) < 0.04) c = P.dirtSpeck;
    const rut = Math.abs(Math.abs(o) - half * 0.4);
    if (rut < 2) c = mix(c, RUT, 0.35 * (1 - rut / 2));
    if (grassy > 0.45) c = mix(c, P.grassDark, 0.5);
  }
  return c;
}

export function paintRoads() {
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (roadGap(tx, ty) < 1) used[ty][tx] = true;

  ROADS.forEach((r, i) => {
    const half = (r.width * T) / 2;
    const xs = r.line.segs.flatMap((g) => [g.ax, g.bx]), ys = r.line.segs.flatMap((g) => [g.ay, g.by]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - half)), x1 = Math.min(PW - 1, Math.ceil(Math.max(...xs) + half));
    const y0 = Math.max(0, Math.floor(Math.min(...ys) - half)), y1 = Math.min(PH - 1, Math.ceil(Math.max(...ys) + half));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const hit = roadHit(r, x + 0.5, y + 0.5);
        if (!hit) continue;
        const k = y * PW + x, e = half - Math.abs(hit.o);
        if (r.kind === 'street') streets[k]++;
        if (at[k] >= 0 && depth[k] >= e) continue;
        at[k] = i; depth[k] = e; offset[k] = hit.o; along[k] = hit.s;
      }
    }
  });

  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      if (at[y * PW + x] < 0) continue;
      const c = shade(x, y);
      if (c) ground.set(x, y, c);
    }
  }
}

/** Where a street crosses a canal: the street carried on over it (repainted
 *  over the water), a stone parapet along each side. */
export function streetBridge(tx, ty, tw, th) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (at[y * PW + x] < 0) continue;
      const c = shade(x, y);
      if (c) ground.set(x, y, c);
    }
  }
  const across = th > tw;   // the street runs north–south over an east–west canal
  for (let i = across ? y0 : x0; i < (across ? y1 : x1); i++) {
    for (const [px, py] of across ? [[x0, i], [x1 - 2, i]] : [[i, y0], [i, y1 - 2]]) {
      ground.rect(px, py, across ? 2 : 1, across ? 1 : 2, i % 6 === 0 ? P.stoneEdge : P.stone);
    }
  }
  if (across) for (let y = y0; y < y1; y++) ground.set(x1, y + 2, P.shadow, 0.3);
  else for (let x = x0; x < x1; x++) ground.set(x + 2, y1, P.shadow, 0.3);
  mark(deck, tx, ty, tw, th);
}

const onBridge = (x) => RIVER_BRIDGES.some(([a, b]) => x > (a - 1) * T && x < (b + 1) * T);

/** A bicycle standing on (x, y), its wheels on the ground. */
function bicycle(x, y, frame) {
  for (const cx of [x + 2, x + 9]) {
    for (let a = 0; a < 16; a++) ground.set(cx + Math.round(Math.cos((a / 16) * 2 * Math.PI) * 2.5), y - 3 + Math.round(Math.sin((a / 16) * 2 * Math.PI) * 2.5), [40, 36, 34]);
  }
  for (const [ax, ay, bx, by] of [[2, -3, 5, -6], [5, -6, 6, -3], [6, -3, 2, -3], [5, -6, 9, -6], [6, -3, 9, -6], [9, -7, 9, -3]]) {
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i <= n; i++) ground.set(x + ax + ((bx - ax) * i) / n, y + ay + ((by - ay) * i) / n, frame);
  }
  ground.rect(x + 4, y - 7, 3, 1, [40, 36, 34]);              // saddle
  ground.rect(x + 8, y - 8, 3, 1, [40, 36, 34]);              // handlebar
  ground.rect(x, y + 1, 12, 1, P.shadow, 0.2);
}

/** A xích lô waiting for a fare: the hooded seat up front, the driver's
 *  saddle behind. */
function cyclo(x, y) {
  for (const [cx, r] of [[x + 3, 2.5], [x + 14, 2.5]]) {
    for (let a = 0; a < 16; a++) ground.set(cx + Math.round(Math.cos((a / 16) * 2 * Math.PI) * r), y - 3 + Math.round(Math.sin((a / 16) * 2 * Math.PI) * r), [40, 36, 34]);
  }
  ground.rect(x, y - 8, 8, 4, [42, 58, 92]);                  // the carriage
  ground.rect(x + 1, y - 9, 6, 1, [168, 50, 38]);             // its red seat
  ground.rect(x + 1, y - 13, 7, 4, [28, 28, 34]);             // the hood
  ground.rect(x, y - 6, 8, 1, [240, 192, 80]);
  for (let i = 0; i < 7; i++) ground.set(x + 8 + i, y - 5 + Math.round(i * 0.3), [90, 90, 98]);
  ground.rect(x + 12, y - 9, 3, 1, [40, 36, 34]);             // the driver's saddle
  ground.rect(x, y + 1, 18, 1, P.shadow, 0.2);
}

export function furnishStreets() {
  // Lamps along both pavements of every street, every few steps.
  for (const r of ROADS) {
    if (r.kind !== 'street') continue;
    const reach = (r.width * T) / 2 - 2.5;
    for (let s = 2 * T; s < r.line.length - T; s += 6 * T) {
      const g = r.line.segs.find((seg) => s >= seg.s0 && s < seg.s0 + seg.len);
      const t = (s - g.s0) / g.len;
      const cx = g.ax + (g.bx - g.ax) * t, cy = g.ay + (g.by - g.ay) * t;
      const nx = -(g.by - g.ay) / g.len, ny = (g.bx - g.ax) / g.len;
      for (const side of [-1, 1]) {
        const x = Math.round(cx + nx * reach * side), y = Math.round(cy + ny * reach * side);
        if ((onBridge(x) && Math.abs(ny) > 0.9) || isWater(x, y)) continue;
        if (at[y * PW + x] !== ROADS.indexOf(r)) continue;            // not where another road crosses
        ground.rect(x, y - 9, 1, 9, [70, 72, 80]);
        ground.rect(x - 1, y - 11, 3, 2, [250, 226, 160]);
        ground.set(x + 1, y, P.shadow, 0.3);
        glow(x, y - 10, [255, 214, 140], 3);
      }
    }
  }
  // Zebra crossings on the riverside streets, beside each bridge's mouth.
  for (const [a] of RIVER_BRIDGES) {
    for (const row of [49, 59]) {
      for (let y = (row - 1) * T; y < (row + 1) * T; y++) {
        for (let x = Math.round((a - 1.7) * T); x < Math.round((a - 1.1) * T); x++) {
          const k = y * PW + x;
          if (at[k] < 0 || ROADS[at[k]].kind !== 'street' || depth[k] < 5) continue;
          if (Math.floor(y / 3) % 2 === 0) ground.set(x, y, [236, 236, 230]);
        }
      }
    }
  }
  // Bicycles and xích lô parked on the pavements: outside Đông Ba market, Ga
  // Huế and Quốc Học, and along the walking street.
  const frames = [[176, 52, 40], [52, 92, 150], [40, 120, 92], [214, 170, 60]];
  for (const [tx, ty, kind] of [
    [86.4, 48.3, 'bike'], [87.3, 48.3, 'bike'], [88.2, 48.3, 'bike'], [91.5, 48.3, 'cyclo'], [93.2, 48.3, 'cyclo'],
    [24.5, 59.9, 'bike'], [25.4, 59.9, 'bike'], [28, 59.9, 'cyclo'],
    [37, 65.9, 'bike'], [37.9, 65.9, 'bike'],
    [72, 69.9, 'bike'], [72.9, 69.9, 'bike'], [80.5, 69.9, 'cyclo'],
  ]) {
    const x = Math.round(tx * T), y = Math.round(ty * T);
    if (kind === 'bike') bicycle(x, y, frames[Math.floor(hash(x, y) * frames.length)]);
    else cyclo(x, y);
  }
}
