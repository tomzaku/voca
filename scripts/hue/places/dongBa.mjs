// Đông Ba and Gia Hội: the market on the river corner, the shophouses across
// the canal, and Cồn Hến's chè stall.

import { Canvas, mix } from '../core/canvas.mjs';
import { ROOF } from '../core/palette.mjs';
import { ground, place } from '../core/world.mjs';
import { HOUSE, facade, roof } from '../draw/buildings.mjs';
import { T } from '../layout.mjs';

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Gia Hội', x: 86, y: 5, place: 'giaHoi', theme: 'forest', anchor: 'left' },
];

export function drawDongBa() {
  // Đông Ba market: a long cream hall with stall awnings and the clock gable,
  // on the corner where the Đông Ba canal meets the river.
  {
    const w = 12, h = 7;
    const cv = new Canvas(w * T, h * T);
    const pw = w * T, ph = h * T;
    const bodyY = ph - 40;
    facade(cv, 2, bodyY, pw - 4, 40, { wall: [232, 220, 192], windows: true, windowStep: 12, glass: [70, 80, 84], doorW: 14, doorH: 16, doorFill: [70, 54, 44] });
    roof(cv, 2, bodyY - 26, pw - 4, 26, ROOF.terra, 7);
    const awn = [[176, 92, 80], [92, 140, 130], [212, 178, 92], [140, 108, 150]];
    for (let x = 6, i = 0; x < pw - 10; x += 14, i++) {
      if (Math.abs(x + 6 - pw / 2) < 18) continue;
      const c = awn[i % awn.length];
      for (let ax = 0; ax < 12; ax++) cv.rect(x + ax, bodyY + 18, 1, 6, ax % 4 < 2 ? c : mix(c, [255, 255, 255], 0.35));
    }
    const gx = pw / 2 - 20, gy = bodyY - 40;
    cv.rect(gx, gy + 6, 40, 38, [238, 228, 204]);
    cv.rect(gx, gy + 6, 40, 2, [206, 194, 168]);
    for (let i = 0; i < 20; i++) cv.rect(gx + i, gy + 6 - Math.floor(i / 3), 40 - i * 2, 1, [238, 228, 204]);
    cv.rect(gx + 18, gy - 2, 4, 2, [176, 92, 80]);
    cv.ellipse(pw / 2, gy + 18, 7, 7, [92, 80, 70]);
    cv.ellipse(pw / 2, gy + 18, 6, 6, [250, 246, 236]);
    cv.rect(pw / 2, gy + 13, 1, 6, [40, 36, 34]);
    cv.rect(pw / 2, gy + 18, 4, 1, [40, 36, 34]);
    cv.rect(gx + 8, gy + 30, 24, 4, [176, 92, 80]);
    place(cv, 85, 40, 4);
  }

  // Gia Hội: old shophouses along the lane, purely scenery.
  for (const [x, pal] of [[85, ROOF.dark], [90, ROOF.terra], [95, ROOF.moss]]) place(HOUSE(pal), x, 32, 2);
  for (const [x, y, pal] of [[86, 22, ROOF.plum], [92, 22, ROOF.dark], [88, 12, ROOF.terra], [95, 14, ROOF.moss]]) place(HOUSE(pal), x, y, 2);

  // Cồn Hến chè stall: a tiny hut with a striped awning, stools out front.
  {
    const cv = new Canvas(2 * T, 2 * T);
    cv.rect(3, 14, 26, 16, [196, 170, 128]);
    cv.rect(12, 20, 8, 10, [96, 70, 50]);
    for (let x = 0; x < 32; x++) cv.rect(x, 8, 1, 6, x % 6 < 3 ? [92, 140, 130] : [236, 232, 220]);
    roof(cv, 2, 3, 28, 5, ROOF.dark, 2);
    place(cv, 110, 38, 1, { shadow: false });
    for (const [sx, sy] of [[109.2, 40.3], [112.4, 40.2]]) ground.rect(sx * T, sy * T, 3, 3, [150, 110, 72]);
  }
}
