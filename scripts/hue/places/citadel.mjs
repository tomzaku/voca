// The Citadel (Kinh Thành): walls and moats, the ten gates, Ngọ Môn and Kỳ
// Đài, Phu Văn Lâu on the river — and, inside the walls, the library on its
// island, Tịnh Tâm, the houses and the royal theatre.

import { Canvas, mix } from '../core/canvas.mjs';
import { P, ROOF } from '../core/palette.mjs';
import { ground, place } from '../core/world.mjs';
import { HOUSE, archBridge, citadelGate, palace, plankDeck, roof, stoneSpan, wallRing } from '../draw/buildings.mjs';
import { BASTION, CITADEL, EAST_GATE_Y, GATES, IMPERIAL, LIBRARY, NGO_MON, SOUTH_GATES, T, gatesOn } from '../layout.mjs';

/** Where the streak flag flies on Kỳ Đài, worked out as it's drawn. */
/** Its names on the map (see meta.mjs). */
export const LABELS = [
  { text: 'Ngọ Môn', x: 55, y: 34.5, place: 'ngoMon' },
  { text: 'Kỳ Đài', x: 55, y: 44, place: 'kyDai' },
  { text: 'Phu Văn Lâu', x: 55, y: 50, place: 'phuVanLau' },
  { text: 'Nghênh Lương Đình', x: 55, y: 56.2, place: 'nghenhLuong' },
  { text: 'Tàng Thư Lâu', x: 36, y: 21, place: 'tangThuLau' },
  { text: 'Duyệt Thị Đường', x: 73, y: 13.2, place: 'duyetThiDuong' },
  { text: 'Hồ Tịnh Tâm', x: 55, y: 7.5, place: 'tinhTam' },
  // The gates, named just outside the wall.
  ...GATES.map((g) => ({
    text: g.label,
    place: g.place,
    ...(g.side === 'south' ? { x: g.at + 1, y: CITADEL.moat.y1 - 0.2 }
      : g.side === 'north' ? { x: g.at + 1, y: CITADEL.moat.y0 - 0.4 }
      : g.side === 'west' ? { x: CITADEL.moat.x0 - 2.5, y: g.at + 0.4 }
      : { x: CITADEL.moat.x1 + 2.5, y: g.at + 0.4 }),
  })),
];

export const FLAG = { x: 0, y: 0, drop: 0 };

export function drawCitadel() {
  const CW = { x0: CITADEL.wall.x0, y0: CITADEL.wall.y0, x1: CITADEL.wall.x1, y1: CITADEL.wall.y1 };
  const inGate = (side, v) => gatesOn(side).some((g) => v === g || v === g + 1);
  wallRing(CW, (tx, ty) =>
    (ty === CW.y1 - 1 && (inGate('south', tx) || (tx >= BASTION.x0 && tx < BASTION.x1)))
    || (ty === CW.y0 && inGate('north', tx))
    || (tx === CW.x0 && inGate('west', ty))
    || (tx === CW.x1 - 1 && inGate('east', ty)));
  const IW = IMPERIAL.wall;
  wallRing(IW, (tx, ty) => ty === IW.y1 - 1 && tx >= NGO_MON.x && tx < NGO_MON.x + NGO_MON.w);

  // Causeways over the moats at every gate.
  for (const g of SOUTH_GATES) archBridge(g, CITADEL.wall.y1, 2, CITADEL.moat.y1 - CITADEL.wall.y1, 'ns');
  for (const g of gatesOn('north')) archBridge(g, CITADEL.moat.y0, 2, 2, 'ns');
  for (const g of gatesOn('west')) archBridge(CITADEL.moat.x0, g, 2, 2, 'ew');
  for (const g of gatesOn('east')) archBridge(CITADEL.wall.x1, g, 2, 2, 'ew');
  // Kẻ Trài's lane on over the Đông Ba canal into Gia Hội.
  for (const g of gatesOn('east')) if (g !== EAST_GATE_Y) plankDeck(80, g, 5, 2, true);
  archBridge(54, IMPERIAL.wall.y1, 2, 1, 'ns');          // Trung Đạo, in front of Ngọ Môn

  // Gate houses on the front and back walls, their faces to the outside.
  for (const g of SOUTH_GATES) place(citadelGate(), g - 1, CITADEL.wall.y1 - 4, 1, { gaps: [g, g + 1], shadow: false });
  for (const g of gatesOn('north')) place(citadelGate(), g - 1, CITADEL.wall.y0 - 3, 1, { gaps: [g, g + 1], shadow: false });
  // On the side walls, where the passage runs across the view: a tower
  // standing on the wall itself, seen from above — a hipped roof with its ridge
  // along the wall, the tower's south face under the eaves. The road runs
  // through beneath it, so all of it is drawn over the buddy.
  for (const side of ['west', 'east']) {
    const wx = side === 'west' ? CITADEL.wall.x0 : CITADEL.wall.x1 - 1;
    for (const g of gatesOn(side)) {
      const cv = new Canvas(3 * T, 4 * T);
      const x0 = 10, x1 = 38, mid = 24, pal = ROOF.imperial;
      // The tower's south face below the eaves, weathered brick like the
      // front gates', red columns under the roof.
      for (let y = 47; y < 60; y++) for (let x = x0 + 2; x < x1 - 2; x++) cv.set(x, y, (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0) ? [118, 84, 68] : [146, 108, 88]);
      cv.rect(x0 + 2, 44, x1 - x0 - 4, 3, [150, 46, 38]);
      for (let x = x0 + 4; x < x1 - 3; x += 6) cv.rect(x, 44, 2, 3, [196, 64, 48]);
      // The roof: tiles running down either side from the ridge.
      for (let y = 6; y < 44; y++) for (let x = x0; x < x1; x++) {
        const d = Math.abs(x + 0.5 - mid);
        cv.set(x, y, d < 2 ? pal.ridge : x === x0 || x === x1 - 1 ? pal.eave : (x - x0) % 3 === 0 ? pal.line : x < mid ? mix(pal.base, pal.light, 0.25) : pal.base);
      }
      cv.rect(x0, 42, x1 - x0, 2, pal.eave);                       // the front eave
      cv.rect(x0 + 2, 6, x1 - x0 - 4, 2, pal.light);               // the back eave, catching the light
      for (const [x, y] of [[x0 - 2, 4], [x1, 4], [x0 - 2, 42], [x1, 42]]) cv.rect(x, y, 2, 2, pal.ridge); // upturned corners
      cv.rect(mid - 3, 2, 6, 4, pal.ridge);                        // ridge ends
      cv.rect(mid - 3, 42, 6, 3, pal.ridge);
      place(cv, wx - 1, g - 1, 0, { shadow: false });
    }
  }

  // Ngọ Môn: a stone base with three arches under the Five Phoenix pavilion.
  {
    const { w, h } = NGO_MON;
    const cv = new Canvas(w * T, h * T);
    const pw = w * T, ph = h * T;
    const baseY = ph - 40;
    const stone = [170, 162, 150], stoneLine = [146, 138, 128];
    cv.rect(0, baseY, pw, 40, stone);
    for (let y = baseY + 4; y < ph; y += 5) for (let x = 0; x < pw; x++) if ((x + (y % 10 < 5 ? 0 : 6)) % 12 === 0) cv.set(x, y, stoneLine);
    for (let y = baseY + 4; y < ph; y += 5) for (let x = 0; x < pw; x++) cv.set(x, y, stoneLine, 0.35);
    cv.rect(0, baseY, pw, 3, [190, 182, 170]);
    // Arches: the centre one is the passage the buddy walks through.
    const archAt = (cx, aw, ah) => {
      cv.rect(cx - aw / 2, ph - ah, aw, ah, [44, 36, 32]);
      cv.rect(cx - aw / 2 + 2, ph - ah - 2, aw - 4, 2, [44, 36, 32]);
    };
    archAt(pw / 2, 18, 22);
    archAt(pw / 2 - 40, 10, 16);
    archAt(pw / 2 + 40, 10, 16);
    // Lầu Ngũ Phụng: a long pavilion with red columns and a two-tier roof
    // (yellow in the middle, glazed green on the wings, as on the real gate).
    const pavY = baseY - 12;
    cv.rect(10, pavY, pw - 20, 12, [150, 46, 38]);
    for (let x = 12; x < pw - 12; x += 6) cv.rect(x, pavY, 2, 12, [196, 64, 50]);
    roof(cv, 6, pavY - 14, 52, 14, ROOF.glazed, 4);
    roof(cv, pw - 58, pavY - 14, 52, 14, ROOF.glazed, 4);
    roof(cv, 58, pavY - 18, pw - 116, 18, ROOF.imperial, 5);
    cv.rect(70, pavY - 26, pw - 140, 8, [150, 46, 38]);
    roof(cv, 64, 8, pw - 128, pavY - 34, ROOF.imperial, 5);
    place(cv, NGO_MON.x, NGO_MON.y, 3, { gaps: [54, 55] });
  }

  // Kỳ Đài: a three-tier brick bastion in the front wall with a tall flagpole.
  // Drawn after Ngọ Môn because it stands in front of it.
  {
    const bw = (BASTION.x1 - BASTION.x0) * T;
    const baseRows = BASTION.y1 - BASTION.y0;
    const cv = new Canvas(bw, (7 + baseRows) * T);   // 7 rows of pole above the base
    const baseY = 7 * T;
    const brick = [148, 90, 72], brickTop = [176, 116, 92], brickLine = [120, 70, 56];
    for (let tier = 0; tier < 3; tier++) {
      const ins = tier * 9, top = baseY + tier * 9;
      cv.rect(ins, top, bw - ins * 2, baseRows * T - tier * 9, brick);
      cv.rect(ins, top, bw - ins * 2, 3, brickTop);
      for (let y = top + 5; y < baseRows * T + baseY; y += 4) for (let x = ins; x < bw - ins; x++) if (x % 7 === (y % 8 < 4 ? 0 : 3)) cv.set(x, y, brickLine);
    }
    const poleX = bw / 2 - 1;
    cv.rect(poleX, 4, 2, baseY + 16, [214, 214, 210]);
    cv.set(poleX, 3, [236, 200, 90]); cv.set(poleX + 1, 3, [236, 200, 90]);
    cv.spec = { kind: 'kyDai' };
    place(cv, BASTION.x0, BASTION.y0 - 7, baseRows);
    // The flag itself isn't painted: WorldScene hoists it up this pole as the
    // learner's streak grows (the `flag` meta point: where it flies at the top,
    // and how far it can drop).
    const top = (BASTION.y0 - 7) * T + 6;
    FLAG.x = BASTION.x0 + (poleX + 2) / T;
    FLAG.y = top / T;
    FLAG.drop = baseY - 16 - 6;
  }

  // Across the road from Kỳ Đài, on a stone landing out over the river: Phu Văn
  // Lâu, the two-storey pavilion where royal edicts and exam results were
  // posted, and Nghênh Lương Đình, the little pavilion at the water's edge where
  // the court took the cool air — one behind the other on the axis that runs
  // from the throne hall through Ngọ Môn and Kỳ Đài down to the water.
  stoneSpan(51, 50, 8, 5);
  {
    const cv = new Canvas(4 * T, 3 * T);
    const red = [150, 46, 38], col = [196, 70, 52];
    cv.rect(2, 40, 60, 8, [184, 176, 164]);
    cv.rect(2, 40, 60, 2, [206, 198, 186]);
    for (let x = 6; x < 58; x += 8) cv.rect(x, 27, 3, 13, col);
    cv.rect(4, 26, 56, 2, red);
    roof(cv, 2, 19, 60, 8, ROOF.imperial, 3);
    cv.rect(16, 12, 32, 8, red);
    for (let x = 18; x < 46; x += 5) cv.rect(x, 12, 2, 8, col);
    roof(cv, 10, 4, 44, 9, ROOF.imperial, 4);
    place(cv, 53, 50, 1);
  }
  {
    const cv = new Canvas(2 * T, 2 * T);
    cv.rect(2, 24, 28, 8, [184, 176, 164]);
    cv.rect(2, 24, 28, 2, [206, 198, 186]);
    for (const x of [5, 15, 25]) cv.rect(x, 13, 2, 11, [196, 70, 52]);
    roof(cv, 1, 4, 30, 10, ROOF.imperial, 4);
    place(cv, 54, 53, 1);
    // Steps down into the river from its landing.
    for (let i = 0; i < 3; i++) ground.rect(55 * T - 6 + i * 2, 55 * T + i * 3, 14 - i * 4, 3, i % 2 ? P.stoneEdge : P.stone);
  }
}

export function drawCitadelGrounds() {
  // Tàng Thư Lâu: two storeys on a raised stone base, glazed green roofs, on
  // its island in Học Hải lake; a plank bridge crosses to it from the south.
  {
    plankDeck(LIBRARY.bridgeX, LIBRARY.lake.y + LIBRARY.lake.h - 2, 2, 2);
    const cv = palace({ w: 6, h: 5, roofPal: ROOF.glazed, wall: [134, 56, 42], pillar: [190, 152, 92] });
    const pw = cv.w, ph = cv.h;
    cv.rect(1, ph - 7, pw - 2, 7, [172, 164, 152]);
    cv.rect(1, ph - 7, pw - 2, 2, [196, 188, 176]);
    for (let x = 4; x < pw - 4; x += 6) cv.rect(x, ph - 4, 3, 2, [150, 142, 132]);
    for (const wx of [12, pw - 24]) {
      cv.rect(wx, ph - 26, 12, 12, [214, 186, 120]);
      for (let k = 0; k < 12; k += 3) { cv.rect(wx + k, ph - 26, 1, 12, [120, 84, 52]); cv.rect(wx, ph - 26 + k, 12, 1, [120, 84, 52]); }
    }
    place(cv, LIBRARY.island.x + 1, LIBRARY.island.y, 3);
  }

  // A small pavilion on Tịnh Tâm lake, a stone causeway out to it from the
  // south shore.
  stoneSpan(55, 10, 1, 3);
  {
    const cv = new Canvas(3 * T, 3 * T);
    cv.rect(4, 36, 40, 12, [184, 176, 164]);
    for (let x = 8; x < 42; x += 8) cv.rect(x, 26, 2, 10, [160, 50, 40]);
    roof(cv, 6, 12, 36, 14, ROOF.imperial, 4);
    place(cv, 54, 7, 3, { shadow: false });
  }

  // Kinh Thành neighbourhoods inside the walls.
  for (const [x, y, pal] of [[33, 7, ROOF.dark], [38, 7, ROOF.terra], [67, 7, ROOF.moss], [72, 7, ROOF.dark], [31, 33, ROOF.terra], [38, 33, ROOF.plum]]) {
    place(HOUSE(pal), x, y, 2);
  }

  // Duyệt Thị Đường: the royal theatre, where Nhã nhạc court music played —
  // a long red hall under a two-tier roof, drums at its door. A lane runs past
  // its east end, the way up to Tịnh Tâm lake.
  {
    const cv = palace({ w: 6, h: 5, roofPal: ROOF.imperial, wall: [120, 36, 30], pillar: [214, 170, 80] });
    for (const dx of [18, cv.w - 30]) {
      cv.ellipse(dx + 6, cv.h - 10, 6, 5, [170, 60, 44]);
      cv.ellipse(dx + 6, cv.h - 12, 5, 3, [236, 214, 170]);
    }
    place(cv, 70, 13, 3);
  }
}
