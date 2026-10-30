// The tomb hills: Tự Đức, Khải Định, Minh Mạng. Each faces the tombs' road
// along the bottom of the map; you go in at the bottom and climb towards the
// emperor, up the screen.

import { Canvas } from '../core/canvas.mjs';
import { P, ROOF } from '../core/palette.mjs';
import { ground, mark, place, solid, used } from '../core/world.mjs';
import { archBridge, gateHouse, hall, roof, wallRing } from '../draw/buildings.mjs';
import { STONE, biDinh, obelisk, statue, steps, terrace } from '../draw/tomb.mjs';
import { pine } from '../draw/trees.mjs';
import { T } from '../layout.mjs';

/** Name a building's canvas, so the detailed renders (../hd) draw it as itself. */
const named = (cv, kind) => { cv.spec = { ...cv.spec, kind }; return cv; };

/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Lăng Tự Đức', x: 10, y: 111.9, place: 'tuDuc' },
  { text: 'Lăng Khải Định', x: 34.5, y: 111.9, place: 'khaiDinh' },
  { text: 'Lăng Minh Mạng', x: 79, y: 111.9, place: 'minhMang' },
];

export function drawTombs() {
  // ── Khải Định (Ứng Lăng): dark weathered concrete climbing the hillside —
  // dragon stairs from the road, the court of stone mandarins, elephants and
  // horses, the octagonal stele pavilion between two obelisks, and Cung Thiên
  // Định at the top. ──
  {
    const K = STONE.dark;
    const AXIS = [33, 34, 35];
    terrace(28, 101, 13, 6, K, AXIS);                          // Bái Đình, the honour court
    steps(33, 107, 3, 3, K, true);                            // the dragon stairs, down to the road
    for (const x of [32, 36]) { solid[107][x] = solid[108][x] = solid[109][x] = true; }
    for (const [x, kind] of [[29, 'mandarin'], [30, 'mandarin'], [38, 'mandarin'], [39, 'mandarin']]) for (const y of [102, 103, 104]) statue(x, y, kind, K);
    statue(29, 105, 'elephant', K); statue(39, 105, 'elephant', K);
    statue(30, 105, 'horse', K); statue(38, 105, 'horse', K);
    terrace(31, 93, 7, 4, K, []);
    terrace(30, 97, 9, 4, K, AXIS);
    steps(33, 100, 3, 1, K, true);
    obelisk(30, 100, K); obelisk(38, 100, K);
    place(named(biDinh(3, 3, K, ROOF.slate, true), 'biDinhKhaiDinh'), 33, 97, 1);
    // Cung Thiên Định: the palace at the top, a raised centre between two
    // wings, pillared, under a dark roof with ornate ridge ends.
    {
      const cv = new Canvas(7 * T, 4 * T);
      const pw = cv.w, ph = cv.h;
      cv.rect(4, ph - 30, pw - 8, 26, K.base);
      cv.rect(4, ph - 30, pw - 8, 2, K.light);
      for (let x = 8; x < pw - 8; x += 8) cv.rect(x, ph - 28, 3, 22, K.light);
      cv.rect(pw / 2 - 14, ph - 40, 28, 36, K.face);
      cv.rect(pw / 2 - 6, ph - 26, 12, 22, [44, 42, 40]);
      cv.rect(pw / 2 - 4, ph - 24, 8, 4, [214, 186, 110]);    // a glint of the gilded hall inside
      roof(cv, 0, ph - 44, pw, 14, ROOF.slate, 5);
      roof(cv, pw / 2 - 20, ph - 58, 40, 14, ROOF.slate, 5);
      for (const x of [6, pw - 10]) cv.rect(x, ph - 50, 4, 8, K.face);  // ridge-end finials
      place(named(cv, 'thienDinh'), 31, 93, 2);
    }
    mark(used, 27, 92, 15, 18);
  }

  // ── Tự Đức (Khiêm Lăng): a walled garden more than a tomb, where the
  // emperor came to read and write poems — Lưu Khiêm lake with Xung Khiêm
  // pavilion on its shore, Hòa Khiêm temple, and to the east the tomb itself:
  // the honour court, the stele pavilion, the obelisks, the little crescent
  // pond and the walled grave. ──
  {
    const O = STONE.old;
    const TD = { x0: 2, y0: 94, x1: 19, y1: 110 };
    wallRing(TD, (tx, ty) => ty === TD.y1 - 1 && (tx === 9 || tx === 10));
    place(named(gateHouse(), 'tombGate'), 8, TD.y1 - 3, 1, { gaps: [9, 10], shadow: false });   // Vụ Khiêm Môn
    // Xung Khiêm Tạ on the lake's north shore, its front on stilts in the water.
    {
      const cv = new Canvas(3 * T, 3 * T);
      for (let x = 6; x < 44; x += 6) cv.rect(x, 38, 2, 10, [96, 70, 50]);
      cv.rect(4, 32, 40, 6, [170, 120, 80]);
      for (let x = 8; x < 42; x += 8) cv.rect(x, 22, 2, 10, [176, 52, 40]);
      roof(cv, 2, 8, 44, 14, ROOF.dark, 5);
      place(named(cv, 'xungKhiem'), 6, 98, 1, { shadow: false });
    }
    // Hòa Khiêm, where Tự Đức worked and where he is honoured.
    place(named(hall({ w: 5, h: 3, roofRows: 2, roofPal: ROOF.imperial, wall: [150, 46, 38], pillar: [196, 70, 52], pillarStep: 7, doorW: 8, doorFill: [60, 30, 24] }), 'tombHall'), 3, 95, 1);
    // The tomb, east: the honour court's statues, the obelisks, the stele.
    for (const y of [104, 105, 106]) { statue(13, y, 'mandarin', O); statue(17, y, 'mandarin', O); }
    obelisk(13, 103, O); obelisk(17, 103, O);
    place(named(biDinh(3, 3, O, ROOF.dark), 'biDinh'), 14, 99, 1);
    // Tiểu Khiêm, the crescent pond, and the walled grave beyond it.
    for (let x = 13 * T; x < 18 * T; x++) {
      const y = 98 * T + 6 + Math.round(Math.abs(x - 15.5 * T) * 0.2);
      ground.rect(x, y, 1, 4, P.water);
      ground.set(x, y, P.waterShallow);
    }
    {
      const cv = new Canvas(5 * T, 3 * T);
      cv.rect(4, 14, 72, 30, O.face);
      cv.rect(8, 18, 64, 22, O.base);
      cv.ellipse(40, 29, 18, 8, [96, 132, 70]);              // the grassed mound
      cv.ellipse(38, 27, 10, 4, [118, 156, 84]);
      cv.rect(36, 40, 8, 4, [70, 60, 50]);                   // its bronze door
      place(named(cv, 'grave'), 13, 95, 2);
    }
    pine(4, 107); pine(16, 108); pine(12, 96);
    mark(used, TD.x0, TD.y0, TD.x1 - TD.x0, TD.y1 - TD.y0);
  }

  // ── Minh Mạng (Hiếu Lăng): everything on one long axis — Đại Hồng Môn, the
  // honour court, the stele pavilion, Sùng Ân temple, Minh Lâu, then over the
  // crescent of Tân Nguyệt on a stone bridge to the round walled tomb; the two
  // Trừng Minh lakes either side. ──
  {
    const O = STONE.old;
    const MM = { x0: 70, y0: 90, x1: 89, y1: 110 };
    wallRing(MM, (tx, ty) => ty === MM.y1 - 1 && (tx === 78 || tx === 79));
    // Đại Hồng Môn: three arches, the middle one the emperor's.
    {
      const cv = new Canvas(6 * T, 3 * T);
      const pw = cv.w;
      cv.rect(0, 22, pw, 26, [176, 62, 46]);
      for (const [cx, aw] of [[pw / 2, 26], [18, 12], [pw - 18, 12]]) cv.rect(cx - aw / 2, 48 - (aw > 20 ? 22 : 16), aw, aw > 20 ? 22 : 16, [52, 30, 26]);
      roof(cv, 2, 8, pw - 4, 14, ROOF.imperial, 5);
      roof(cv, pw / 2 - 18, 0, 36, 10, ROOF.imperial, 3);
      place(named(cv, 'daiHongMon'), 76, MM.y1 - 3, 1, { gaps: [78, 79], shadow: false });
    }
    for (const y of [106, 107, 108]) for (const x of [74, 75, 82, 83]) statue(x, y, y === 108 && (x === 74 || x === 83) ? 'elephant' : 'mandarin', O);
    terrace(76, 103, 6, 3, O, [76, 81]);
    place(named(biDinh(4, 3, O, ROOF.imperial), 'biDinhMinhMang'), 77, 102, 1);
    // Sùng Ân, where the emperor and empress are honoured.
    place(named(hall({ w: 4, h: 3, roofRows: 2, roofPal: ROOF.imperial, wall: [150, 46, 38], pillar: [196, 70, 52], pillarStep: 6, doorW: 8, doorFill: [60, 30, 24] }), 'tombHall'), 77, 99, 1);
    // Minh Lâu: the two-storey pavilion of light, on its own little terrace.
    {
      const cv = new Canvas(4 * T, 3 * T);
      cv.rect(4, 38, 56, 10, O.base);
      cv.rect(4, 38, 56, 2, O.light);
      cv.rect(14, 26, 36, 12, [150, 46, 38]);
      for (let x = 16; x < 48; x += 6) cv.rect(x, 26, 2, 12, [214, 170, 80]);
      roof(cv, 8, 18, 48, 9, ROOF.imperial, 4);
      cv.rect(20, 10, 24, 8, [150, 46, 38]);
      roof(cv, 14, 2, 36, 9, ROOF.imperial, 4);
      place(named(cv, 'minhLau'), 77, 96, 1);
    }
    archBridge(78, 93, 2, 3, 'ns');                               // Trung Đạo, over Tân Nguyệt
    // Bửu Thành: the round wall about the tomb mound, its pines.
    {
      const cx = 79 * T, cy = 92.1 * T;
      ground.ellipse(cx, cy, 2.6 * T, 1.4 * T, O.face);
      ground.ellipse(cx, cy - 1, 2.4 * T, 1.25 * T, O.base);
      ground.ellipse(cx, cy - 2, 2 * T, 1 * T, [92, 130, 66]);
      ground.ellipse(cx - 6, cy - 6, 0.9 * T, 0.4 * T, [118, 156, 84]);
      for (let ty = 91; ty <= 93; ty++) for (let tx = 76; tx <= 81; tx++) {
        if (((tx + 0.5) * T - cx) ** 2 / (2.6 * T) ** 2 + ((ty + 0.5) * T - cy) ** 2 / (1.4 * T) ** 2 <= 1.1 && !(tx >= 78 && tx <= 79 && ty === 93)) solid[ty][tx] = true;
      }
    }
    pine(72, 93); pine(86, 93); pine(72, 106); pine(86, 106);
    mark(used, MM.x0, MM.y0, MM.x1 - MM.x0, MM.y1 - MM.y0);
  }
}
