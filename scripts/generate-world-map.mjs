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
// This template: a forest (PUBLIC) and a desert (SYSTEM) separated by a
// river, crossed by a single wooden bridge.

import { writeFileSync } from 'node:fs';

const W = 60; // map size in tiles
const H = 44;
const T = 16; // tile size px

// Tile GIDs in tileset-meadow.png (index + 1).
const GRASS = 1, GRASS2 = 2, SAND = 3, SAND2 = 4, HEDGE = 5, BRICK = 6, DIRT = 7, ORANGE = 8;
const FOREST_DECOR = [9, 10, 11, 12, 13, 16]; // tufts & flowers
const DESERT_DECOR = [14, 15];                // cactus & pebbles
const WATER = 17;                             // collides
const PLANK_L = 18, PLANK_M = 19, PLANK_R = 20;

const RIVER = { from: 20, to: 22 };                    // water rows
const BRIDGE = { cols: [29, 30, 31], from: 19, to: 23 }; // one tile onto each bank
const FOREST_ROWS = { wall: 0, from: 1, to: 19 };
const DESERT_ROWS = { from: 23, to: 42, wall: 43 };

const STATION_COLS = [8, 22, 37, 51];
const FOREST_STATION_ROWS = [5, 10, 15];
const DESERT_STATION_ROWS = [27, 32, 37];

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
    const desertSide = y > RIVER.to;
    const r = rand();
    ground[at(x, y)] = desertSide
      ? r < 0.85 ? SAND : r < 0.97 ? SAND2 : DIRT
      : r < 0.85 ? GRASS : r < 0.97 ? GRASS2 : ORANGE;
  }
}

// ── River ── full width, on the walls layer so it blocks movement.
for (let y = RIVER.from; y <= RIVER.to; y++) {
  for (let x = 0; x < W; x++) walls[at(x, y)] = WATER;
}

// ── Border walls ── hedges around the forest, bricks around the desert
// (the river rows stay water — it runs off the map edges).
for (let x = 0; x < W; x++) {
  walls[at(x, FOREST_ROWS.wall)] = HEDGE;
  walls[at(x, DESERT_ROWS.wall)] = BRICK;
}
for (let y = 0; y < H; y++) {
  if (y >= RIVER.from && y <= RIVER.to) continue;
  const gid = y < RIVER.from ? HEDGE : BRICK;
  walls[at(0, y)] = gid;
  walls[at(W - 1, y)] = gid;
}

// ── Bridge ── planks on the ground layer, water cleared beneath.
for (let y = BRIDGE.from; y <= BRIDGE.to; y++) {
  BRIDGE.cols.forEach((x, i) => {
    ground[at(x, y)] = i === 0 ? PLANK_L : i === BRIDGE.cols.length - 1 ? PLANK_R : PLANK_M;
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
addSlots('public', FOREST_STATION_ROWS);
addSlots('system', DESERT_STATION_ROWS);

objects.push(point('spawn', (30 + 0.5) * T, (17 + 0.5) * T));
// The bridge is the passage between areas: route through its center.
objects.push(point('door', (30 + 0.5) * T, 21.5 * T));
objects.push(point('label', 3 * T, 2.5 * T, [
  prop('text', 'string', 'PUBLIC'),
  prop('theme', 'string', 'forest'),
]));
objects.push(point('label', 3 * T, (DESERT_ROWS.from + 1.5) * T, [
  prop('text', 'string', 'SYSTEM'),
  prop('theme', 'string', 'desert'),
]));

// ── Decor ── sparse, clear of stations, walls, river banks and the bridge.
const nearSlot = (x, y) =>
  slotTiles.some(([sx, sy]) => Math.abs(sx - x) <= 1 && Math.abs(sy - y) <= 1);
for (let y = 1; y < H - 1; y++) {
  if (y >= RIVER.from - 1 && y <= RIVER.to + 1) continue;
  for (let x = 1; x < W - 1; x++) {
    if (walls[at(x, y)] || nearSlot(x, y)) continue;
    if (BRIDGE.cols.includes(x) && y >= BRIDGE.from - 1 && y <= BRIDGE.to + 1) continue;
    if (rand() < 0.055) {
      const set = y < RIVER.from ? FOREST_DECOR : DESERT_DECOR;
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
      imageheight: 48,
      columns: 8,
      tilecount: 24,
      tilewidth: T,
      tileheight: T,
      margin: 0,
      spacing: 0,
      tiles: [HEDGE - 1, BRICK - 1, WATER - 1].map((id) => ({
        id,
        properties: [prop('collides', 'bool', true)],
      })),
    },
  ],
};

const out = new URL('../public/game/maps/meadow.tmj', import.meta.url).pathname;
writeFileSync(out, JSON.stringify(map));
console.log(`wrote ${out} (${W}x${H} tiles, ${objects.length} objects)`);
