#!/usr/bin/env node
// Generates the world template `public/game/maps/village.tmj` — a standard
// Tiled JSON map you can open and reshape in the Tiled editor
// (https://www.mapeditor.org) without touching any code.
//
//   node scripts/compose-world-tileset.mjs   (only when the tileset changes)
//   node scripts/generate-world-map.mjs
//
// The map contract the game relies on (any template must follow it):
//   - tile layers `ground`, `decor`, `walls` — tiles on `walls` block movement
//     (their tileset tiles carry a `collides` property)
//   - object layer `meta` with point objects:
//       type "spawn"                     → where the buddy appears
//       type "station"  region,slot      → where a collection/feature can live
//       type "door"                      → passage waypoint between areas
//       type "label"    text,theme       → area name signs
// Everything else (art, shape, size, number of areas) is free.
//
// This template: three areas stacked north → south on 32px tiles, each split by
// a river with a land crossing (the pack has no bridge art, so the rivers simply
// don't span the crossing columns).
//   1. MEADOW   (PUBLIC collections) — bright grass + flowers, `public` slots
//   2. LAKESIDE (SYSTEM levels)      — darker grass beside a lake, `system` slots
//   3. HIGHLAND (LEARNING)           — earth and stone, `feature` slots, one
//      little house per app feature (Learn, Speak, Quizzes, …)
// Every slot sits at the door of a building — walk up to it to open it.
//
// The pack ships no water→grass shore tiles, so the lake is a rectangle ringed
// with bushes to hide the hard edge; everything here is a fully-opaque fill.
//
// Art: EPIC RPG World — basic tileset and assets, standard v3.0.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W = 40; // map size in tiles
const H = 100;
const T = 32; // tile size px

const MAPS = new URL('../public/game/maps/', import.meta.url);
const ts = JSON.parse(readFileSync(fileURLToPath(new URL('tileset-world.json', MAPS)), 'utf8'));

/** GID of a named tile (dx/dy index into multi-tile blocks). */
const gid = (name, dx = 0, dy = 0) => {
  const t = ts.tiles[name];
  if (!t) throw new Error(`unknown tile "${name}"`);
  return 1 + (t.y + dy) * ts.columns + (t.x + dx);
};

const ground = new Array(W * H).fill(0);
const decor = new Array(W * H).fill(0);
const walls = new Array(W * H).fill(0);
const at = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

/** Stamp a (possibly multi-tile) named block onto a layer. */
const place = (layer, name, x, y) => {
  const t = ts.tiles[name];
  for (let dy = 0; dy < t.h; dy++) {
    for (let dx = 0; dx < t.w; dx++) {
      if (inside(x + dx, y + dy)) layer[at(x + dx, y + dy)] = gid(name, dx, dy);
    }
  }
};

// Deterministic PRNG so regeneration is stable.
let seed = 20260710;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ── Layout ──
const CROSS = [18, 19];                       // the columns every river leaves dry
const RIVER1 = { from: 31, to: 33 };          // meadow ↔ lakeside
const RIVER2 = { from: 73, to: 75 };          // lakeside ↔ highland

const HOUSE = { w: 6, h: 6, doorDx: 3 };      // the three 6×6 cottages
const HOUSE_STYLES = ['house_blue', 'house_red', 'house_teal'];
const MEADOW_COLS = [3, 12, 21, 30];
const MEADOW_ROWS = [2, 11, 20];

const LAKE_COLS = [3, 12, 21];                // 3 columns — the lake takes the rest
const LAKE_ROWS = [35, 44, 53, 62];
const LAKE = { x0: 28, x1: 36, y0: 36, y1: 70 }; // stops short of the tree line

const TOWER = { w: 5, h: 7, doorDx: 1.5 };    // the taller stone house
const TOWER_COLS = [3, 13, 25];
const TOWER_ROWS = [78, 88];

/** Which of the three areas a row belongs to. */
const areaOf = (y) => (y < RIVER1.from ? 'meadow' : y < RIVER2.from ? 'lakeside' : 'highland');

// ── Ground ── flowery grass, darker grass, then earth.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const r = rand();
    const a = areaOf(y);
    ground[at(x, y)] = a === 'meadow'
      ? r < 0.62 ? gid('grass1') : r < 0.75 ? gid('grass2') : r < 0.85 ? gid('grass3')
        : r < 0.93 ? gid('grass4') : gid('grass5')
      : a === 'lakeside'
        ? r < 0.72 ? gid('grassm1') : r < 0.88 ? gid('grassm2') : gid('grassm3')
        : r < 0.7 ? gid('earth1') : r < 0.88 ? gid('earth2') : gid('earth3');
  }
}

// ── Rivers ── water blocks movement; the crossing columns stay dry.
const river = (R) => {
  for (let y = R.from; y <= R.to; y++) {
    for (let x = 0; x < W; x++) {
      if (CROSS.includes(x)) continue;
      walls[at(x, y)] = gid('water1');
    }
  }
};
river(RIVER1);
river(RIVER2);

// ── The lake ── a rectangle in the lakeside area, ringed with bushes below.
for (let y = LAKE.y0; y <= LAKE.y1; y++) {
  for (let x = LAKE.x0; x <= LAKE.x1; x++) walls[at(x, y)] = gid('water1');
}

// ── Roads ── a path in front of each building row, plus the main street that
// runs the length of the map and over both crossings.
const road = new Set();
const pave = (x, y) => {
  if (!inside(x, y) || walls[at(x, y)]) return;
  const a = areaOf(y);
  ground[at(x, y)] = a === 'highland' ? gid('stone') : gid('road');
  road.add(at(x, y));
};
for (const r of MEADOW_ROWS) {
  for (let x = 1; x < W - 1; x++) pave(x, r + HOUSE.h + 1);
}
for (const r of LAKE_ROWS) {
  for (let x = 1; x < LAKE.x0 - 1; x++) pave(x, r + HOUSE.h + 1);
}
for (const r of TOWER_ROWS) {
  for (let x = 1; x < W - 6; x++) pave(x, r + TOWER.h + 1);
}
for (let y = MEADOW_ROWS[0] + HOUSE.h + 1; y <= TOWER_ROWS[1] + TOWER.h + 1; y++) {
  for (const x of CROSS) pave(x, y);
}

// ── Buildings (the station slots the app binds collections/features to) ──
const objects = [];
let objectId = 1;
const point = (type, x, y, properties = []) => ({
  id: objectId++, name: '', type, point: true, visible: true, rotation: 0,
  x: Math.round(x), y: Math.round(y), properties,
});
const prop = (name, type, value) => ({ name, type, value });

const slotTiles = [];
/** Stamp a grid of buildings and emit a station slot at each door. */
const addBuildings = (region, rows, cols, size, styleAt) => {
  let slot = 0;
  rows.forEach((r, ri) => {
    cols.forEach((c, ci) => {
      place(walls, styleAt(ri, ci), c, r);
      // The station point sits one tile below the building's door.
      const doorY = r + size.h + 1;
      objects.push(point('station', (c + size.doorDx) * T, doorY * T, [
        prop('region', 'string', region),
        prop('slot', 'int', slot++),
      ]));
      slotTiles.push([Math.floor(c + size.doorDx), doorY]);
    });
  });
};
addBuildings('public', MEADOW_ROWS, MEADOW_COLS, HOUSE,
  (ri, ci) => HOUSE_STYLES[(ri + ci) % HOUSE_STYLES.length]);
addBuildings('system', LAKE_ROWS, LAKE_COLS, HOUSE,
  (ri, ci) => HOUSE_STYLES[(ri + ci + 1) % HOUSE_STYLES.length]);
addBuildings('feature', TOWER_ROWS, TOWER_COLS, TOWER, () => 'house_stone');

// ── Scenery ── trees frame each area, bushes soften the lake's edge.
const BUSHES = ['bush1', 'bush2', 'bush3', 'bush4'];
for (let y = LAKE.y0; y <= LAKE.y1 - 1; y += 4) {
  place(walls, pick(BUSHES), LAKE.x0 - 2, y);
}
for (let x = LAKE.x0; x <= LAKE.x1 - 1; x += 4) {
  place(walls, pick(BUSHES), x, LAKE.y0 - 2);
  place(walls, pick(BUSHES), x, LAKE.y1 + 1);
}

/** Tree line down both edges of a row band, clear of the crossing. */
const treeLine = (fromY, toY) => {
  for (let y = fromY; y <= toY; y += 4) {
    place(walls, pick(['pine1', 'pine2']), 0, y);
    place(walls, pick(['pine1', 'pine2']), W - 2, y);
  }
};
treeLine(1, RIVER1.from - 4);
treeLine(RIVER1.to + 2, RIVER2.from - 4);
treeLine(RIVER2.to + 2, H - 4);

place(walls, 'tree_big', 36, 2);
place(walls, 'tree_big', 25, 12);
place(walls, 'tree_big', 8, 24);
place(walls, 'tree_big', 33, 79);
place(walls, 'tree_big', 33, 90);

// ── Decor ── sparse bushes on open ground, clear of walls, roads and doors.
const nearSlot = (x, y) =>
  slotTiles.some(([sx, sy]) => Math.abs(sx - x) <= 2 && Math.abs(sy - y) <= 1);
const free = (x, y) => {
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      if (!inside(x + dx, y + dy)) return false;
      if (walls[at(x + dx, y + dy)] || decor[at(x + dx, y + dy)] || road.has(at(x + dx, y + dy))) return false;
    }
  }
  return !nearSlot(x, y);
};
for (let y = 2; y < H - 3; y++) {
  for (let x = 2; x < W - 3; x++) {
    if (rand() >= 0.02 || !free(x, y)) continue;
    place(decor, pick(BUSHES), x, y);
  }
}

// ── Meta objects ──
objects.push(point('spawn', 19 * T, (MEADOW_ROWS[2] + HOUSE.h + 1) * T));
// The land crossings are the passages between areas.
objects.push(point('door', 19 * T, ((RIVER1.from + RIVER1.to) / 2) * T));
objects.push(point('door', 19 * T, ((RIVER2.from + RIVER2.to) / 2) * T));
objects.push(point('label', 2 * T, 1.5 * T, [
  prop('text', 'string', 'MEADOW'),
  prop('theme', 'string', 'forest'),
]));
objects.push(point('label', 2 * T, (RIVER1.to + 1.5) * T, [
  prop('text', 'string', 'LAKESIDE'),
  prop('theme', 'string', 'snow'),
]));
objects.push(point('label', 2 * T, (RIVER2.to + 1.5) * T, [
  prop('text', 'string', 'HIGHLAND'),
  prop('theme', 'string', 'desert'),
]));

// ── Assemble the Tiled document ──
const tileLayer = (id, name, data) => ({
  id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0,
  opacity: 1, visible: true, data,
});

// Per-tile metadata: collides flags plus tile animations (standard Tiled
// format — Phaser plays these natively, e.g. the rippling water).
const localId = (name) => ts.tiles[name].y * ts.columns + ts.tiles[name].x;
const tileEntries = new Map();
const entryFor = (id) => {
  if (!tileEntries.has(id)) tileEntries.set(id, { id });
  return tileEntries.get(id);
};
for (const t of Object.values(ts.tiles)) {
  if (!t.collides) continue;
  for (let dy = 0; dy < t.h; dy++) {
    for (let dx = 0; dx < t.w; dx++) {
      entryFor((t.y + dy) * ts.columns + (t.x + dx)).properties = [prop('collides', 'bool', true)];
    }
  }
}
for (const anim of Object.values(ts.animations ?? {})) {
  entryFor(localId(anim.frames[0])).animation = anim.frames.map((f) => ({
    tileid: localId(f),
    duration: anim.frameDuration,
  }));
}

const map = {
  type: 'map',
  version: '1.10',
  tiledversion: '1.10.2',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  infinite: false,
  width: W,
  height: H,
  tilewidth: T,
  tileheight: T,
  nextlayerid: 5,
  nextobjectid: objectId,
  layers: [
    tileLayer(1, 'ground', ground),
    tileLayer(2, 'decor', decor),
    tileLayer(3, 'walls', walls),
    { id: 4, name: 'meta', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'world',
      image: 'tileset-world.png',
      imagewidth: ts.columns * T,
      imageheight: (ts.tilecount / ts.columns) * T,
      columns: ts.columns,
      tilecount: ts.tilecount,
      tilewidth: T,
      tileheight: T,
      margin: 0,
      spacing: 0,
      tiles: [...tileEntries.values()],
    },
  ],
};

const out = fileURLToPath(new URL('village.tmj', MAPS));
writeFileSync(out, JSON.stringify(map));
console.log(`wrote ${out} (${W}x${H} tiles, ${objects.length} objects)`);
