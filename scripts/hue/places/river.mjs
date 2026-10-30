// The river: its islets, the four bridges, Cồn Hến's footbridge, the
// dragon-boat wharf and its boat, and the crossings over the canals.

import { mix, noise } from '../core/canvas.mjs';
import { P, ROOF } from '../core/palette.mjs';
import { glow, ground, night } from '../core/world.mjs';
import { lamps, plainBridge, plankDeck, stoneSpan } from '../draw/buildings.mjs';
import { BANK_N, BANK_S, BRIDGE_Y0, BRIDGE_Y1, EAST_GATE_Y, ISLETS, T, isletE } from '../layout.mjs';

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Sông Hương', x: 4, y: 54.3, place: 'songHuong', theme: 'forest', anchor: 'left' },
  { text: 'Cầu Nguyễn Hoàng', x: 23.4, y: 56.4, place: 'nguyenHoang', theme: 'desert', anchor: 'left' },
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
  // Phú Xuân: the plain one — even concrete spans on square piers, sidewalks
  // along both edges and a steady line of lamps.
  {
    const tx = 66, tw = 3, y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
    const x0 = tx * T, x1 = (tx + tw) * T;
    for (let y = BANK_N + 8; y < BANK_S - 4; y += 18) {
      ground.rect(x0 - 3, y, 3, 5, [150, 146, 140]);   // pier heads either side
      ground.rect(x1, y, 3, 5, [150, 146, 140]);
      ground.rect(x1 + 3, y + 2, 3, 5, P.shadow, 0.25);
    }
    plainBridge(tx, tw, y0, y1, [192, 188, 180], [150, 146, 140]);
    for (let y = y0; y < y1; y++) {
      ground.rect(x0 + 1, y, 3, 1, [212, 208, 200]);  // sidewalks
      ground.rect(x1 - 4, y, 3, 1, [212, 208, 200]);
    }
    lamps(x0, x1, y0, y1, 16);
  }

  // Dã Viên: a long concrete deck that touches down on Dã Viên islet midstream —
  // the islet showing on both sides is what makes it this bridge.
  {
    const tx = 32, tw = 3, y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
    const x0 = tx * T, x1 = (tx + tw) * T;
    plainBridge(tx, tw, y0, y1, [184, 182, 176], [120, 126, 134]);
    for (let y = y0; y < y1; y++) {
      if (Math.floor(y) % 10 === 0) ground.rect(x0 + 2, y, tw * T - 4, 1, [168, 166, 160]); // expansion joints
    }
    lamps(x0, x1, y0, y1, 22);
  }

  // Nguyễn Hoàng: the new crossing by Kim Long — a wide deck under one great
  // arch in imperial yellow, hung on cables, standing on V-shaped piers.
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
    plainBridge(tx, tw, y0, y1, [116, 118, 124], [212, 184, 96]);
    for (let y = y0; y < y1; y++) {
      ground.rect(x0 + 1, y, 6, 1, [206, 200, 188]);              // walkways
      ground.rect(x1 - 7, y, 6, 1, [206, 200, 188]);
      if (Math.floor(y) % 8 < 4) ground.set(cx - 7, y, [236, 236, 230]); // lane dashes
      if (Math.floor(y) % 8 < 4) ground.set(cx + 6, y, [236, 236, 230]);
      ground.rect(cx - 1, y, 2, 1, [96, 98, 104]);                 // median
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

  // Trường Tiền: the deck, flanked by six silver-white truss arches. By day
  // it's all silver; at night its lighting gives each span its own colour.
  {
    const tx = 75, tw = 3;
    const x0 = tx * T, x1 = (tx + tw) * T;
    const y0 = BRIDGE_Y0, y1 = BRIDGE_Y1;
    plainBridge(tx, tw, y0, y1, [172, 168, 160], [132, 130, 126]);
    const spans = 6, spanLen = (y1 - y0) / spans;
    const steel = [226, 232, 236], steelShade = [158, 170, 180];
    // Huế purple first, then round the colour wheel, one per span.
    const spanLights = [[186, 120, 255], [96, 140, 255], [64, 214, 240], [96, 236, 150], [255, 220, 90], [255, 120, 180]];
    for (const side of [-1, 1]) {
      const base = side < 0 ? x0 - 1 : x1;
      for (let s = 0; s < spans; s++) {
        const sy = y0 + s * spanLen;
        for (let k = 0; k <= spanLen; k++) {
          // Arch bulging outward, drawn in oblique so it reads from above.
          const t = k / spanLen;
          const bulge = Math.round(Math.sin(t * Math.PI) * 6);
          const x = base + side * bulge;
          ground.set(x, sy + k, steel);
          ground.set(x + side, sy + k, steelShade);
          glow(x, sy + k, spanLights[s], k % 3 === 0 ? 2 : 1);
          night.set(x + side, sy + k, spanLights[s]);
          // Lattice: diagonals from the deck rail out to the arch.
          if (k % 4 === 0) for (let b = 0; b < bulge; b++) ground.set(base + side * b, sy + k + (b % 2), steelShade, 0.85);
        }
        ground.rect(base - 1, Math.floor(sy) - 1, 3, 3, steelShade); // pier cap where arches meet
      }
      for (let y = y0; y < y1; y++) ground.set(base, y, steel);   // rail chord
    }
  }

  // Cồn Hến footbridge, from the Gia Hội bank out to the islet.
  plankDeck(101, 39, 7, 2, true);

  // The dragon-boat wharf below the citadel, west of Phu Văn Lâu's landing, and
  // a boat moored alongside it.
  {
    plankDeck(48, 50, 2, 7);
    const x0 = 48 * T, x1 = 50 * T, y0 = 51 * T;
    for (const [px, py] of [[x0, y0], [x1 - 2, y0], [x0, y0 + 40], [x1 - 2, y0 + 40]]) ground.rect(px, py, 2, 3, [96, 66, 44]);
  }
  {
    const bx = 42.3 * T, by = 53 * T, bw = 88, bh = 18;
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
  stoneSpan(80, 48, 5, 2);
  // Over the An Cựu canal, where the south-bank roads meet it.
  for (const [x, w] of [[20, 2], [48, 3], [66, 3]]) stoneSpan(x, 71, w, 4);
}
