// The Imperial City (Hoàng Thành): the way to the throne hall, Thái Hòa on
// its terrace, the Forbidden City behind it, the queen mothers' palaces, the
// dynastic temples and the royal garden.

import { Canvas } from '../core/canvas.mjs';
import { P, ROOF } from '../core/palette.mjs';
import { ground, mark, place, solid, used } from '../core/world.mjs';
import { hall, palace, roof } from '../draw/buildings.mjs';
import { T } from '../layout.mjs';

/** Name a building's canvas, so the detailed renders (../hd) draw it as
 *  itself rather than as a generic hall. */
const named = (cv, kind) => { cv.spec = { kind }; return cv; };

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Điện Thái Hòa', x: 55, y: 24.2, place: 'thaiHoa' },
  { text: 'Tử Cấm Thành', x: 55, y: 17.3, place: 'tuCamThanh' },
  { text: 'Cung Trường Sanh', x: 45, y: 17.3, place: 'truongSanh' },
  { text: 'Cung Diên Thọ', x: 45.5, y: 24.3, place: 'dienTho' },
  { text: 'Thái Miếu', x: 64.5, y: 24.3, place: 'thaiMieu' },
  { text: 'Duyệt Thị Đường', x: 65, y: 17.3, place: 'duyetThiDuong' },
  { text: 'Thế Miếu', x: 46, y: 31, place: 'theMieu' },
  { text: 'Hiển Lâm Các', x: 46, y: 35, place: 'hienLam' },
];

export function drawImperialCity() {
  // Trung Đạo: the central path crossing Thái Dịch lake on a bridge, red
  // railings either side.
  for (let y = 31 * T; y < 33 * T; y++) {
    for (const x of [54 * T - 1, 56 * T]) ground.set(x, y, [176, 52, 40]);
    if (y % 6 === 0) for (const x of [54 * T - 2, 56 * T + 1]) { ground.set(x, y, [214, 170, 80]); ground.set(x, y + 1, [214, 170, 80]); }
  }
  // Đại Triều Nghi: the court's courtyard before Thái Hòa — rank stones in two
  // rows where the mandarins stood, by grade.
  for (let i = 0; i < 6; i++) for (const x0 of [47, 58]) {
    const x = (x0 + i * 0.9) * T, y = 30 * T + 5;
    ground.rect(x, y, 3, 6, [196, 190, 176]);
    ground.rect(x, y, 3, 1, [222, 216, 204]);
    ground.rect(x, y + 6, 3, 1, P.shadow, 0.3);
  }

  // Thế Miếu, the dynastic temple, in the Imperial City's south-west corner;
  // before it the nine bronze urns of Cửu Đỉnh in a row, and Hiển Lâm Các, the
  // three-tiered pavilion of merit, nearest Ngọ Môn.
  place(named(hall({ w: 6, h: 3, roofRows: 2, roofPal: ROOF.imperial, wall: [150, 46, 38], pillar: [196, 70, 52], pillarStep: 7, doorW: 8, doorFill: [60, 30, 24] }), 'theMieu'), 43, 31, 1);
  for (let i = 0; i < 9; i++) {
    const cx = 43.4 * T + i * 10.5, cy = 34.6 * T;
    ground.ellipse(cx, cy + 6, 4, 1.5, P.shadow, 0.25);
    ground.rect(cx - 3, cy + 3, 1, 3, [70, 60, 44]); ground.rect(cx + 2, cy + 3, 1, 3, [70, 60, 44]);   // legs
    ground.ellipse(cx, cy, 4, 3.5, [104, 90, 62]);
    ground.ellipse(cx - 1, cy - 1, 2, 1.5, [150, 132, 92]);
    ground.rect(cx - 4, cy - 4, 8, 1, [84, 72, 50]);                                                  // rim
    ground.set(cx - 5, cy - 3, [84, 72, 50]); ground.set(cx + 4, cy - 3, [84, 72, 50]);                // handles
  }
  {
    const cv = new Canvas(2 * T, 4 * T);
    const red = [150, 46, 38], col = [196, 70, 52];
    cv.rect(3, 54, 26, 10, [180, 172, 160]);
    cv.rect(3, 54, 26, 2, [204, 196, 184]);
    for (const [y, w, roofY, roofH] of [[44, 22, 38, 7], [30, 16, 24, 7], [16, 10, 9, 8]]) {
      const x = 16 - w / 2;
      cv.rect(x, y, w, 10, red);
      for (let px = x + 1; px < x + w - 1; px += 4) cv.rect(px, y, 1, 10, col);
      roof(cv, x - 3, roofY, w + 6, roofH, ROOF.imperial, 3);
    }
    place(cv, 45, 35, 1);
  }

  // The royal garden in the south-east corner: stone lanterns along its paths
  // (its trees are planted with the others).
  for (const [tx, ty] of [[62.3, 32.4], [66.3, 32.4], [62.3, 36.6], [66.3, 36.6], [64.3, 38.4]]) {
    const x = tx * T, y = ty * T;
    ground.ellipse(x + 3, y + 10, 4, 1.5, P.shadow, 0.25);
    ground.rect(x + 1, y + 6, 5, 4, [168, 162, 150]);                      // base
    ground.rect(x + 2, y + 2, 3, 4, [190, 184, 172]);                      // light box
    ground.rect(x + 3, y + 3, 1, 2, [250, 214, 120]);                      // the flame
    ground.rect(x, y, 7, 2, [140, 134, 124]);                              // cap
    ground.set(x + 3, y - 1, [140, 134, 124]);
  }

  // Điện Thái Hòa, the throne hall, on its two-level stone terrace: a wide
  // double roof in imperial yellow over rows of red lacquered columns, gold
  // between them, steps up the middle to the court.
  {
    const w = 12, h = 6;
    const cv = new Canvas(w * T, h * T);
    const pw = w * T, ph = h * T;
    const stone = [196, 190, 176], stoneLight = [222, 216, 204], stoneDark = [150, 144, 132];
    const level = (x, y, lw, lh) => {
      cv.rect(x, y, lw, lh, stone);
      cv.rect(x, y, lw, 2, stoneLight);
      cv.rect(x, y + lh - 4, lw, 4, stoneDark);
      for (let px = x + 3; px < x + lw - 3; px += 6) cv.rect(px, y + lh - 4, 2, 1, stoneLight); // balusters
    };
    level(0, ph - 26, pw, 26);                    // the lower terrace
    level(10, ph - 44, pw - 20, 20);              // the upper terrace
    for (let y = ph - 44; y < ph; y += 3) cv.rect(pw / 2 - 10, y, 20, 2, y % 6 === 0 ? stoneLight : stoneDark);  // steps
    for (const sx of [pw / 2 - 12, pw / 2 + 10]) cv.rect(sx, ph - 44, 2, 44, [176, 150, 90]);                  // dragon rails
    // The hall: red columns, gold panels, a dark doorway on the axis.
    const hy = ph - 64, hx = 22, hw = pw - 44;
    cv.rect(hx, hy, hw, 22, [150, 40, 32]);
    for (let x = hx + 2; x < hx + hw - 2; x += 8) { cv.rect(x, hy + 2, 3, 20, [196, 64, 48]); cv.rect(x + 4, hy + 4, 3, 6, [226, 178, 64]); }
    cv.rect(pw / 2 - 8, hy + 6, 16, 16, [60, 28, 22]);
    cv.rect(hx, hy, hw, 3, [100, 30, 26]);
    roof(cv, 14, hy - 16, pw - 28, 16, ROOF.imperial, 6);     // lower roof
    cv.rect(40, hy - 26, pw - 80, 10, [150, 40, 32]);
    for (let x = 42; x < pw - 42; x += 6) cv.rect(x, hy - 26, 2, 10, [226, 178, 64]);
    roof(cv, 30, hy - 40, pw - 60, 16, ROOF.imperial, 6);     // upper roof
    // Dragons along the ridge.
    for (const dx of [-1, 1]) { cv.rect(pw / 2 + dx * 30 - 2, hy - 46, 5, 3, [236, 196, 90]); cv.rect(pw / 2 + dx * 34, hy - 48, 2, 3, [236, 196, 90]); }
    cv.rect(pw / 2 - 3, hy - 46, 6, 3, [236, 196, 90]);
    place(cv, 49, 24, 3);
  }

  // Tử Cấm Thành, the Purple Forbidden City, behind Thái Hòa: the emperor's own
  // household inside a low red wall, Đại Cung Môn on the axis, Cần Chánh hall
  // facing it and the two side halls.
  {
    const FC = { x0: 48, y0: 17, x1: 63, y1: 23 };
    const red = [166, 62, 46], redTop = [196, 92, 66], redLine = [132, 48, 36];
    for (let ty = FC.y0; ty < FC.y1; ty++) {
      for (let tx = FC.x0; tx < FC.x1; tx++) {
        const ring = ty === FC.y0 || ty === FC.y1 - 1 || tx === FC.x0 || tx === FC.x1 - 1;
        if (!ring || (ty === FC.y1 - 1 && (tx === 54 || tx === 55))) continue;
        solid[ty][tx] = true;
        const front = ty === FC.y1 - 1 || ty === FC.y0;
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          const px = tx * T + x, py = ty * T + y;
          let c = front && y >= 9 ? ((y % 3 === 0) ? redLine : red) : redTop;
          if (!front && (x < 3 || x > 12)) c = red;
          if (front && y < 2 && x % 4 < 2) c = red;
          if (!front && x >= 3 && x <= 12 && y % 8 === 0) c = [226, 178, 64];
          ground.set(px, py, c);
        }
      }
    }
    mark(used, FC.x0, FC.y0, FC.x1 - FC.x0, FC.y1 - FC.y0);
    // Đại Cung Môn: the gate on the axis.
    {
      const cv = new Canvas(4 * T, 3 * T);
      cv.rect(0, 28, 64, 20, red);
      cv.rect(17, 30, 30, 18, [52, 30, 26]);
      roof(cv, 4, 12, 56, 14, ROOF.imperial, 4);
      cv.rect(8, 24, 48, 4, [150, 40, 32]);
      place(named(cv, 'daiCungMon'), 53, FC.y1 - 3, 1, { gaps: [54, 55], shadow: false });
    }
    // Cần Chánh, where the emperor held court on ordinary days, and the halls
    // either side.
    place(named(hall({ w: 6, h: 3, roofRows: 2, roofPal: ROOF.imperial, wall: [150, 40, 32], pillar: [196, 64, 48], pillarStep: 6, doorW: 10, doorFill: [60, 28, 22] }), 'canChanh'), 52, 18, 1);
    for (const x of [49, 59]) place(named(hall({ w: 3, h: 3, roofRows: 2, roofPal: ROOF.glazed, wall: [150, 40, 32], pillar: [196, 64, 48], pillarStep: 6, doorW: 6, doorFill: [60, 28, 22] }), 'sideHall'), x, 18, 1);
  }

  // The palaces of the queen mothers on the west side — Cung Trường Sanh in
  // its garden, Cung Diên Thọ below it — and Thái Miếu, the temple of the
  // Nguyễn lords, on the east.
  {
    const palaceHall = (w, roofPal) => hall({ w, h: 4, roofRows: 2, roofPal, wall: [150, 40, 32], pillar: [196, 64, 48], pillarStep: 7, doorW: 8, doorFill: [60, 28, 22] });
    place(named(palaceHall(4, ROOF.glazed), 'truongSanh'), 43, 17, 2);
    place(named(palaceHall(5, ROOF.imperial), 'dienTho'), 43, 24, 2);
    place(named(palaceHall(5, ROOF.imperial), 'thaiMieu'), 62, 24, 2);
    // Trường Sanh's garden pond.
    ground.ellipse(46 * T, 22 * T - 2, 14, 5, P.water);
    ground.ellipse(46 * T, 22 * T - 2, 10, 3, P.waterShallow);
  }

  // Duyệt Thị Đường, the royal theatre, where Nhã nhạc court music played and
  // tuồng was staged for the court: east of the Forbidden City, as it stands
  // — a red hall under a two-tier roof, drums at its door.
  {
    const cv = palace({ w: 4, h: 5, roofPal: ROOF.imperial, wall: [120, 36, 30], pillar: [214, 170, 80] });
    for (const dx of [4, cv.w - 16]) {
      cv.ellipse(dx + 6, cv.h - 10, 6, 5, [170, 60, 44]);
      cv.ellipse(dx + 6, cv.h - 12, 5, 3, [236, 214, 170]);
    }
    place(named(cv, 'duyetThiDuong'), 63, 17, 3);
  }
}
