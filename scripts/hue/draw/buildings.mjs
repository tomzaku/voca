// Building blocks for structures: roofs, façades, halls and palaces, gate
// houses, wall rings, decks and causeways, bridge parts.

// A structure is drawn into its own canvas, then split: rows from `solidFrom`
// down are its footprint (blocked, painted on the ground), rows above it are
// its upper part (painted again on `over`, so the buddy passes behind them).

import { Canvas, hash, mix, noise } from '../core/canvas.mjs';
import { P, ROOF, STREET } from '../core/palette.mjs';
import { deck, glow, ground, mark, solid } from '../core/world.mjs';
import { T } from '../layout.mjs';

/** A curved Vietnamese roof: tile stripes, upturned eaves and ridge ends. */
export function roof(cv, x, y, w, h, pal, inset = Math.min(6, Math.floor(h * 0.5))) {
  for (let r = 0; r < h; r++) {
    const ins = Math.round(inset * (1 - r / Math.max(1, h - 1)));
    for (let c = ins; c < w - ins; c++) {
      let col = (c - ins) % 3 === 0 ? pal.line : pal.base;
      if (c < w / 2) col = mix(col, pal.light, 0.12);
      if (r === h - 2) col = pal.light;
      if (r === h - 1) col = pal.eave;
      cv.set(x + c, y + r, col);
    }
  }
  // Ridge with upturned ends.
  cv.rect(x + inset - 1, y - 2, w - 2 * inset + 2, 2, pal.ridge);
  cv.rect(x + inset - 3, y - 4, 2, 2, pal.ridge);
  cv.rect(x + w - inset + 1, y - 4, 2, 2, pal.ridge);
  // Upturned eave corners.
  cv.rect(x - 2, y + h - 3, 2, 2, pal.eave);
  cv.rect(x + w, y + h - 3, 2, 2, pal.eave);
  cv.set(x - 3, y + h - 4, pal.eave);
  cv.set(x + w + 2, y + h - 4, pal.eave);
}

/** The front wall of a building: colour, pillars, plinth, a door, windows. */
export function facade(cv, x, y, w, h, o) {
  cv.rect(x, y, w, h, o.wall);
  cv.rect(x, y, w, 2, mix(o.wall, [0, 0, 0], 0.25)); // under-eave shade
  if (o.pillar) for (let px = x + 1; px < x + w; px += o.pillarStep ?? 8) cv.rect(px, y + 2, 2, h - 4, o.pillar);
  if (o.windows) {
    for (let wx = x + 5; wx + 4 < x + w - 4; wx += o.windowStep ?? 10) {
      if (Math.abs(wx + 2 - (x + w / 2)) < 8) continue; // keep the door clear
      cv.rect(wx, y + 4, 5, 5, o.windowFrame ?? [236, 226, 200]);
      cv.rect(wx + 1, y + 5, 3, 3, o.glass ?? [58, 66, 70]);
    }
  }
  cv.rect(x - 1, y + h - 2, w + 2, 2, o.plinth ?? [170, 162, 150]);
  if (o.door !== false) {
    const dw = o.doorW ?? 6, dh = Math.min(h - 3, o.doorH ?? 9);
    const dx = Math.round(x + w / 2 - dw / 2);
    cv.rect(dx - 1, y + h - 2 - dh - 1, dw + 2, dh + 1, o.doorFrame ?? [72, 44, 32]);
    cv.rect(dx, y + h - 2 - dh, dw, dh, o.doorFill ?? [44, 30, 26]);
  }
}

/** A hall: roof over a facade. */
export function hall({ w, h, roofRows, roofPal, wall, ...o }) {
  const cv = new Canvas(w * T, h * T);
  const roofH = roofRows * T;
  facade(cv, 2, roofH - 2, w * T - 4, h * T - roofH + 2, { wall, ...o });
  roof(cv, 2, 5, w * T - 4, roofH - 5, roofPal);
  cv.spec = { kind: 'hall', w, h, roofRows, roofPal, wall, ...o };
  return cv;
}

/** A hall with a second, smaller roof tier above the first. */
export function palace({ w, h, roofPal, wall, pillar }) {
  const cv = new Canvas(w * T, h * T);
  const pw = w * T, ph = h * T;
  const bodyY = Math.round(ph * 0.55);
  facade(cv, 3, bodyY, pw - 6, ph - bodyY, { wall, pillar, pillarStep: 7, doorW: 10, doorH: 14, doorFill: [60, 30, 24] });
  roof(cv, 2, Math.round(ph * 0.32), pw - 4, bodyY - Math.round(ph * 0.32), roofPal);
  // Upper tier: a band of red pillars, then a smaller roof.
  const upW = Math.round(pw * 0.62), upX = Math.round((pw - upW) / 2);
  const upY = Math.round(ph * 0.24);
  cv.rect(upX, upY, upW, Math.round(ph * 0.08) + 1, wall);
  for (let px = upX + 2; px < upX + upW - 1; px += 6) cv.rect(px, upY, 2, Math.round(ph * 0.08) + 1, pillar);
  roof(cv, upX - 2, 6, upW + 4, upY - 6, roofPal, 5);
  return cv;
}

/** Planks over water, laid across the direction of travel. */
export function plankDeck(tx, ty, tw, th, horizontal = false) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const edge = horizontal ? (y === y0 || y === y1 - 1) : (x === x0 || x === x1 - 1);
      const plank = Math.floor((horizontal ? x - x0 : y - y0) / 3) % 2 === 0;
      ground.set(x, y, edge ? [106, 76, 50] : plank ? [160, 118, 78] : [146, 106, 70]);
    }
  }
  for (let y = y0; y < y1; y++) ground.set(x1, y + 2, P.shadow, 0.3);
  mark(deck, tx, ty, tw, th);
}

/** A short stone causeway over a moat or canal. */
export function stoneSpan(tx, ty, tw, th) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const edge = (tw <= th) ? (x === x0 || x === x1 - 1) : (y === y0 || y === y1 - 1);
      ground.set(x, y, edge ? P.stoneEdge : P.stone);
    }
  }
  mark(deck, tx, ty, tw, th);
}

/** A road bridge's deck in the streets' own style — parapets with posts
 *  along both edges, pavements inside them, asphalt down the middle under a
 *  centre line (or a median) — with its shadow on the water and `piers`
 *  standing in it, the river breaking white on their downstream side. */
export function bridgeDeck(tx, tw, y0, y1, { rail, post, piers = 3, pierColor = post, median = false }) {
  const x0 = tx * T, x1 = (tx + tw) * T, cx = (x0 + x1) / 2;
  for (let i = 1; i <= piers; i++) {
    const py = Math.round(y0 + ((y1 - y0) * i) / (piers + 1));
    ground.rect(x0 - 3, py - 2, x1 - x0 + 6, 5, pierColor);
    ground.rect(x0 - 3, py + 3, x1 - x0 + 6, 1, mix(pierColor, [0, 0, 0], 0.3));
    for (const [rx, len] of [[x1 + 4, 5], [x1 + 6, 3]]) ground.rect(rx, py - 1 + (len === 3 ? 2 : 0), len, 1, P.glint, 0.7);
  }
  for (let y = Math.floor(y0); y < y1; y++) {
    ground.set(x1, y + 2, P.shadow, 0.35);
    ground.set(x1 + 1, y + 2, P.shadow, 0.2);
    for (let x = x0; x < x1; x++) {
      const e = Math.min(x - x0, x1 - 1 - x);
      let c;
      if (e < 2) c = y % 6 < 2 ? post : rail;
      else if (e < 5) c = (x % 4 === 0 || y % 4 === 0) ? STREET.pavementJoint : mix(STREET.pavement, STREET.pavementJoint, hash(x, y) * 0.3);
      else if (e < 6) c = STREET.kerb;
      else {
        c = mix(STREET.asphalt, STREET.asphaltDark, noise(x, y, 5));
        if (hash(x, y) < 0.04) c = STREET.asphaltSpeck;
        if (median ? Math.abs(x + 0.5 - cx) < 1.5 : Math.abs(x + 0.5 - cx) < 1 && y % 18 < 10) c = median ? [214, 208, 196] : STREET.centreLine;
      }
      ground.set(x, y, c);
    }
  }
  mark(deck, tx, Math.floor(y0 / T), tw, Math.ceil(y1 / T) - Math.floor(y0 / T));
}

/** Street lamps along both rails: a short post rising from the rail (drawn
 *  upward, as height reads in this view) with a warm head. */
export function lamps(x0, x1, y0, y1, step) {
  for (let y = y0 + step / 2; y < y1 - 4; y += step) {
    for (const x of [x0, x1 - 1]) {
      ground.rect(x, y - 5, 1, 5, [86, 86, 92]);
      ground.rect(x - 1, y - 7, 3, 2, [250, 222, 150]);
      glow(x, y - 6, [255, 214, 140], 3);
    }
  }
}

/** A wall ring with a crenellated top and a darker south-facing face.
 *  `open(tx, ty)` leaves a tile out — a gate, or a building in the line. */
export function wallRing(b, open) {
  for (let ty = b.y0; ty < b.y1; ty++) {
    for (let tx = b.x0; tx < b.x1; tx++) {
      const horizontal = ty === b.y0 || ty === b.y1 - 1;
      const ring = horizontal || tx === b.x0 || tx === b.x1 - 1;
      if (!ring || open(tx, ty)) continue;
      solid[ty][tx] = true;
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const px = tx * T + x, py = ty * T + y;
          let c;
          if (horizontal && y >= 9) {
            c = (y % 3 === 0 || (x + (y % 6 < 3 ? 0 : 3)) % 6 === 0) ? P.wallLine : P.wallFace;
          } else {
            c = hash(px, py) < 0.08 ? P.moss : P.wallTop;
            if (horizontal && y < 2 && x % 4 < 2) c = P.wallFace;           // merlons
            if (!horizontal && (x < 2 || x > 13)) c = P.wallFace;
          }
          ground.set(px, py, c);
        }
      }
    }
  }
}

/** A gate house: a little yellow roof over an arch, its face to the outside. */
/** A Citadel gate as Huế's stand: a weathered brick tower over a dark
 *  arched passage, a pavilion on top — red columns under a two-tier yellow
 *  roof. Four tiles wide and four tall; the bottom row is the wall. */
export const citadelGate = () => {
  const cv = new Canvas(4 * T, 4 * T);
  const brick = [146, 108, 88], brickDark = [118, 84, 68], brickLight = [172, 134, 110], moss = [104, 116, 82];
  // The tower: brick courses, darker at the foot where the damp climbs.
  for (let y = 30; y < 64; y++) {
    for (let x = 2; x < 62; x++) {
      let c = (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0) ? brickDark : brick;
      if (y > 54 && hash(x, y) < 0.35) c = moss;
      cv.set(x, y, c);
    }
  }
  cv.rect(0, 28, 64, 3, brickLight);                       // the cornice
  for (let x = 0; x < 64; x += 4) cv.rect(x, 26, 2, 2, brickLight);   // its crenels
  // The arched passage.
  cv.rect(19, 46, 26, 18, [36, 28, 24]);
  for (let i = 0; i < 6; i++) cv.rect(19 + i, 46 - Math.round(Math.sqrt(36 - (6 - i) ** 2)), 26 - i * 2, 1, [36, 28, 24]);
  cv.rect(17, 44, 30, 2, brickLight);
  // The pavilion on top.
  cv.rect(14, 14, 36, 12, [150, 46, 38]);
  for (let x = 16; x < 48; x += 6) cv.rect(x, 14, 2, 12, [196, 64, 48]);
  roof(cv, 8, 8, 48, 8, ROOF.imperial, 4);
  cv.rect(22, 4, 20, 4, [150, 46, 38]);
  roof(cv, 18, -1, 28, 6, ROOF.imperial, 3);
  return cv;
};

/** An arched stone bridge over a moat — the kind before every gate: a deck
 *  that rises over the arch (lighter at its crown), stone parapets with
 *  balusters along both sides. `way` is the way it's crossed: north–south
 *  ('ns'), or east–west ('ew'), when its face shows below the deck, the arch
 *  dark over the water. Always given: a bridge's shape doesn't say which. */
export function archBridge(tx, ty, tw, th, way) {
  const x0 = tx * T, y0 = ty * T, x1 = (tx + tw) * T, y1 = (ty + th) * T;
  const along = way === 'ns';
  const stone = [196, 190, 176], stoneLow = [168, 162, 148], parapet = [222, 218, 206], baluster = [150, 144, 132];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const t = along ? (y - y0 + 0.5) / (y1 - y0) : (x - x0 + 0.5) / (x1 - x0);
      const e = along ? Math.min(x - x0, x1 - 1 - x) : Math.min(y - y0, y1 - 1 - y);
      const run = along ? y : x;
      let c;
      if (e < 3) c = e === 2 ? parapet : run % 4 === 0 ? baluster : mix(parapet, baluster, 0.35);
      else {
        c = mix(stoneLow, stone, Math.sin(t * Math.PI));
        if (run % 6 === 0) c = mix(c, baluster, 0.4);
      }
      ground.set(x, y, c);
    }
  }
  if (along) {
    for (let y = y0; y < y1; y++) { ground.set(x1, y + 2, P.shadow, 0.35); ground.set(x1 + 1, y + 2, P.shadow, 0.2); }
  } else {
    // The bridge's south face over the water, the arch under it.
    const fh = 9, cx = (x0 + x1) / 2, r = (x1 - x0) / 2 - 3;
    for (let y = y1; y < y1 + fh; y++) {
      for (let x = x0; x < x1; x++) {
        const inArch = y - y1 > 1 && ((x + 0.5 - cx) / r) ** 2 + ((y1 + fh - y) / (fh - 2)) ** 2 < 1;
        ground.set(x, y, inArch ? [40, 66, 72] : (x + y) % 5 === 0 ? stoneLow : mix(stoneLow, stone, 0.4));
      }
    }
    ground.rect(x0, y1 + fh, x1 - x0, 2, P.shadow, 0.3);
  }
  mark(deck, tx, ty, tw, th);
}

export const gateHouse = () => {
  const cv = new Canvas(4 * T, 3 * T);
  cv.rect(0, 26, 64, 22, P.wallFace);
  for (let y = 26; y < 48; y += 3) for (let x = 0; x < 64; x++) if ((x + y) % 6 === 0) cv.set(x, y, P.wallLine);
  cv.rect(17, 30, 30, 18, [40, 32, 28]);         // arch
  cv.rect(19, 28, 26, 2, [40, 32, 28]);
  roof(cv, 6, 12, 52, 12, ROOF.imperial, 4);
  cv.rect(10, 22, 44, 4, [160, 50, 40]);
  return cv;
};

/** An ordinary tile-roofed house — the city between the landmarks. */
export const HOUSE = (roofPal, wall = [214, 198, 170]) => hall({
  w: 4, h: 4, roofRows: 2, roofPal, wall, windows: true, windowStep: 9, doorW: 6,
});
