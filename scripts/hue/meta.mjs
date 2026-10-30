// The map's meta layer: spawn, labels, the flag, lantern spots and the
// keepers' stations.

import { rand } from './core/canvas.mjs';
import { BOATS } from './fill/boats.mjs';
import { CITADEL, FEATURES, GATES, ISLETS, RIVER, RIVER_BRIDGES, SPAWN, T, W, isWater, isletE, onIslet, riverHalfWidth } from './layout.mjs';
import { FLAG } from './places/citadel.mjs';

export const objects = [];
export let nextId = 1;
export const prop = (name, value) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value });
export const point = (type, tx, ty, props = {}) => objects.push({
  id: nextId++, name: '', type, x: Math.round(tx * T), y: Math.round(ty * T),
  width: 0, height: 0, rotation: 0, visible: true, point: true,
  properties: Object.entries(props).map(([k, v]) => prop(k, v)),
});

// The landmarks with a story to tell (src/game/mapPlaces.ts), named over
// their roofs — quiet until you walk up, then lit. Centred on the building:
// a label is placed by its left edge, and a character is about a fifth of a
// tile wide.
export const landmark = (text, x, y) => point('label', x - text.length * 0.095, y - 0.6, { text, theme: 'desert' });

export function writeMeta() {
  point('spawn', ...SPAWN);
  // The first label names the (single) area; `hidden` keeps it off the map.
  point('label', 2, 2, { text: 'Huế', theme: 'forest', hidden: 'true' });
  point('label', 4, 54.3, { text: 'Sông Hương', theme: 'forest' });
  point('label', 23.4, 56.4, { text: 'Cầu Nguyễn Hoàng', theme: 'desert' });
  point('label', 35.4, 52, { text: 'Cầu Dã Viên', theme: 'desert' });
  point('label', 69.4, 52, { text: 'Cầu Phú Xuân', theme: 'desert' });
  point('label', 78.4, 52, { text: 'Cầu Trường Tiền', theme: 'desert' });
  point('label', 4, 4.5, { text: 'Kim Long', theme: 'forest' });
  point('label', 86, 5, { text: 'Gia Hội', theme: 'forest' });
  point('label', 108, 54, { text: 'Vỹ Dạ', theme: 'forest' });
  point('label', 52, 84.6, { text: 'Ngự Bình', theme: 'forest' });
  landmark('Chùa Thiên Mụ', 6, 39.5);
  landmark('Ngọ Môn', 55, 34.5);
  landmark('Kỳ Đài', 55, 44);
  landmark('Tàng Thư Lâu', 36, 21);
  landmark('Duyệt Thị Đường', 73, 13.2);
  landmark('Hồ Tịnh Tâm', 55, 7.5);
  landmark('Ga Huế', 27.5, 61.5);
  landmark('Trường Quốc Học', 41, 60.5);
  landmark('Phố đi bộ', 77, 64.5);
  landmark('Cung An Định', 92, 66.5);
  landmark('Lăng Tự Đức', 10, 104.9);
  landmark('Lăng Khải Định', 34.5, 104.9);
  landmark('Lăng Minh Mạng', 79, 104.9);
  landmark('Phu Văn Lâu', 55, 50);
  landmark('Nghênh Lương Đình', 55, 56.2);
  landmark('Điện Thái Hòa', 55, 24.2);
  landmark('Tử Cấm Thành', 55, 17.3);
  landmark('Cung Trường Sanh', 45, 17.3);
  landmark('Cung Diên Thọ', 45.5, 24.3);
  landmark('Thái Miếu', 64.5, 24.3);
  landmark('Thế Miếu', 46, 31);
  landmark('Hiển Lâm Các', 46, 35);
  // The gates, named just outside the wall.
  for (const g of GATES) {
    if (g.side === 'south') landmark(g.label, g.at + 1, CITADEL.moat.y1 - 0.2);
    if (g.side === 'north') landmark(g.label, g.at + 1, CITADEL.moat.y0 - 0.4);
    if (g.side === 'west') landmark(g.label, CITADEL.moat.x0 - 2.5, g.at + 0.4);
    if (g.side === 'east') landmark(g.label, CITADEL.moat.x1 + 2.5, g.at + 0.4);
  }

  // Progress the city shows (WorldScene): the streak flag on Kỳ Đài, and spots
  // on the Hương where a lantern floats for each mastered word. The spots are
  // shuffled so the first few lanterns spread along the river, not bunch up.
  point('flag', FLAG.x, FLAG.y, { drop: FLAG.drop });
  {
    const spots = [];
    for (let s = 3 * T; s < RIVER.length; s += 0.6 * T) {
      const g = RIVER.segs.find((seg) => s >= seg.s0 && s < seg.s0 + seg.len);
      if (!g) continue;
      const t = (s - g.s0) / g.len;
      const cx = g.ax + (g.bx - g.ax) * t, cy = g.ay + (g.by - g.ay) * t;
      const nx = -(g.by - g.ay) / g.len, ny = (g.bx - g.ax) / g.len;
      const off = (rand() * 2 - 1) * Math.max(0, riverHalfWidth(s) - 1.4 * T);
      const x = cx + nx * off, y = cy + ny * off;
      const tx = x / T, ty = y / T;
      if (tx < 2 || tx > W - 2 || ty < 2) continue;
      if (RIVER_BRIDGES.some(([a, b]) => tx > a - 1.5 && tx < b + 1.5 && ty > 48 && ty < 59)) continue;
      if (tx > 41 && tx < 60 && ty > 50) continue;                 // the wharf, the boat, the landing
      if (BOATS.some(([bx, by, bw]) => tx > bx - 1 && tx < bx + bw + 1 && ty > by - 1 && ty < by + 1.5)) continue;
      if (tx > 100 && tx < 109 && ty > 37 && ty < 43) continue;    // the Cồn Hến footbridge
      if (onIslet(x, y) || ISLETS.some((i) => isletE(i, x, y) < 1.8)) continue;
      if (![[0, 0], [T, 0], [-T, 0], [0, T], [0, -T]].every(([dx, dy]) => isWater(x + dx, y + dy))) continue;
      spots.push([tx, ty]);
    }
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    spots.slice(0, 60).forEach(([x, y], i) => point('lantern', x, y, { order: i }));
  }

  FEATURES.forEach(([feature, x, y, place], slot) => point('station', x, y, { region: 'feature', slot, feature, place }));
}
