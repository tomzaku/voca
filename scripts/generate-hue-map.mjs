#!/usr/bin/env node
// Generates the Huế world template: public/game/maps/hue.tmj plus the images
// it paints with — hue-ground.png (everything, under the buddy), hue-over.png
// (roofs, tower tops and tree crowns, drawn over the buddy so it can walk
// behind them) and hue-night.png (bridge lights, shown only in dark mode —
// Trường Tiền's six spans each glow their own colour). Every pixel is drawn
// here in code; there is no tileset art to license or keep in sync.
//
//   npm run map:hue [-- preview.png [--walls]]
//
// The optional preview composites both layers with station slots marked (and
// blocked tiles tinted with --walls), for checking a change without the app.
//
// Same contract as every world template (see src/game/scenes/WorldScene.ts):
//   - `walls` tile layer — any tile blocks movement (hidden, collision only)
//   - `roads` tile layer — where a bus may drive (hidden; scripts/hue/bus.mjs)
//   - `meta` object layer — `spawn`, `label`, and `station` points with a
//     `region` (public | system | feature) and `slot`. Feature stations here
//     also name their `feature` id and a `place`, so the building a page lives
//     in is decided by the map, not by list order.
// Plus image layers `ground`, `over` and `night`, which WorldScene draws below
// the buddy, above it, and over the dimmed map at night.
//
// The layout follows the real city, turned the way illustrated maps of Huế
// usually are: the Citadel upright with its front (Kỳ Đài, Ngọ Môn) facing the
// Hương River, which runs west → east along it and then bends north-east past
// Đông Ba. In the city's real places:
//
//   KIM LONG (west)   Thiên Mụ pagoda (Review) · Văn Miếu and its stelae
//                     (Writing) · garden houses for your collections ·
//                     An Hiên, your home (Buddy)
//   THE CITADEL       moat and walls, Kỳ Đài on the front wall; inside, the
//                     Imperial City with its own moat, Ngọ Môn and the level
//                     halls · Tàng Thư Lâu on Học Hải lake (Search) · Tịnh Tâm
//                     · Duyệt Thị Đường, the royal theatre (IPA sounds)
//   ĐÔNG BA / GIA HỘI Đông Ba market at the river corner (Learn), Gia Hội
//                     across the Đông Ba canal
//   THE RIVER         Nguyễn Hoàng, Dã Viên (over its islet), Phú Xuân and
//                     Trường Tiền bridges · Cồn Hến in the bend (Speak)
//   SOUTH BANK        Ga Huế · Quốc Học (Quizzes) · Lê Lợi park and the
//                     dragon-boat wharf (Listening) · the walking street ·
//                     the An Cựu canal with Cung An Định · Ngự Bình (Level
//                     test)
//   THE TOMB HILLS    forest, and on the tombs' road Tự Đức's garden tomb,
//                     Khải Định's (History) and Minh Mạng's long axis
//
// Drawn like an illustrated city map: bright greens and blues, forest on the
// hills, lanes of houses and trees everywhere — but never so thick that a
// path closes.
//
// The pieces live in scripts/hue/:
//   core/      the canvas, seeded randomness, palette, and the map's layers
//              and tile grids (`place` puts a structure on all of them)
//   layout.mjs where everything is — river, Citadel, gates, roads, lakes,
//              keepers — and the water and road tests built on it
//   draw/      building blocks: roofs and halls, tomb stonework, trees
//   roads.mjs  the road network: streets, lanes and paved courts
//   paint/     terrain, roads and water, the ground under everything; street
//              lamps, crossings and parked bikes
//   places/    one file per part of the city, each drawing its landmarks
//   fill/      the passes that fill the gaps: houses, boats, trees, forest
//   hd/        high-detail patches: parts of the map drawn again at twice the
//              resolution, laid over it in the game
//   meta, collision, check — the map's points, walls and sanity check
//
// The steps run in the order below, and that order is part of the output:
// they share one seeded random sequence, and later ones paint over and
// build around earlier ones.

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Canvas } from './hue/core/canvas.mjs';
import { ground, night, over } from './hue/core/world.mjs';
import { H, PH, PW, T, W } from './hue/layout.mjs';
import { paintGrass } from './hue/paint/terrain.mjs';
import { furnishStreets, paintRoads } from './hue/paint/roads.mjs';
import { paintWater } from './hue/paint/water.mjs';
import { drawFields } from './hue/places/fields.mjs';
import { drawParks } from './hue/places/parks.mjs';
import { drawRiver } from './hue/places/river.mjs';
import { drawCitadel, drawCitadelGrounds } from './hue/places/citadel.mjs';
import { drawImperialCity } from './hue/places/imperial.mjs';
import { drawKimLong } from './hue/places/kimLong.mjs';
import { drawDongBa } from './hue/places/dongBa.mjs';
import { drawSouthBank } from './hue/places/southBank.mjs';
import { drawTombs } from './hue/places/tombs.mjs';
import { buildNeighbourhoods } from './hue/fill/neighbourhoods.mjs';
import { launchBoats } from './hue/fill/boats.mjs';
import { plantGreenery } from './hue/fill/greenery.mjs';
import { buildWalls, walls } from './hue/collision.mjs';
import { busRoads, checkBus, drawBusStops } from './hue/bus.mjs';
import { nextId, objects, writeMeta } from './hue/meta.mjs';
import { checkReach, seen } from './hue/check.mjs';
import { renderDetail } from './hue/hd/render.mjs';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const MAPS = new URL('../public/game/maps/', import.meta.url);
const mapFile = (name) => fileURLToPath(new URL(name, MAPS));

paintGrass();
paintRoads();
paintWater();
drawParks();
drawRiver();
drawCitadel();
drawImperialCity();
drawCitadelGrounds();
drawKimLong();
drawDongBa();
drawSouthBank();
drawTombs();
furnishStreets();
const shelters = drawBusStops();
drawFields();
buildNeighbourhoods();
launchBoats();
plantGreenery();
buildWalls();
writeMeta(shelters);
checkReach();
// Where the buses drive, and that every stop can be reached by road.
const roads = busRoads();
for (const m of checkBus(roads)) { console.error(m); process.exitCode = 1; }

// ── 11. Write ──
const tile = new Canvas(T, T);
tile.rect(0, 0, T, T, [200, 60, 60]);

const tmj = {
  compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T, infinite: false,
  orientation: 'orthogonal', renderorder: 'right-down', tiledversion: '1.10.2', type: 'map', version: '1.10',
  nextlayerid: 7, nextobjectid: nextId,
  tilesets: [{
    firstgid: 1, name: 'hue', image: 'hue-tiles.png', imagewidth: T, imageheight: T,
    tilewidth: T, tileheight: T, columns: 1, tilecount: 1, margin: 0, spacing: 0,
  }],
  layers: [
    { id: 1, name: 'ground', type: 'imagelayer', image: 'hue-ground.png', x: 0, y: 0, opacity: 1, visible: true },
    { id: 2, name: 'over', type: 'imagelayer', image: 'hue-over.png', x: 0, y: 0, opacity: 1, visible: true },
    { id: 5, name: 'night', type: 'imagelayer', image: 'hue-night.png', x: 0, y: 0, opacity: 1, visible: false },
    { id: 3, name: 'walls', type: 'tilelayer', x: 0, y: 0, width: W, height: H, opacity: 0.5, visible: false, data: walls },
    { id: 6, name: 'roads', type: 'tilelayer', x: 0, y: 0, width: W, height: H, opacity: 0.5, visible: false, data: roads },
    { id: 4, name: 'meta', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects },
  ],
};

writeFileSync(mapFile('hue.tmj'), JSON.stringify(tmj));
await Promise.all([
  ground.png(mapFile('hue-ground.png')),
  over.png(mapFile('hue-over.png')),
  tile.png(mapFile('hue-tiles.png')),
  night.png(mapFile('hue-night.png')),
]);
// The high-detail patches, and the list the game loads them from.
const patches = [];
const detail = renderDetail((key, g, o) => patches.push(g.png(mapFile(`hue-detail-${key}-ground.png`)), o.png(mapFile(`hue-detail-${key}-over.png`))));
await Promise.all(patches);
writeFileSync(mapFile('hue-detail.json'), JSON.stringify(detail));
console.log(`hue.tmj ${W}×${H} — ${objects.length} meta points`);

// Optional QA render: ground + over, blocked tiles tinted, slots marked.
const previewPath = process.argv[2];
if (previewPath) {
  const pv = new Canvas(PW, PH);
  pv.blit(ground, 0, 0);
  pv.blit(over, 0, 0);
  if (process.argv.includes('--walls')) {
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      if (walls[ty * W + tx]) pv.rect(tx * T, ty * T, T, T, [255, 0, 0], 0.25);
      else if (!seen[ty * W + tx]) pv.rect(tx * T, ty * T, T, T, [0, 80, 255], 0.35); // open but cut off
    }
  }
  for (const o of objects) {
    const c = o.type === 'spawn' ? [255, 255, 255] : o.type === 'label' ? [0, 0, 0] : [255, 220, 0];
    pv.rect(o.x - 3, o.y - 3, 6, 6, c);
  }
  await sharp(Buffer.from(pv.d.buffer), { raw: { width: PW, height: PH, channels: 4 } }).png().toFile(previewPath);
  console.log(`preview → ${previewPath}`);
}
