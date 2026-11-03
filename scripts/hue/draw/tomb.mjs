// Tomb stonework: terraces, steps with dragon balustrades, the stone court's
// statues, obelisks and stele pavilions.

import { Canvas, hash, mix, noise } from '../core/canvas.mjs';
import { P } from '../core/palette.mjs';
import { ground, mark, place, solid, used } from '../core/world.mjs';
import { roof } from './buildings.mjs';
import { T } from '../layout.mjs';

/** Stone in a tomb's own weathering: Khải Định's dark concrete, the older
 *  tombs' grey-gold stone. */
export const STONE = {
  dark: { base: [132, 132, 128], light: [162, 162, 156], face: [92, 92, 90], line: [112, 112, 108] },
  old: { base: [184, 176, 156], light: [208, 200, 180], face: [140, 130, 110], line: [164, 156, 136] },
};

/** A raised stone terrace: slabs on top, its front face along the bottom. The
 *  face row blocks except where `open` columns lead up steps. The slabs are
 *  big and weathered — each its own shade, lichen staining them in patches,
 *  moss in the joints, rain streaks down the face — so a wide court reads
 *  as old stone rather than a grid. */
export function terrace(tx, ty, tw, th, pal, open = []) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const row = Math.floor((y - y0) / 12), col = Math.floor((x - x0 + (row % 2) * 8) / 16);
      let c;
      if (y < y0 + 2) c = pal.light;
      else if (y >= y1 - 6) {
        c = (x - x0) % 6 === 0 ? mix(pal.face, [0, 0, 0], 0.2) : pal.face;
        if (noise(x, 0, 3) > 0.7) c = mix(c, [40, 40, 38], 0.25 * (y - (y1 - 6)) / 6);   // rain streaks
      } else {
        c = mix(pal.base, pal.face, hash(col + tx * 31, row + ty * 17) * 0.35);
        const stain = noise(x, y, 18);
        if (stain > 0.62) c = mix(c, [64, 70, 58], (stain - 0.62) * 1.2);          // lichen
        const joint = (y - y0 - 2) % 12 === 0 || (x - x0 + (row % 2) * 8) % 16 === 0;
        if (joint) c = mix(pal.line, P.moss, hash(x, y) < 0.35 ? 0.45 : 0);
        else if (hash(x, y) < 0.025) c = mix(c, P.moss, 0.4);
      }
      ground.set(x, y, c);
    }
  }
  ground.rect(x0, y1, x1 - x0, 2, P.shadow, 0.25);
  for (let x = tx; x < tx + tw; x++) if (!open.includes(x)) solid[ty + th - 1][x] = true;
  mark(used, tx, ty, tw, th);
}

/** The tall wall a tomb's grounds stand on: courses of blue-grey brick
 *  `th` tiles high across tiles `tx0`–`tx1` from row `ty`, a stone coping
 *  along the top, moss hanging down from it, the bricks darkening towards a
 *  shadowed foot — so from above you can see the tomb is up on the
 *  mountain, the way a raised ruin reads. Its tiles block, except the
 *  `gaps` columns, where the tomb's stairs come down. */
export function retainingWall(tx0, tx1, ty, th, gaps = []) {
  const x0 = tx0 * T, x1 = tx1 * T, y0 = ty * T, y1 = (ty + th) * T;
  const gap = (x) => gaps.includes(Math.floor(x / T));
  for (let x = x0; x < x1; x++) {
    if (gap(x)) continue;
    // Moss hangs further in some columns than others.
    const moss = noise(x, 7, 5) > 0.55 ? 3 + Math.floor(hash(x, 3) * 10) : hash(x, 9) < 0.2 ? 2 : 0;
    for (let y = y0; y < y1; y++) {
      const dy = y - y0;
      let c;
      if (dy < 2) c = [192, 196, 194];                                      // the coping, lit
      else if (dy < 4) c = [132, 138, 140];
      else {
        const row = Math.floor((dy - 4) / 5), off = (row % 2) * 5;
        const joint = (dy - 4) % 5 === 4 || (x - x0 + off) % 10 === 9;
        const tone = hash(Math.floor((x - x0 + off) / 10), row + ty * 7);
        c = joint ? [52, 58, 66] : tone < 0.33 ? [96, 104, 112] : tone < 0.66 ? [86, 94, 104] : [106, 114, 120];
        c = mix(c, [32, 36, 44], ((dy - 4) / (y1 - y0)) * 0.45);
      }
      if (dy >= 2 && dy < 2 + moss) c = mix([70, 124, 60], [96, 150, 72], hash(x, y) * 0.6);
      ground.set(x, y, c);
    }
    for (let y = y1; y < y1 + 5; y++) ground.set(x, y, [20, 34, 30], 0.4 * (1 - (y - y1) / 5));   // its shadow
  }
  for (let j = ty; j < ty + th; j++) for (let i = tx0; i < tx1; i++) if (!gaps.includes(i)) solid[j][i] = true;
  mark(used, tx0, ty, tx1 - tx0, th);
}

/** Steps up a terrace face; `dragons` gives them the balustrades of Khải
 *  Định's stairs, a dragon's body rippling down either side. */
export function steps(tx, ty, tw, th, pal, dragons = false) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) ground.rect(x0 + 3, y, x1 - x0 - 6, 1, (y - y0) % 3 === 0 ? pal.light : (y - y0) % 3 === 1 ? pal.base : pal.line);
  for (const [ex, dir] of [[x0, 1], [x1 - 3, -1]]) {
    ground.rect(ex, y0, 3, y1 - y0, pal.face);
    if (!dragons) continue;
    for (let y = y0; y < y1; y++) {
      const wave = Math.round(Math.sin((y - y0) / 4) * 1.5);
      ground.rect(ex + 1 + wave * dir * 0, y, 2, 1, (y >> 2) % 2 ? [70, 70, 70] : [104, 104, 100]);
    }
    ground.rect(ex - 1, y1 - 5, 5, 5, [70, 70, 70]);       // the dragon's head at the foot
    ground.set(ex + 1, y1 - 4, [214, 196, 120]);
  }
  mark(used, tx, ty, tw, th);
}

/** The stone court's guardians: mandarins, elephants and horses. Each
 *  stands on (and blocks) its tile, on a plinth, outlined dark — they're
 *  carved from the court's own stone, and without an edge they melted into
 *  it — and lit from the left. */
export function statue(tx, ty, kind, pal) {
  const cv = new Canvas(T + 4, T + 4);
  const x = 10, y = 16;
  const lit = mix(pal.light, [255, 255, 250], 0.25);
  cv.rect(x - 5, y - 2, 10, 3, pal.face);                  // the plinth
  cv.rect(x - 5, y - 2, 10, 1, pal.light);
  if (kind === 'mandarin') {
    // Short enough that a file of them, a tile apart, stays a file of figures.
    cv.rect(x - 3, y - 9, 7, 7, pal.base);
    cv.rect(x - 3, y - 9, 2, 7, lit);
    cv.rect(x + 2, y - 9, 2, 7, pal.face);
    cv.rect(x - 1, y - 7, 3, 3, pal.line);                 // the tablet held at the chest
    cv.rect(x - 2, y - 12, 5, 3, pal.light);
    cv.rect(x - 2, y - 12, 2, 3, lit);
    cv.rect(x - 3, y - 13, 7, 2, pal.face);                // the hat
  } else if (kind === 'elephant') {
    cv.ellipse(x, y - 7, 7, 5, pal.base);
    cv.ellipse(x - 2, y - 9, 4, 2, lit);
    for (const lx of [x - 5, x - 1, x + 3]) cv.rect(lx, y - 4, 2, 3, pal.face);
    cv.rect(x - 8, y - 9, 2, 7, pal.base);                 // trunk
    cv.rect(x - 4, y - 10, 2, 3, pal.face);                // the ear
    cv.set(x - 5, y - 9, [36, 36, 36]);
  } else {
    cv.rect(x - 5, y - 9, 10, 5, pal.base);
    cv.rect(x - 5, y - 9, 10, 1, lit);
    cv.rect(x - 7, y - 14, 3, 7, pal.base);                // neck and head
    cv.rect(x - 8, y - 14, 2, 2, lit);
    for (const lx of [x - 5, x - 2, x + 2, x + 4]) cv.rect(lx, y - 4, 1, 3, pal.face);
  }
  // The outline: every empty pixel touching the carving.
  const edge = [];
  for (let j = 0; j < cv.h; j++) for (let i = 0; i < cv.w; i++) {
    if (cv.alpha(i, j)) continue;
    if (cv.alpha(i - 1, j) || cv.alpha(i + 1, j) || cv.alpha(i, j - 1) || cv.alpha(i, j + 1)) edge.push([i, j]);
  }
  for (const [i, j] of edge) cv.set(i, j, [46, 44, 42]);
  const ox = tx * T + 8 - x, oy = ty * T + 14 - y;
  ground.ellipse(tx * T + 9, ty * T + 15, 7, 2, P.shadow, 0.35);
  ground.blit(cv, ox, oy);
  solid[ty][tx] = true;
  mark(used, tx, ty, 1, 1);
}

/** A trụ biểu — the tall square obelisk that marks a tomb's honour court. */
export function obelisk(tx, ty, pal) {
  const cv = new Canvas(T, 3 * T);
  cv.rect(2, 38, 12, 10, pal.face);
  cv.rect(2, 38, 12, 2, pal.light);
  cv.rect(4, 8, 8, 30, pal.base);
  cv.rect(4, 8, 3, 30, pal.light);
  for (let y = 12; y < 36; y += 6) cv.rect(5, y, 6, 1, pal.line);
  cv.rect(3, 5, 10, 3, pal.face);
  cv.rect(6, 1, 4, 4, pal.light);                          // the finial
  cv.spec = { kind: 'obelisk', pal };
  place(cv, tx, ty - 2, 1, { shadow: false });
}

/** A stele pavilion (bi đình): a square stone hall open on its front, the
 *  great inscribed stele standing inside. `octagon` cuts its corners, as
 *  Khải Định's is. */
export function biDinh(w, h, pal, roofPal, octagon = false) {
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const by = ph - 26;
  cv.rect(2, by, pw - 4, 24, pal.base);
  cv.rect(2, by, pw - 4, 2, pal.light);
  cv.rect(pw / 2 - 9, by + 4, 18, 20, [44, 42, 40]);       // the open front
  cv.rect(pw / 2 - 4, by + 7, 8, 17, [168, 164, 150]);     // the stele
  cv.rect(pw / 2 - 4, by + 7, 8, 2, [196, 192, 178]);
  for (let y = by + 11; y < by + 22; y += 2) cv.rect(pw / 2 - 3, y, 6, 1, [130, 126, 116]);
  roof(cv, 0, by - 16, pw, 16, roofPal, octagon ? 7 : 5);
  if (octagon) roof(cv, pw / 2 - 12, by - 26, 24, 10, roofPal, 4);
  return cv;
}
