// The river: its islets, the four bridges, Cồn Hến's footbridge, the
// dragon-boat wharf and its boat, and the crossings over the canals.

import { mix, noise } from '../core/canvas.mjs';
import { P, ROOF, STREET } from '../core/palette.mjs';
import { glow, ground, night } from '../core/world.mjs';
import { bridgeDeck, lamps, plankDeck } from '../draw/buildings.mjs';
import { BANK_N, BANK_S, BRIDGE_Y0, BRIDGE_Y1, EAST_GATE_Y, ISLETS, T, isletE } from '../layout.mjs';
import { streetBridge } from '../paint/roads.mjs';

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Sông Hương', x: 4, y: 56.3, place: 'songHuong', theme: 'forest', anchor: 'left' },
  { text: 'Cầu Nguyễn Hoàng', x: 23.4, y: 58.4, place: 'nguyenHoang', theme: 'desert', anchor: 'left' },
  { text: 'Cầu Dã Viên', x: 35.4, y: 52, place: 'daVien', theme: 'desert', anchor: 'left' },
  { text: 'Cầu Phú Xuân', x: 69.4, y: 52, place: 'phuXuan', theme: 'desert', anchor: 'left' },
  { text: 'Cầu Trường Tiền', x: 78.4, y: 52, place: 'truongTien', theme: 'desert', anchor: 'left' },
];

export function drawRiver() {
  // The islets, Dã Viên and Cồn Hến: grass with a sandy rim.
  for (const isl of ISLETS) {
    const r = Math.max(isl.rx, isl.ry);
    for (let y = Math.floor(isl.cy - r); y < isl.cy + r; y++) {
      for (let x = Math.floor(isl.cx - r); x < isl.cx + r; x++) {
        const e = isletE(isl, x + 0.5, y + 0.5);
        if (e > 1) continue;
        ground.set(x, y, e > 0.82 ? [206, 190, 150] : mix(P.grass, P.grassLight, noise(x, y, 9)));
      }
    }
  }
  // Phú Xuân: the plain one — even concrete spans on square piers, and a
  // steady line of lamps along its parapets.
  {
    const tx = 66, tw = 3, y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
    const x0 = tx * T, x1 = (tx + tw) * T;
    bridgeDeck(tx, tw, y0, y1, { rail: [204, 200, 192], post: [150, 146, 140], piers: 4 });
    lamps(x0, x1, y0, y1, 16);
  }

  // Dã Viên: a long concrete deck that touches down on Dã Viên islet midstream —
  // the islet showing on both sides is what makes it this bridge.
  {
    const tx = 32, tw = 3, y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
    const x0 = tx * T, x1 = (tx + tw) * T;
    bridgeDeck(tx, tw, y0, y1, { rail: [184, 190, 198], post: [120, 126, 134], piers: 2 });
    for (let y = Math.ceil(y0); y < y1; y++) {
      if (y % 12 === 0) ground.rect(x0 + 6, y, tw * T - 12, 1, STREET.asphaltSpeck); // expansion joints
    }
    lamps(x0, x1, y0, y1, 22);
  }

  // Nguyễn Hoàng: the new crossing by Kim Long — a wide deck with a median,
  // under one great arch in imperial yellow hung on cables, standing on
  // V-shaped piers.
  {
    const tx = 19, tw = 4, y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
    const x0 = tx * T, x1 = (tx + tw) * T, cx = (x0 + x1) / 2;
    for (const py of [BANK_N + 22, (BANK_N + BANK_S) / 2, BANK_S - 26]) {
      for (const [sx, dir] of [[x0 - 2, -1], [x1 + 1, 1]]) {
        for (let k = 0; k < 5; k++) {
          ground.set(sx + dir * k, py - k, [220, 196, 120]);
          ground.set(sx + dir * k, py + k, [220, 196, 120]);
          ground.set(sx + dir * k, py + k + 1, [168, 140, 76]);
        }
      }
    }
    bridgeDeck(tx, tw, y0, y1, { rail: [226, 196, 110], post: [176, 126, 40], piers: 0, median: true });
    for (let y = Math.ceil(y0); y < y1; y++) {
      if (y % 8 < 4) for (const lx of [cx - 14, cx + 13]) ground.set(lx, y, [236, 236, 230]); // lane dashes
    }
    // The arch springs from the median at both banks and leans out west over
    // the water, so its full sweep reads from above. Cables hang back to the deck.
    const gold = [232, 186, 64], goldLight = [250, 222, 128], goldDark = [176, 126, 40];
    const ay0 = y0 + 10, ay1 = y1 - 10, reach = 66;
    for (let y = ay0; y <= ay1; y++) {
      const t = (y - ay0) / (ay1 - ay0);
      const ax = cx - Math.sin(t * Math.PI) * reach;
      if (Math.floor(y) % 5 === 0 && ax < cx - 2) {
        for (let x = Math.ceil(ax) + 3; x < cx; x++) ground.set(x, y, [236, 232, 220], 0.4);
      }
      ground.set(ax - 1, y, goldDark);
      ground.set(ax, y, gold);
      ground.set(ax + 1, y, goldLight);
      if (Math.floor(y) % 2 === 0) glow(ax, y, [255, 200, 90], 2);
      ground.set(ax + 2, y, gold);
      ground.set(ax - 2, y, goldDark);
      ground.set(ax - 4, y + 3, P.shadow, 0.25);
      ground.set(ax - 5, y + 3, P.shadow, 0.15);
    }
  }

  // Trường Tiền: the deck between six great silver-white truss arches, a
  // stone pier wherever two meet. By day it's all silver; at night its
  // lighting gives each span its own colour.
  {
    const tx = 75, tw = 3;
    const x0 = tx * T, x1 = (tx + tw) * T;
    const y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
    const spans = 6, spanLen = (y1 - y0) / spans;
    // The piers first, under everything: stone footings in the water.
    for (let s = 1; s < spans; s++) {
      const py = Math.round(y0 + s * spanLen);
      ground.rect(x0 - 12, py - 2, x1 - x0 + 24, 5, [168, 164, 156]);
      ground.rect(x0 - 12, py + 3, x1 - x0 + 24, 1, [120, 116, 110]);
      ground.rect(x1 + 13, py, 5, 1, P.glint, 0.7);
    }
    bridgeDeck(tx, tw, y0, y1, { rail: [160, 168, 178], post: [214, 220, 226], piers: 0 });
    const steel = [228, 234, 240], steelShade = [150, 162, 174];
    // Huế purple first, then round the colour wheel, one per span.
    const spanLights = [[186, 120, 255], [96, 140, 255], [64, 214, 240], [96, 236, 150], [255, 220, 90], [255, 120, 180]];
    for (const side of [-1, 1]) {
      const base = side < 0 ? x0 - 1 : x1;
      for (let s = 0; s < spans; s++) {
        const sy = y0 + s * spanLen;
        for (let k = 0; k <= spanLen; k++) {
          // The arch bulging outward, drawn in oblique so it reads from above;
          // hangers from the deck's edge out to it.
          const t = k / spanLen;
          const bulge = Math.round(Math.sin(t * Math.PI) * 10);
          const x = base + side * bulge;
          if (k % 3 === 0) for (let b = 1; b < bulge; b++) ground.set(base + side * b, sy + k, steelShade, 0.8);
          ground.set(x, sy + k, steel);
          ground.set(x - side, sy + k, steel);
          ground.set(x + side, sy + k, steelShade);
          ground.set(x + side * 2, sy + k + 2, P.shadow, 0.25);
          glow(x, sy + k, spanLights[s], k % 3 === 0 ? 2 : 1);
          night.set(x + side, sy + k, spanLights[s]);
        }
        ground.rect(base - 1, Math.floor(sy) - 1, 3, 3, steelShade); // where the arches meet
      }
      for (let y = Math.floor(y0); y < y1; y++) ground.set(base, y, steel);   // the chord along the deck
    }
  }

  // Cồn Hến footbridge, from the Gia Hội bank out to the islet.
  plankDeck(101, 39, 7, 2, true);

  // The dragon-boat wharf below the citadel, west of Phu Văn Lâu's landing, and
  // a boat moored alongside it.
  {
    plankDeck(48, 50, 2, 9);
    const x0 = 48 * T, x1 = 50 * T, y0 = 51 * T + 32;
    for (const [px, py] of [[x0, y0], [x1 - 2, y0], [x0, y0 + 40], [x1 - 2, y0 + 40]]) ground.rect(px, py, 2, 3, [96, 66, 44]);
  }
  {
    const bx = 42.3 * T, by = 55 * T, bw = 88, bh = 18;
    for (let x = 0; x < bw; x++) {
      const taper = x < 10 ? Math.round((10 - x) * 0.5) : x > bw - 8 ? Math.round((x - (bw - 8)) * 0.6) : 0;
      for (let y = 6 + taper; y < bh; y++) {
        ground.set(bx + x, by + y, y > bh - 4 ? [120, 40, 32] : y > bh - 7 ? [196, 160, 64] : [178, 52, 40]);
      }
    }
    ground.rect(bx + 6, by + bh, bw - 10, 2, P.shadow, 0.3);
    ground.rect(bx + 24, by + 2, 40, 8, [150, 44, 36]);
    for (let x = 20; x < 68; x++) ground.set(bx + x, by + 1 + (x < 24 || x > 63 ? 0 : 1), ROOF.imperial.base);
    for (let x = 22; x < 66; x++) ground.set(bx + x, by, ROOF.imperial.light);
    for (let x = 28; x < 62; x += 6) {
      ground.rect(bx + x, by + 4, 3, 4, [244, 214, 140]);   // lanterns
      glow(bx + x + 1, by + 6, [255, 200, 120], 2);
    }
    ground.rect(bx - 6, by + 2, 6, 8, [196, 160, 64]);       // dragon head
    ground.rect(bx - 9, by + 4, 4, 3, [196, 160, 64]);
    ground.set(bx - 4, by + 4, [40, 30, 30]);
    ground.rect(bx - 3, by, 2, 2, [178, 52, 40]);
    ground.rect(bx + bw - 2, by + 4, 3, 3, [196, 160, 64]);  // tail
    ground.rect(bx + bw, by + 2, 2, 3, [196, 160, 64]);
  }

  // Over the Đông Ba canal: at the east gate and on the riverside road.
  plankDeck(80, EAST_GATE_Y, 5, 2, true);
  streetBridge(80, 48, 5, 2);
  // Over the An Cựu canal, where the south-bank roads meet it.
  for (const [x, w] of [[20, 2], [48, 3], [69, 3]]) streetBridge(x, 75, w, 4);
}
