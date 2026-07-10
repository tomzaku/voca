#!/usr/bin/env node
// Generates the starter world template `public/game/maps/meadow.tmj` — a
// standard Tiled JSON map you can open and reshape in the Tiled editor
// (https://www.mapeditor.org) without touching any code.
//
//   node scripts/generate-world-map.mjs
//
// The map contract the game relies on (any template must follow it):
//   - tile layers `ground`, `decor`, `walls` — tiles on `walls` block movement
//     (their tileset tiles carry a `collides` property)
//   - object layer `meta` with point objects:
//       type "spawn"                     → where the buddy appears
//       type "station"  region,slot      → where a collection can live
//       type "door"                      → passage waypoint between areas
//       type "label"    text,theme       → area name signs
// Everything else (art, shape, size, number of areas) is free.
//
// This template: a tree-lined meadow (PUBLIC) and a fenced farm (SYSTEM)
// separated by a river, crossed by a wooden bridge.
//
// Art: Sprout Lands (Basic pack) by Cup Nooble — see public/game/maps/README.md
// for license/credit. Tile picks live in the tileset composition script.

import { writeFileSync } from 'node:fs';

const W = 60; // map size in tiles
const H = 44;
const T = 16; // tile size px

// Tile GIDs in tileset-meadow.png (index + 1).
const GRASS = 1, GRASS2 = 2, GRASS3 = 3, GRASSP = 4;   // meadow ground
const FARM = 5, FARM2 = 6, FARMP = 7;                  // farm ground
const FENCE_H = 8, FENCE_V = 9;                        // collides
const WATER = 10;                                      // collides
const BRIDGE_ROWS = [[11, 12], [13, 14], [15, 16]];    // top / mid / bottom, 2 cols
const TREE = [17, 18, 19, 20];                         // 2x2 round tree, collides
const TREE_APPLE = [21, 22, 23, 24];                   // 2x2 apple tree, collides
const MEADOW_DECOR = [25, 28, 29, 30];                 // heart, pink & yellow flowers, mushroom
const FARM_DECOR = [26, 27];                           // sprout, rock
const SUNFLOWER = [31, 32];                            // 1x2, decor layer

const RIVER = { from: 20, to: 22 };                    // water rows
const BRIDGE = { cols: [29, 30], from: 19, to: 23 };   // one tile onto each bank
const DESERT_ROWS = { from: 23, to: 42, wall: 43 };    // farm side
const FARM_ROWS = DESERT_ROWS;

// Stations huddle around the map center — collections are few, so keep the
// bosses close together and let the outskirts be scenery.
const STATION_COLS = [18, 26, 34, 42];
const MEADOW_STATION_ROWS = [7, 11, 15];
const FARM_STATION_ROWS = [26, 30, 34];

// Deterministic PRNG so regeneration is stable.
let seed = 20260707;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

const ground = new Array(W * H).fill(0);
const decor = new Array(W * H).fill(0);
const walls = new Array(W * H).fill(0);
const at = (x, y) => y * W + x;

// ── Ground ──
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const farmSide = y > RIVER.to;
    const r = rand();
    ground[at(x, y)] = farmSide
      ? r < 0.8 ? FARM : r < 0.94 ? FARM2 : FARMP
      : r < 0.74 ? GRASS : r < 0.86 ? GRASS2 : r < 0.95 ? GRASS3 : GRASSP;
  }
}

// ── River ── full width, on the walls layer so it blocks movement.
for (let y = RIVER.from; y <= RIVER.to; y++) {
  for (let x = 0; x < W; x++) walls[at(x, y)] = WATER;
}

// ── Borders ── tall trees around the meadow, fences around the farm
// (the river rows stay water — it runs off the map edges).
const block = (gids, w, x, y) => {
  gids.forEach((gid, i) => walls[at(x + (i % w), y + Math.floor(i / w))] = gid);
};
const tree = (x, y, apple = false) => block(apple ? TREE_APPLE : TREE, 2, x, y);

for (let x = 0; x < W - 1; x += 2) tree(x, 0, x % 6 === 4);    // top edge
for (let y = 2, i = 0; y <= RIVER.from - 4; y += 2, i++) {     // side edges
  tree(0, y, i % 3 === 1);
  tree(W - 2, y, i % 3 === 2);
}
// A few free-standing trees in the meadow.
for (const [x, y, a] of [[6, 5, 0], [12, 13, 1], [46, 4, 1], [50, 12, 0], [8, 16, 0]]) {
  tree(x, y, Boolean(a));
}

for (let x = 0; x < W; x++) walls[at(x, FARM_ROWS.wall)] = FENCE_H;
for (let y = FARM_ROWS.from; y < FARM_ROWS.wall; y++) {
  walls[at(0, y)] = FENCE_V;
  walls[at(W - 1, y)] = FENCE_V;
}

// ── Bridge ── planks on the ground layer, water cleared beneath.
for (let y = BRIDGE.from; y <= BRIDGE.to; y++) {
  const row = y === BRIDGE.from ? BRIDGE_ROWS[0] : y === BRIDGE.to ? BRIDGE_ROWS[2] : BRIDGE_ROWS[1];
  BRIDGE.cols.forEach((x, i) => {
    ground[at(x, y)] = row[i];
    walls[at(x, y)] = 0;
  });
}

// ── Stations (slots the app binds collections to) ──
const objects = [];
let objectId = 1;
const point = (type, x, y, properties = []) => ({
  id: objectId++, name: '', type, point: true, visible: true, rotation: 0,
  x: Math.round(x), y: Math.round(y), properties,
});
const prop = (name, type, value) => ({ name, type, value });

const slotTiles = [];
const addSlots = (region, rows) => {
  let slot = 0;
  for (const r of rows) {
    for (const c of STATION_COLS) {
      objects.push(point('station', (c + 0.5) * T, (r + 0.5) * T, [
        prop('region', 'string', region),
        prop('slot', 'int', slot++),
      ]));
      slotTiles.push([c, r]);
    }
  }
};
addSlots('public', MEADOW_STATION_ROWS);
addSlots('system', FARM_STATION_ROWS);

objects.push(point('spawn', 30 * T, (17 + 0.5) * T));
// The bridge is the passage between areas: route through its center.
objects.push(point('door', 30 * T, 21.5 * T));
objects.push(point('label', 3 * T, 3.5 * T, [
  prop('text', 'string', 'PUBLIC'),
  prop('theme', 'string', 'forest'),
]));
objects.push(point('label', 3 * T, (FARM_ROWS.from + 1.5) * T, [
  prop('text', 'string', 'SYSTEM'),
  prop('theme', 'string', 'farm'),
]));

// ── Decor ── sparse, clear of stations, walls, river banks and the bridge.
const nearSlot = (x, y) =>
  slotTiles.some(([sx, sy]) => Math.abs(sx - x) <= 1 && Math.abs(sy - y) <= 1);
const clear = (x, y) =>
  !walls[at(x, y)] && !decor[at(x, y)] && !nearSlot(x, y) &&
  !(BRIDGE.cols.includes(x) && y >= BRIDGE.from - 1 && y <= BRIDGE.to + 1);

// Sunflower patches on the farm (1x2 on the decor layer).
for (const [x, y] of [[8, 27], [14, 36], [44, 26], [50, 34], [10, 39], [46, 30]]) {
  if (clear(x, y) && clear(x, y + 1)) {
    decor[at(x, y)] = SUNFLOWER[0];
    decor[at(x, y + 1)] = SUNFLOWER[1];
  }
}
for (let y = 1; y < H - 1; y++) {
  if (y >= RIVER.from - 1 && y <= RIVER.to + 1) continue;
  for (let x = 1; x < W - 1; x++) {
    if (!clear(x, y)) continue;
    if (rand() < 0.05) {
      const set = y < RIVER.from ? MEADOW_DECOR : FARM_DECOR;
      decor[at(x, y)] = set[Math.floor(rand() * set.length)];
    }
  }
}

// ── Assemble the Tiled document ──
const tileLayer = (id, name, data) => ({
  id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0,
  opacity: 1, visible: true, data,
});

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
      name: 'meadow',
      image: 'tileset-meadow.png',
      imagewidth: 128,
      imageheight: 64,
      columns: 8,
      tilecount: 32,
      tilewidth: T,
      tileheight: T,
      margin: 0,
      spacing: 0,
      tiles: [FENCE_H, FENCE_V, WATER, ...TREE, ...TREE_APPLE]
        .map((gid) => ({
          id: gid - 1,
          properties: [prop('collides', 'bool', true)],
        })),
    },
  ],
};

const out = new URL('../public/game/maps/meadow.tmj', import.meta.url).pathname;
writeFileSync(out, JSON.stringify(map));
console.log(`wrote ${out} (${W}x${H} tiles, ${objects.length} objects)`);
