// Kim Long, upriver: Thiên Mụ pagoda, Văn Miếu and its stelae, An Hiên (your
// home), and the garden houses.

import { Canvas, mix } from '../core/canvas.mjs';
import { ROOF } from '../core/palette.mjs';
import { ground, place } from '../core/world.mjs';
import { hall, roof } from '../draw/buildings.mjs';
import { T } from '../layout.mjs';

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Kim Long', x: 4, y: 4.5, place: 'kimLong', theme: 'forest', anchor: 'left' },
  { text: 'Chùa Thiên Mụ', x: 6, y: 39.5, place: 'thienMu' },
];

export function drawKimLong() {
  // Thiên Mụ: the seven-storey Phước Duyên tower beside its temple hall.
  {
    const w = 4, h = 10;
    const cv = new Canvas(w * T, h * T);
    const pw = w * T, ph = h * T;
    const brick = [204, 140, 112], brickShade = [176, 112, 88], ledge = [96, 82, 76], ledgeLight = [126, 110, 100];
    cv.rect(2, ph - 8, pw - 4, 8, [178, 172, 162]);
    cv.rect(2, ph - 8, pw - 4, 2, [200, 194, 184]);
    let y = ph - 8;
    for (let tier = 0; tier < 7; tier++) {
      const tw = 44 - tier * 4, th = 15 - tier;
      const x = Math.round((pw - tw) / 2);
      y -= th;
      cv.rect(x, y, tw, th, brick);
      cv.rect(x + tw - 5, y, 5, th, brickShade);               // octagon: shaded east facet
      cv.rect(x + 4, y, 2, th, mix(brick, [255, 255, 255], 0.12));
      const ww = 4, wh = Math.max(4, th - 7);
      cv.rect(Math.round(pw / 2 - ww / 2), y + th - wh - 2, ww, wh, [60, 44, 40]); // arched niche
      cv.rect(x - 3, y - 3, tw + 6, 3, ledge);
      cv.rect(x - 3, y - 3, tw + 6, 1, ledgeLight);
      cv.set(x - 4, y - 4, ledge); cv.set(x + tw + 3, y - 4, ledge);
      y -= 3;
    }
    cv.rect(pw / 2 - 2, y - 6, 4, 6, [210, 170, 80]);
    cv.rect(pw / 2 - 1, y - 10, 2, 4, [230, 196, 100]);
    place(cv, 4, 37, 2);
  }
  place(hall({ w: 5, h: 5, roofRows: 3, roofPal: ROOF.dark, wall: [226, 214, 186], pillar: [150, 60, 46], pillarStep: 10 }), 9, 42, 2);

  // Văn Miếu: the temple of literature, its hall flanked by stele pavilions —
  // the stone tablets that carried the names of the laureates.
  {
    place(hall({ w: 6, h: 5, roofRows: 3, roofPal: ROOF.dark, wall: [150, 54, 40], pillar: [196, 160, 96], pillarStep: 9, doorW: 10 }), 17, 39, 2);
    for (const x of [14, 24]) {
      const cv = new Canvas(2 * T, 3 * T);
      cv.rect(6, 22, 20, 22, [150, 148, 142]);                // the stele
      cv.rect(8, 24, 16, 18, [122, 120, 116]);
      for (let y = 27; y < 40; y += 3) cv.rect(10, y, 12, 1, [168, 166, 160]); // carved lines
      for (const px of [2, 27]) cv.rect(px, 18, 3, 28, [160, 50, 40]);
      roof(cv, 2, 8, 28, 10, ROOF.dark, 3);
      place(cv, x, 41, 1);
    }
  }

  // An Hiên — your home: a bigger garden house with flower beds.
  {
    const cv = hall({ w: 6, h: 5, roofRows: 3, roofPal: ROOF.terra, wall: [120, 82, 58], pillar: [96, 62, 44], pillarStep: 9, doorW: 8, doorFill: [60, 40, 30], windows: true, windowStep: 12, windowFrame: [196, 160, 110], glass: [80, 64, 50] });
    place(cv, 10, 7, 3);
    for (const fx of [10 * T + 6, 10 * T + 66]) {
      ground.rect(fx, 12 * T - 1, 20, 1, [120, 90, 64]);
      for (let i = 0; i < 9; i++) ground.set(fx + 2 + i * 2, 12 * T - 3, [[236, 150, 178], [250, 214, 110], [190, 150, 220]][i % 3]);
    }
  }

  // Eight Kim Long garden houses for collections: two rows of four.
  const HOUSE_X = [5, 10, 15, 20];
  const HOUSE_ROWS = [18, 27];
  const HOUSE_ROOFS = [ROOF.dark, ROOF.terra, ROOF.moss, ROOF.plum];
  HOUSE_ROWS.forEach((y, r) => HOUSE_X.forEach((x, i) => {
    place(hall({
      w: 4, h: 4, roofRows: 2, roofPal: HOUSE_ROOFS[(i + r) % HOUSE_ROOFS.length],
      wall: [124, 86, 62], pillar: [98, 66, 46], pillarStep: 8, doorW: 6, doorFill: [62, 42, 32],
    }), x, y, 2);
  }));
}
