#!/usr/bin/env node
// Generates the world template `public/game/maps/village.tmj` — a standard
// Tiled JSON map you can open and reshape in the Tiled editor
// (https://www.mapeditor.org) without touching any code.
//
//   node scripts/compose-village-tileset.mjs   (only when the tileset changes)
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
// This template: three areas stacked north → south, each split by a river and
// joined by a wooden bridge.
//   1. forest village  (PUBLIC collections)  — `public` station slots
//   2. desert village  (SYSTEM levels)       — `system` station slots
//   3. snow highlands  (LEARNING)            — `feature` slots, one little
//      study tower per app feature (Learn, Speak, Quizzes, …)
// Every slot sits at the door of a building — walk up to it to open it.
//
// Art: Ninja Adventure Asset Pack by Pixel-boy & AAA — CC0 1.0. Tile picks
// live in scripts/compose-village-tileset.mjs; see public/game/maps/README.md.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W = 60; // map size in tiles
const H = 82;
const T = 16; // tile size px

const MAPS = new URL('../public/game/maps/', import.meta.url);
const ts = JSON.parse(readFileSync(fileURLToPath(new URL('tileset-village.json', MAPS)), 'utf8'));

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

/** Stamp a (possibly multi-tile) named block onto a layer. */
const place = (layer, name, x, y) => {
  const t = ts.tiles[name];
  for (let dy = 0; dy < t.h; dy++) {
    for (let dx = 0; dx < t.w; dx++) layer[at(x + dx, y + dy)] = gid(name, dx, dy);
  }
};

// Deterministic PRNG so regeneration is stable.
let seed = 20260710;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const RIVER1 = { from: 26, to: 28 };                     // forest ↔ desert
const BRIDGE1 = { cols: [29, 30], from: 25, to: 29 };    // one tile onto each bank
const RIVER2 = { from: 57, to: 59 };                     // desert ↔ snow
const BRIDGE2 = { cols: [29, 30], from: 56, to: 60 };
const HOUSE_COLS = [8, 21, 34, 47];                      // left edge of each house
const FOREST_HOUSE_ROWS = [3, 10, 17];
const DESERT_HOUSE_ROWS = [31, 38, 45];
const TOWER_COLS = [12, 26, 44];                         // learning district
const TOWER_ROWS = [63, 71];
const FOREST_STYLES = ['house_a', 'house_b', 'house_c', 'house_d'];

/** Which of the three areas a row belongs to. */
const areaOf = (y) => (y < RIVER1.from ? 'forest' : y < RIVER2.from ? 'desert' : 'snow');

// ── Ground ── grass up north, sand in the middle, snow down south.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const r = rand();
    const a = areaOf(y);
    ground[at(x, y)] = a === 'desert'
      ? r < 0.9 ? gid('sand1') : r < 0.95 ? gid('sand_pebble') : gid('sand_dune')
      : a === 'snow'
        ? r < 0.55 ? gid('snow1') : r < 0.7 ? gid('snow2') : r < 0.85 ? gid('snow3') : gid('snow4')
        : r < 0.55 ? gid('grass1') : r < 0.7 ? gid('grass2') : r < 0.85 ? gid('grass3')
          : gid('grass4');
  }
}

// ── Rivers ── on the walls layer so they block movement; the banks carry the
// waterline into the ground on either side.
const river = (R) => {
  for (let x = 0; x < W; x++) {
    walls[at(x, R.from)] = gid('bank_top');
    for (let y = R.from + 1; y < R.to; y++) walls[at(x, y)] = gid('water');
    walls[at(x, R.to)] = gid('bank_bottom');
  }
};
river(RIVER1);
river(RIVER2);

// ── Roads ── dirt paths in front of each building row, plus the main street
// running the length of the map and over both bridges.
const road = new Set();
const pave = (x, y) => {
  const r = rand();
  const a = areaOf(y);
  ground[at(x, y)] = a === 'desert'
    ? r < 0.7 ? gid('sand_road') : r < 0.8 ? gid('sand_road2') : gid('sand_road3')
    : a === 'snow' ? gid('snow_path') : gid('dirt');
  road.add(at(x, y));
};
for (const rows of [FOREST_HOUSE_ROWS, DESERT_HOUSE_ROWS]) {
  for (const r of rows) {
    for (let x = HOUSE_COLS[0] - 2; x <= HOUSE_COLS[3] + 5; x++) pave(x, r + 4);
  }
}
for (const r of TOWER_ROWS) {
  for (let x = TOWER_COLS[0] - 2; x <= TOWER_COLS[2] + 4; x++) pave(x, r + 3);
}
for (let y = FOREST_HOUSE_ROWS[0] + 4; y <= TOWER_ROWS[1] + 3; y++) {
  for (const x of BRIDGE1.cols) pave(x, y);
}

// ── Bridges ── wooden deck on the ground layer, water cleared beneath.
const bridge = (B) => {
  for (let y = B.from; y <= B.to; y++) {
    // No 'bridge_top' cap: the deck's raised top rim reads as a hole from above,
    // so the planks run straight off the bank instead.
    const kind = y === B.to ? 'bridge_bottom' : 'bridge_mid';
    ground[at(B.cols[0], y)] = gid(kind);          // left column (left edge)
    ground[at(B.cols[1], y)] = gid(`${kind}_r`);   // right column (right edge)
    walls[at(B.cols[0], y)] = 0;
    walls[at(B.cols[1], y)] = 0;
  }
};
bridge(BRIDGE1);
bridge(BRIDGE2);

// ── Borders ── trees ring the forest, palms the desert, white trees the snow.
for (let x = 0; x < W - 1; x += 2) place(walls, 'tree_small', x, 0);
for (let y = 2; y <= RIVER1.from - 4; y += 2) {
  place(walls, 'tree_small', 0, y);
  place(walls, 'tree_small', W - 2, y);
}
for (let y = RIVER1.to + 2; y <= RIVER2.from - 4; y += 2) {
  place(walls, y % 4 === 0 ? 'palm_small' : 'palm_small2', 0, y);
  place(walls, y % 4 === 2 ? 'palm_small' : 'palm_small2', W - 2, y);
}
for (let x = 0; x < W - 1; x += 2) place(walls, 'snow_tree', x, H - 2);
for (let y = RIVER2.to + 2; y <= H - 4; y += 2) {
  place(walls, 'snow_tree', 0, y);
  place(walls, 'snow_tree', W - 2, y);
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
const addBuildings = (region, rows, cols, styleAt, doorDx) => {
  let slot = 0;
  rows.forEach((r, ri) => {
    cols.forEach((c, ci) => {
      const style = styleAt(ri, ci);
      place(walls, style, c, r);
      // The station point sits one tile below the building's door.
      const doorY = r + ts.tiles[style].h + 1;
      objects.push(point('station', (c + doorDx) * T, doorY * T, [
        prop('region', 'string', region),
        prop('slot', 'int', slot++),
      ]));
      slotTiles.push([c + Math.floor(doorDx), doorY]);
    });
  });
};
// Houses are 4 wide with the door at local col 1; towers are 2 wide, door centred.
addBuildings('public', FOREST_HOUSE_ROWS, HOUSE_COLS,
  (ri, ci) => FOREST_STYLES[(ri + ci) % FOREST_STYLES.length], 1.5);
addBuildings('system', DESERT_HOUSE_ROWS, HOUSE_COLS,
  (ri, ci) => ((ri + ci) % 2 === 0 ? 'dhouse' : 'dtower'), 1.5);
addBuildings('feature', TOWER_ROWS, TOWER_COLS,
  (ri, ci) => ((ri + ci) % 2 === 0 ? 'tower_a' : 'tower_b'), 1);

// ── Landmarks ── a torii gate over the main street, a well by the desert road,
// and big trees / palms / snowy pines flanking each area.
place(decor, 'torii', 28, 22);
place(walls, 'well', 25, 31);
for (const r of FOREST_HOUSE_ROWS) {
  place(walls, 'tree_big', 2, r);
  place(walls, 'tree_big', 53, r);
}
for (const r of DESERT_HOUSE_ROWS) {
  place(walls, 'palm_big', 2, r);
  place(walls, 'palm_big', 53, r);
}
for (const r of TOWER_ROWS) {
  place(walls, 'snow_tree_big', 2, r);
  place(walls, 'snow_tree_big', 53, r);
}
place(walls, 'stump', 14, 8);
place(walls, 'tree_round', 44, 8);
place(walls, 'tree_round', 15, 22);
place(walls, 'rock_b', 45, 15);
place(walls, 'rock_a', 26, 8);
place(walls, 'rock_b', 33, 51);
place(walls, 'rock_a', 18, 51);

// ── Decor ── sparse, clear of walls, roads, stations, rivers and bridges. The
// snow highlands stay bare — the drifts in the ground tiles carry it.
const nearSlot = (x, y) =>
  slotTiles.some(([sx, sy]) => Math.abs(sx - x) <= 1 && Math.abs(sy - y) <= 1);
const inRiver = (y) =>
  (y >= RIVER1.from - 1 && y <= RIVER1.to + 1) || (y >= RIVER2.from - 1 && y <= RIVER2.to + 1);
const clear = (x, y) =>
  x > 1 && x < W - 2 && !walls[at(x, y)] && !decor[at(x, y)] &&
  !road.has(at(x, y)) && !nearSlot(x, y) && !inRiver(y);

for (let y = 2; y < H - 2; y++) {
  const a = areaOf(y);
  if (a === 'snow') continue;
  const desert = a === 'desert';
  for (let x = 2; x < W - 2; x++) {
    if (!clear(x, y) || rand() >= 0.045) continue;
    decor[at(x, y)] = desert
      ? gid(pick(['dtuft', 'dtuft', 'sprout1', 'sprout2', 'pot1', 'pot2']))
      : gid(pick(['tuft1', 'tuft2', 'tuft3', 'flower1', 'flower2', 'flower3']));
  }
}
for (const [x, y] of [[16, 33], [42, 47], [26, 40]]) {
  if (clear(x, y) && clear(x + 1, y) && clear(x, y + 1) && clear(x + 1, y + 1)) {
    place(decor, 'dplant', x, y);
  }
}

// ── Meta objects ──
objects.push(point('spawn', 30 * T, 21 * T));
// The bridges are the passages between areas: route through their centres.
objects.push(point('door', 30 * T, 27.5 * T));
objects.push(point('door', 30 * T, 58.5 * T));
objects.push(point('label', 3 * T, 2.5 * T, [
  prop('text', 'string', 'PUBLIC'),
  prop('theme', 'string', 'forest'),
]));
objects.push(point('label', 3 * T, 30.5 * T, [
  prop('text', 'string', 'SYSTEM'),
  prop('theme', 'string', 'desert'),
]));
objects.push(point('label', 3 * T, 61.5 * T, [
  prop('text', 'string', 'LEARNING'),
  prop('theme', 'string', 'snow'),
]));

// ── Assemble the Tiled document ──
const tileLayer = (id, name, data) => ({
  id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0,
  opacity: 1, visible: true, data,
});

// Per-tile metadata: collides flags plus tile animations (standard Tiled
// format — Phaser plays these natively, e.g. the rippling river water).
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
      name: 'village',
      image: 'tileset-village.png',
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
