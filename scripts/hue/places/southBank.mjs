// The south bank: Ga Huế, Quốc Học, Lê Lợi park, the walking street, Cung An
// Định, the houses of Vỹ Dạ, and Ngự Bình hill.

import { Canvas, hash, mix } from '../core/canvas.mjs';
import { P, ROOF } from '../core/palette.mjs';
import { ground, mark, place, solid, used } from '../core/world.mjs';
import { HOUSE, facade, hall, palace, roof } from '../draw/buildings.mjs';
import { T } from '../layout.mjs';

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Ga Huế', x: 27.5, y: 68.5, place: 'gaHue' },
  { text: 'Trường Quốc Học', x: 41, y: 67.5, place: 'quocHoc' },
  { text: 'Cung An Định', x: 92, y: 73.5, place: 'anDinh' },
  { text: 'Vỹ Dạ', x: 108, y: 61, place: 'vyDa', theme: 'forest', anchor: 'left' },
  { text: 'Ngự Bình', x: 52, y: 91.6, place: 'nguBinh', theme: 'forest', anchor: 'left' },
];

export function drawSouthBank() {
  // Ga Huế: the cream railway station, with its tracks running west–east.
  {
    for (let x = 6 * T; x < 47 * T; x++) {
      for (let y = 74 * T + 2; y < 76 * T - 2; y++) ground.set(x, y, mix([150, 140, 126], [130, 120, 108], hash(x, y) * 0.6));
      if (x % 6 < 2) ground.rect(x, 74 * T + 4, 2, T * 2 - 8, [104, 80, 60]);   // sleepers
      ground.set(x, 74 * T + 9, [96, 100, 108]);
      ground.set(x, 75 * T + 6, [96, 100, 108]);
    }
    mark(used, 6, 74, 41, 2);
    const cv = hall({ w: 9, h: 5, roofRows: 2, roofPal: ROOF.terra, wall: [236, 222, 186], pillar: [196, 170, 120], pillarStep: 12, windows: true, windowStep: 11, doorW: 12, doorFill: [80, 64, 50] });
    // A little clock tower over the door.
    cv.rect(cv.w / 2 - 10, 2, 20, 26, [240, 228, 196]);
    cv.ellipse(cv.w / 2, 12, 5, 5, [250, 246, 236]);
    cv.rect(cv.w / 2, 8, 1, 4, [40, 36, 34]);
    cv.spec = { kind: 'gaHue' };
    place(cv, 23, 68, 3);
  }

  // Quốc Học: the maroon colonial school with white trim and a portico.
  {
    const w = 12, h = 5;
    const cv = new Canvas(w * T, h * T);
    const pw = w * T, ph = h * T;
    const bodyY = ph - 44;
    facade(cv, 2, bodyY, pw - 4, 44, {
      wall: [156, 60, 52], windows: true, windowStep: 11, windowFrame: [240, 236, 226], glass: [64, 104, 88], door: false,
    });
    for (let x = 2; x < pw - 2; x += 22) cv.rect(x, bodyY + 2, 2, 40, [236, 230, 218]);
    cv.rect(2, bodyY + 20, pw - 4, 2, [236, 230, 218]);
    for (let wx = 7; wx < pw - 10; wx += 11) {
      if (Math.abs(wx - pw / 2) < 20) continue;
      cv.rect(wx, bodyY + 25, 5, 8, [240, 236, 226]);
      cv.rect(wx + 1, bodyY + 26, 3, 6, [64, 104, 88]);
    }
    roof(cv, 2, bodyY - 30, pw - 4, 30, ROOF.slate, 8);
    const px = pw / 2 - 18;
    cv.rect(px, bodyY - 4, 36, 48, [156, 60, 52]);
    for (let x = px + 2; x < px + 36; x += 8) cv.rect(x, bodyY + 6, 3, 36, [244, 240, 232]);
    for (let i = 0; i < 12; i++) cv.rect(px + i * 1.5, bodyY - 4 - i, 36 - i * 3, 1, [240, 236, 226]);
    cv.rect(px - 2, bodyY + 4, 40, 3, [240, 236, 226]);
    cv.rect(pw / 2 - 5, bodyY + 30, 10, 12, [60, 40, 32]);
    cv.spec = { kind: 'quocHoc' };
    place(cv, 35, 67, 3);
  }

  // Lê Lợi park: flower beds between the bridges.
  for (const [x, y] of [[53, 68], [59, 68], [53, 71], [59, 71]]) {
    ground.rect(x * T, y * T, 3 * T, T + 6, [120, 90, 64]);
    for (let i = 0; i < 20; i++) ground.set(x * T + 3 + (i % 10) * 4, y * T + 4 + Math.floor(i / 10) * 8, [[236, 150, 178], [250, 214, 110], [190, 150, 220], [240, 240, 236]][i % 4]);
    mark(used, x, y, 3, 2);
  }

  // Shophouses east of Hùng Vương, the old Phố Tây.
  for (const [x, pal] of [[71, ROOF.terra], [76, ROOF.dark], [81, ROOF.plum]]) place(HOUSE(pal, [222, 206, 176]), x, 71, 2);

  // Cung An Định: the European-style palace on the An Cựu canal.
  {
    const cv = palace({ w: 8, h: 5, roofPal: ROOF.slate, wall: [234, 220, 190], pillar: [196, 172, 120] });
    cv.spec = { kind: 'anDinh' };
    place(cv, 88, 73, 3);
  }


  // Ngự Bình: the flat-topped "royal screen" hill, with pines.
  const HILL = { cx: 57 * T, cy: 88.2 * T, rx: 7 * T, ry: 3.8 * T };
  {
    const { cx, cy, rx, ry } = HILL;
    for (let y = Math.floor(cy - ry); y < cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
        const e = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
        if (e > 1) continue;
        const top = ((x + 0.5 - cx) / (rx * 0.82)) ** 2 + ((y + 0.5 - (cy - ry * 0.22)) / (ry * 0.62)) ** 2 <= 1;
        const base = top ? [138, 176, 104] : mix([104, 140, 84], [84, 118, 74], (y - cy + ry) / (2 * ry));
        ground.set(x, y, hash(x, y) < 0.03 ? P.fleckDark : base);
      }
    }
    for (let ty = Math.floor((cy - ry) / T); ty <= Math.floor((cy + ry) / T); ty++) {
      for (let tx = Math.floor((cx - rx) / T); tx <= Math.floor((cx + rx) / T); tx++) {
        const e = ((tx + 0.5) * T - cx) ** 2 / rx ** 2 + ((ty + 0.5) * T - cy) ** 2 / ry ** 2;
        if (e <= 1.05 && solid[ty]) { solid[ty][tx] = true; used[ty][tx] = true; }
      }
    }
  }
}
