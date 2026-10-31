// The map's meta layer: spawn, labels, the flag, lantern spots and the
// keepers' stations.

import { rand } from './core/canvas.mjs';
import { BOATS } from './fill/boats.mjs';
import { PARK_PATHS } from './roads.mjs';
import { FARMERS } from './places/fields.mjs';
import { BUS_STOPS } from './bus.mjs';
import { FEATURES, ISLETS, RIVER, RIVER_BRIDGES, SPAWN, T, W, isWater, isletE, onIslet, riverHalfWidth } from './layout.mjs';
import { FLAG, LABELS as CITADEL_LABELS, SEARCHLIGHTS } from './places/citadel.mjs';
import { LABELS as DONG_BA_LABELS } from './places/dongBa.mjs';
import { LABELS as IMPERIAL_LABELS } from './places/imperial.mjs';
import { LABELS as KIM_LONG_LABELS } from './places/kimLong.mjs';
import { LABELS as PARK_LABELS } from './places/parks.mjs';
import { LABELS as RIVER_LABELS } from './places/river.mjs';
import { LABELS as SOUTH_BANK_LABELS } from './places/southBank.mjs';
import { LABELS as TOMB_LABELS } from './places/tombs.mjs';

export const objects = [];
export let nextId = 1;
export const prop = (name, value) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value });
export const point = (type, tx, ty, props = {}) => objects.push({
  id: nextId++, name: '', type, x: Math.round(tx * T), y: Math.round(ty * T),
  width: 0, height: 0, rotation: 0, visible: true, point: true,
  properties: Object.entries(props).map(([k, v]) => prop(k, v)),
});

// Every place's names, gathered from its file. Each carries `place`, the id
// of its story (src/i18n/messages/*/places.ts): walk up and the label lights
// and the story shows. Most are centred over their building — `x, y` is the
// middle, and a character is about a fifth of a tile wide; the river's and
// the districts' (`anchor: 'left'`) start at `x`.
const LABELS = [CITADEL_LABELS, IMPERIAL_LABELS, RIVER_LABELS, PARK_LABELS, KIM_LONG_LABELS, DONG_BA_LABELS, SOUTH_BANK_LABELS, TOMB_LABELS].flat();

export function writeMeta(shelters = []) {
  point('spawn', ...SPAWN);
  // The first label names the (single) area; `hidden` keeps it off the map.
  point('label', 2, 2, { text: 'Huế', theme: 'forest', hidden: 'true' });
  for (const l of LABELS) {
    const props = { text: l.text, theme: l.theme ?? 'desert', place: l.place };
    if (l.anchor === 'left') point('label', l.x, l.y, props);
    else point('label', l.x - l.text.length * 0.095, l.y - 0.6, props);
  }

  // The flag at the top of Kỳ Đài's pole, and the progress the city shows
  // (WorldScene): spots on the Hương where a lantern floats for each mastered
  // word. The spots are
  // shuffled so the first few lanterns spread along the river, not bunch up.
  point('flag', FLAG.x, FLAG.y);
  for (const [x, y, angle] of SEARCHLIGHTS) point('searchlight', x, y, { angle });
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
      if (RIVER_BRIDGES.some(([a, b]) => tx > a - 1.5 && tx < b + 1.5 && ty > 51 && ty < 66)) continue;
      if (tx > 41 && tx < 60 && ty > 53) continue;                 // the wharf, the boat, the landing
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

  // What moves in the city (WorldScene's ambient life): people strolling the
  // parks' paths and the walking street, incense smoke at the temples, the
  // fountain's spray.
  for (const [x0, x1, y] of [...PARK_PATHS, [57, 74.5, 64.2]]) {
    if (x1 - x0 >= 5) point('stroll', x0 + 0.5, y + 0.2, { to: Math.round((x1 - 0.5) * T) });
  }
  for (const [x, y] of [[11.5, 46.4], [20, 43.6], [62.9, 27.9], [66.1, 27.9]]) point('smoke', x, y);
  point('spray', 72, 63.3);
  // The Focus Zone, on the lane under Ngự Bình's pavilion.
  point('focus', 57, 83.4);
  // The playground's games: the street piano on Phố đi bộ, the type race at
  // Ga Huế, on the platform between the station and its tracks.
  point('play', 62, 64.6, { game: 'piano' });
  point('play', 27.5, 73.3, { game: 'race' });
  // Fishing off the ironwood boardwalk, at its east end.
  point('play', 72.5, 62.5, { game: 'fish' });
  for (const [x, y] of FARMERS) point('farmer', x, y);

  // The bus stops, named by their place's story id.
  BUS_STOPS.forEach((s, i) => {
    const [sx, sy] = shelters[i] ?? [s.x, s.y];
    point('busStop', s.x, s.y, { place: s.place, order: i, sx: Math.round(sx * T), sy: Math.round(sy * T) });
  });

  FEATURES.forEach(([feature, x, y, place], slot) => point('station', x, y, { region: 'feature', slot, feature, place }));
}
