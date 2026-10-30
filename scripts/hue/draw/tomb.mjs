// Tomb stonework: terraces, steps with dragon balustrades, the stone court's
// statues, obelisks and stele pavilions.

import { Canvas, hash, mix } from '../core/canvas.mjs';
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
 *  face row blocks except where `open` columns lead up steps. */
export function terrace(tx, ty, tw, th, pal, open = []) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let c = y < y0 + 2 ? pal.light : y >= y1 - 6 ? pal.face : pal.base;
      if (y >= y0 + 2 && y < y1 - 6 && ((y - y0) % 8 === 0 || (x + ((Math.floor((y - y0) / 8) % 2) * 5)) % 10 === 0)) c = pal.line;
      if (y >= y1 - 6 && (x - x0) % 6 === 0) c = mix(pal.face, [0, 0, 0], 0.2);
      ground.set(x, y, mix(c, P.moss, hash(x, y) < 0.03 ? 0.4 : 0));
    }
  }
  ground.rect(x0, y1, x1 - x0, 2, P.shadow, 0.25);
  for (let x = tx; x < tx + tw; x++) if (!open.includes(x)) solid[ty + th - 1][x] = true;
  mark(used, tx, ty, tw, th);
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
 *  stands on (and blocks) its tile. */
export function statue(tx, ty, kind, pal) {
  const x = tx * T + 8, y = ty * T + 14;
  ground.ellipse(x, y, 6, 2, P.shadow, 0.3);
  if (kind === 'mandarin') {
    ground.rect(x - 3, y - 11, 7, 11, pal.base);
    ground.rect(x - 3, y - 11, 2, 11, pal.light);
    ground.rect(x - 1, y - 7, 3, 4, pal.line);             // the tablet held at the chest
    ground.rect(x - 2, y - 15, 5, 4, pal.light);
    ground.rect(x - 3, y - 16, 7, 2, pal.face);            // the hat
  } else if (kind === 'elephant') {
    ground.ellipse(x, y - 6, 7, 5, pal.base);
    ground.ellipse(x - 2, y - 8, 4, 2, pal.light);
    for (const lx of [x - 5, x - 1, x + 3]) ground.rect(lx, y - 3, 2, 3, pal.face);
    ground.rect(x - 8, y - 8, 2, 7, pal.base);             // trunk
    ground.set(x - 5, y - 8, [40, 40, 40]);
  } else {
    ground.rect(x - 5, y - 8, 10, 4, pal.base);
    ground.rect(x - 7, y - 13, 3, 6, pal.base);            // neck and head
    ground.rect(x - 8, y - 13, 2, 2, pal.light);
    for (const lx of [x - 5, x - 2, x + 2, x + 4]) ground.rect(lx, y - 4, 1, 4, pal.face);
  }
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
