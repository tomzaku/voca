// Huế's tram: a loop on the city's streets past its landmarks — along Lê Duẩn
// under the Citadel, over Trường Tiền, back along Lê Lợi and over Nguyễn
// Hoàng — with its stops. The rails are painted into the street; each stop
// is a little shelter at the kerb (it doesn't block). The route and the stops
// go into the map (`tramPath`, `tramStop` points), and WorldScene runs the
// tram on them.

import { Canvas } from '../core/canvas.mjs';
import { deck, drawn, ground, mark, over } from '../core/world.mjs';
import { T } from '../layout.mjs';

/** The loop, in tiles, along the streets' middles — clockwise from Kim Long. */
export const TRAM_LOOP = [[21, 52.4], [76.5, 52.4], [76.5, 65.6], [21, 65.6], [21, 52.4]];

/** The stops, in order round the loop: where the tram halts (on the loop)
 *  and which side of the street the shelter stands (-1 north, 1 south). */
export const TRAM_STOPS = [
  { id: 'kimLong', name: 'Kim Long', x: 25, y: 52.4, side: -1 },
  { id: 'phuVanLau', name: 'Phu Văn Lâu', x: 60, y: 52.4, side: -1 },
  { id: 'dongBa', name: 'Đông Ba · Trường Tiền', x: 73, y: 52.4, side: -1 },
  { id: 'walkingStreet', name: 'Phố đi bộ', x: 62, y: 65.6, side: 1 },
  { id: 'gaHue', name: 'Ga Huế', x: 28, y: 65.6, side: 1 },
];

const RAIL = [196, 200, 206], GROOVE = [70, 72, 78];

/** The two rails along the loop, a groove beside each. */
export function drawTram() {
  const gauge = 3;
  for (let i = 0; i < TRAM_LOOP.length - 1; i++) {
    const [ax, ay] = TRAM_LOOP[i], [bx, by] = TRAM_LOOP[i + 1];
    const horizontal = ay === by;
    const n = Math.round(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * T);
    for (let k = 0; k <= n; k++) {
      const x = Math.round((ax + ((bx - ax) * k) / n) * T), y = Math.round((ay + ((by - ay) * k) / n) * T);
      for (const s of [-gauge, gauge]) {
        if (horizontal) { ground.set(x, y + s, RAIL); ground.set(x, y + s + (s > 0 ? 1 : -1), GROOVE); }
        else { ground.set(x + s, y, RAIL); ground.set(x + s + (s > 0 ? 1 : -1), y, GROOVE); }
      }
    }
  }
  drawn.push({ type: 'rail', loop: TRAM_LOOP });

  // A shelter at each stop: posts, a red roof, a bench, the stop's sign.
  for (const s of TRAM_STOPS) {
    const cv = new Canvas(2 * T, 2 * T);
    cv.rect(2, 6, 28, 5, [176, 52, 40]);
    cv.rect(2, 6, 28, 1, [214, 96, 70]);
    cv.rect(2, 10, 28, 1, [120, 34, 28]);
    for (const x of [4, 26]) cv.rect(x, 11, 2, 17, [70, 72, 80]);
    cv.rect(8, 21, 16, 2, [168, 120, 78]);
    cv.rect(8, 23, 1, 4, [70, 60, 54]); cv.rect(23, 23, 1, 4, [70, 60, 54]);
    cv.rect(13, 0, 6, 6, [236, 196, 90]);                     // the sign
    cv.rect(14, 1, 4, 4, [40, 70, 120]);
    cv.rect(15, 2, 2, 1, [250, 250, 250]);
    const tx = Math.round(s.x) - 1, ty = s.side < 0 ? Math.floor(s.y) - 3 : Math.floor(s.y) + 1;
    ground.blit(cv, tx * T, ty * T);
    over.blit(cv, tx * T, ty * T, [0, 12]);
    mark(deck, tx, ty, 2, 2);                                 // keeps trees off; it doesn't block
    drawn.push({ type: 'tramStop', x: tx * T, y: ty * T });
  }
}
