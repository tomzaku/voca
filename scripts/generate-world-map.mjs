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
//       type "station"  region,slot      → where a collection can live
//       type "door"                      → passage waypoint between areas
//       type "label"    text,theme       → area name signs
// Everything else (art, shape, size, number of areas) is free.
//
// This template: two villages split by a river and joined by a wooden bridge.
// North bank is a forest village (PUBLIC collections), south bank a desert
// village (SYSTEM levels). Every station slot sits at the door of a house —
// walk up to a house to open its collection.
//
// Art: Ninja Adventure Asset Pack by Pixel-boy & AAA — CC0 1.0. Tile picks
// live in scripts/compose-village-tileset.mjs; see public/game/maps/README.md.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W = 60; // map size in tiles
const H = 56;
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

const RIVER = { from: 26, to: 28 };                     // water rows
const BRIDGE = { cols: [29, 30], from: 25, to: 29 };    // one tile onto each bank
const HOUSE_COLS = [8, 21, 34, 47];                     // left edge of each house
const FOREST_HOUSE_ROWS = [3, 10, 17];
const DESERT_HOUSE_ROWS = [31, 38, 45];
const FOREST_STYLES = ['house_a', 'house_b', 'house_c', 'house_d'];

// ── Ground ── grass up north, sand down south.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const r = rand();
    ground[at(x, y)] = y > RIVER.to
      ? r < 0.9 ? gid('sand1') : r < 0.95 ? gid('sand_pebble') : gid('sand_dune')
      : r < 0.55 ? gid('grass1') : r < 0.7 ? gid('grass2') : r < 0.85 ? gid('grass3')
        : gid('grass4');
  }
}

// ── River ── on the walls layer so it blocks movement; the banks carry the
// waterline into the grass/sand on either side.
for (let x = 0; x < W; x++) {
  walls[at(x, RIVER.from)] = gid('bank_top');
  for (let y = RIVER.from + 1; y < RIVER.to; y++) walls[at(x, y)] = gid('water');
  walls[at(x, RIVER.to)] = gid('bank_bottom');
}

// ── Roads ── dirt paths in front of each house row, plus the main street
// through the villages and over the bridge.
const road = new Set();
const pave = (x, y) => {
  const r = rand();
  ground[at(x, y)] = y > RIVER.to
    ? r < 0.7 ? gid('sand_road') : r < 0.8 ? gid('sand_road2') : gid('sand_road3')
    : gid('dirt');
  road.add(at(x, y));
};
for (const rows of [FOREST_HOUSE_ROWS, DESERT_HOUSE_ROWS]) {
  for (const r of rows) {
    for (let x = HOUSE_COLS[0] - 2; x <= HOUSE_COLS[3] + 5; x++) pave(x, r + 4);
  }
}
for (let y = FOREST_HOUSE_ROWS[0] + 4; y <= DESERT_HOUSE_ROWS[2] + 4; y++) {
  for (const x of BRIDGE.cols) pave(x, y);
}

// ── Bridge ── wooden deck on the ground layer, water cleared beneath.
for (let y = BRIDGE.from; y <= BRIDGE.to; y++) {
  // No 'bridge_top' cap: the deck's raised top rim reads as a hole from above,
  // so the planks run straight off the grass bank instead.
  const kind = y === BRIDGE.to ? 'bridge_bottom' : 'bridge_mid';
  ground[at(BRIDGE.cols[0], y)] = gid(kind);          // left column (left edge)
  ground[at(BRIDGE.cols[1], y)] = gid(`${kind}_r`);   // right column (right edge)
  walls[at(BRIDGE.cols[0], y)] = 0;
  walls[at(BRIDGE.cols[1], y)] = 0;
}

// ── Borders ── trees ring the forest, palms ring the desert.
for (let x = 0; x < W - 1; x += 2) place(walls, 'tree_small', x, 0);
for (let y = 2; y <= RIVER.from - 4; y += 2) {
  place(walls, 'tree_small', 0, y);
  place(walls, 'tree_small', W - 2, y);
}
for (let x = 0; x < W - 1; x += 2) place(walls, x % 4 === 0 ? 'palm_small' : 'palm_small2', x, H - 2);
for (let y = RIVER.to + 2; y <= H - 4; y += 2) {
  place(walls, y % 4 === 0 ? 'palm_small' : 'palm_small2', 0, y);
  place(walls, y % 4 === 2 ? 'palm_small' : 'palm_small2', W - 2, y);
}

// ── Houses (the station slots the app binds collections to) ──
const objects = [];
let objectId = 1;
const point = (type, x, y, properties = []) => ({
  id: objectId++, name: '', type, point: true, visible: true, rotation: 0,
  x: Math.round(x), y: Math.round(y), properties,
});
const prop = (name, type, value) => ({ name, type, value });

const slotTiles = [];
const addVillage = (region, rows, styleAt) => {
  let slot = 0;
  rows.forEach((r, ri) => {
    HOUSE_COLS.forEach((c, ci) => {
      const style = styleAt(ri, ci);
      place(walls, style, c, r);
      // The station point sits one tile below the door (door = local col 1).
      const doorY = r + ts.tiles[style].h + 1;
      objects.push(point('station', (c + 1.5) * T, doorY * T, [
        prop('region', 'string', region),
        prop('slot', 'int', slot++),
      ]));
      slotTiles.push([c + 1, doorY]);
    });
  });
};
addVillage('public', FOREST_HOUSE_ROWS, (ri, ci) => FOREST_STYLES[(ri + ci) % FOREST_STYLES.length]);
addVillage('system', DESERT_HOUSE_ROWS, (ri, ci) => ((ri + ci) % 2 === 0 ? 'dhouse' : 'dtower'));

// ── Landmarks ── a torii gate over the main street (walk-under decor), a
// well by the desert road, and big trees / palms flanking each village.
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
place(walls, 'stump', 14, 8);
place(walls, 'tree_round', 44, 8);
place(walls, 'tree_round', 15, 22);
place(walls, 'rock_b', 45, 15);
place(walls, 'rock_a', 26, 8);
place(walls, 'rock_b', 33, 51);
place(walls, 'rock_a', 18, 51);

// ── Decor ── sparse, clear of walls, roads, stations, river and bridge.
const nearSlot = (x, y) =>
  slotTiles.some(([sx, sy]) => Math.abs(sx - x) <= 1 && Math.abs(sy - y) <= 1);
const clear = (x, y) =>
  x > 1 && x < W - 2 && !walls[at(x, y)] && !decor[at(x, y)] &&
  !road.has(at(x, y)) && !nearSlot(x, y) &&
  !(y >= RIVER.from - 1 && y <= RIVER.to + 1);

for (let y = 2; y < H - 2; y++) {
  const desert = y > RIVER.to;
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
// The bridge is the passage between areas: route through its center.
objects.push(point('door', 30 * T, 27.5 * T));
objects.push(point('label', 3 * T, 2.5 * T, [
  prop('text', 'string', 'PUBLIC'),
  prop('theme', 'string', 'forest'),
]));
objects.push(point('label', 3 * T, 30.5 * T, [
  prop('text', 'string', 'SYSTEM'),
  prop('theme', 'string', 'desert'),
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
