#!/usr/bin/env node
// Generates the world template `public/game/maps/village.tmj` from the
// Sunnyside World 16px tileset — a single organic island of three districts
// (MEADOW / LAKESIDE / HIGHLAND) ringed by ocean, pinched into rooms by two
// straits each spanned by a land bridge (the door crossings the game routes
// through). See scripts/README or public/game/maps/README.md.
//
//   node scripts/generate-sunnyside-world.mjs
//
// The whole Sunnyside 16px sheet is the map's one tileset (no compose/merge
// step), so any (col,row) is addressable as a gid = row*64 + col + 1. Terrain
// is autotiled; buildings/props are stamped as sheet rectangles.
//
// Map contract the game relies on (WorldScene): tile layers with a `walls`
// layer whose tiles block movement, and an object layer `meta` with point
// objects: spawn / door / label(text,theme) / station(region,slot).
//
// Art: Sunnyside World Asset Pack V2.1 — by Daniel Diggle (RabidGremlin) /
// Sunnyside. 16px tiles.

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const T = 16;              // tile px
const COLS = 64;           // tileset columns
const W = 64, H = 150;     // map size in tiles
const MAPS = new URL('../public/game/maps/', import.meta.url);
const SRC_SHEET = new URL(
  '../tiled/extracted/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets/Tileset/spr_tileset_sunnysideworld_16px.png',
  import.meta.url,
);
const OUT_SHEET = 'tileset-sunnyside.png';

// Tiled/Phaser flip flags packed into the high bits of a gid.
const FH = 0x80000000, FV = 0x40000000;

const gid = (c, r) => r * COLS + c + 1;           // (col,row) -> gid

// ── Terrain tiles ──
const OCEAN = (x, y) => gid(11 + (x & 3), 18 + (y & 3));   // seamless 4x4 deep water
const SHALLOW = () => gid(30, 7);                          // solid cyan shallow water (animated)
const SHALLOW_FOAM = () => gid(30, 6);                     // cyan + white foam lip (animated)
const SAND = () => (rand() < 0.82 ? gid(5, 1) : gid(7, 1));
const GRASS = () => {
  const r = rand();               // clean centres only ((3,4) has a right-edge rim)
  return r < 0.42 ? gid(1, 3) : r < 0.74 ? gid(3, 3) : r < 0.9 ? gid(1, 4)
    : r < 0.95 ? gid(2, 3) : gid(2, 4);
};
const GRASS_CORNER = gid(8, 3);   // grass fills SE, open N+W (flip for other 3 corners)
const DIRT = () => (rand() < 0.5 ? gid(20, 7) : gid(21, 7));   // path fill

// ── Props (sheet rectangles: col,row = top-left, w,h in tiles) ──
// Wide gable cottages assembled from the modular building tileset. Each colour
// block sits 8 rows below the previous, with the same piece layout inside it:
// tan roof ridge → blue/coloured roof → brown eave → wall with a door → base
// with corner posts. 5×6 tiles.
const HOUSE_W = 5, HOUSE_H = 6;
const houseTemplate = (R) => ({
  w: HOUSE_W, h: HOUSE_H,
  tmpl: [
    [[20, R],     [21, R],     [21, R],     [21, R],     [20, R]],     // roof ridge cap
    [[21, R + 2], [21, R + 2], [21, R + 2], [21, R + 2], [21, R + 2]], // roof
    [[21, R + 2], [21, R + 2], [21, R + 2], [21, R + 2], [21, R + 2]], // roof
    [[23, R + 3], [23, R + 3], [23, R + 3], [23, R + 3], [23, R + 3]], // eave
    [[24, R + 4], [24, R + 4], [21, R + 4], [24, R + 4], [24, R + 4]], // wall + door
    [[29, R + 6], [30, R + 6], [30, R + 6], [30, R + 6], [31, R + 6]], // base + posts
  ],
});
const HOUSES = {
  blue: houseTemplate(9), green: houseTemplate(17), orange: houseTemplate(25),
  red: houseTemplate(33), purple: houseTemplate(41),
};
const TOWERS = HOUSES;
const BUSH = { c: 49, r: 1, w: 2, h: 2 };
const BUSH_BERRY = { c: 49, r: 3, w: 2, h: 2 };
const FLOWER = { c: 31, r: 3, w: 1, h: 1 };       // white daisy
const CROPS = [gid(51, 12), gid(52, 12), gid(53, 12)]; // leafy sprouts
const PUMPKIN = gid(53, 10);
// Clean, whole boulders (each self-contained on the sheet).
const ROCKS = [
  { c: 49, r: 29, w: 2, h: 2 },
  { c: 51, r: 29, w: 2, h: 2 },
  { c: 53, r: 21, w: 2, h: 2 },
];
const PEBBLE = { c: 55, r: 29, w: 1, h: 2 };
const PINE = { c: 51, r: 6, w: 2, h: 3 };     // single pine, whole
const SHRUB = { c: 49, r: 1, w: 2, h: 2 };    // round leafy tree
const WELL = { c: 37, r: 19, w: 4, h: 3 };

// ── Layers ──
const sea = new Array(W * H).fill(0);
const ground = new Array(W * H).fill(0);   // sand / shallow beneath grass edges
const land = new Array(W * H).fill(0);     // grass
const decor = new Array(W * H).fill(0);    // bushes, small props
const build = new Array(W * H).fill(0);    // houses, trees, rocks
const walls = new Array(W * H).fill(0);    // collision (mirrors solids)
const road = new Set();                    // path cells (kept clear of props)
const at = (x, y) => y * W + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// Deterministic PRNG.
let seed = 20260725;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const chance = (p) => rand() < p;

// ── Island shape ──
const CROSS_X = [30, 31, 32, 33];               // bridge columns at both straits
const STRAIT1 = 50, STRAIT2 = 100;              // strait centre rows (doors here)
const districts = [
  { name: 'MEADOW',   theme: 'forest', cx: 32, cy: 26,  rx: 27, ry: 21, region: 'public'  },
  { name: 'LAKESIDE', theme: 'snow',   cx: 32, cy: 76,  rx: 28, ry: 22, region: 'system'  },
  { name: 'HIGHLAND', theme: 'desert', cx: 32, cy: 124, rx: 27, ry: 21, region: 'feature' },
];
const LAKE = { cx: 41, cy: 78, rx: 8, ry: 6 };

const wob = (x, y) => 0.12 * Math.sin(x * 0.7 + y * 0.2) + 0.12 * Math.cos(y * 0.6 - x * 0.15);
const inEllipse = (x, y, e) => {
  const dx = (x - e.cx) / e.rx, dy = (y - e.cy) / e.ry;
  return dx * dx + dy * dy < 1 + wob(x, y);
};
const isLandRaw = (x, y) => {
  if (!inb(x, y)) return false;
  if (inEllipse(x, y, LAKE)) return false;                 // the lake is water
  if (districts.some((d) => inEllipse(x, y, d))) return true;
  return false;                                            // straits stay water — bridges span them
};

// Bake land into a grid, then smooth once to kill single-tile spurs.
let L = new Array(W * H).fill(false);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) L[at(x, y)] = isLandRaw(x, y);
const smooth = () => {
  const n = new Array(W * H).fill(false);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (inb(x + dx, y + dy) && L[at(x + dx, y + dy)]) c++;
    }
    n[at(x, y)] = L[at(x, y)] ? c >= 4 : c >= 6;
  }
  L = n;
};
smooth();
const isLand = (x, y) => inb(x, y) && L[at(x, y)];

// Distance (in tiles, up to 3) from each water cell to the nearest land.
const distToLand = new Array(W * H).fill(99);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (isLand(x, y)) { distToLand[at(x, y)] = 0; continue; }
  let best = 99;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (isLand(x + dx, y + dy)) best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy)));
  }
  distToLand[at(x, y)] = best;
}

// ── Paint sea / shallow / sand / grass ──
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  sea[at(x, y)] = OCEAN(x, y);                            // deep water everywhere first
  const d = distToLand[at(x, y)];
  if (!isLand(x, y)) {
    // Two-tile shallow ring of solid cyan; the tile touching the beach gets a
    // white foam lip so the sea→sand edge reads cleanly (no green transition).
    if (d === 1) ground[at(x, y)] = SHALLOW_FOAM();
    else if (d === 2) ground[at(x, y)] = SHALLOW();
  } else {
    ground[at(x, y)] = SAND();                            // beach base under grass
  }
}

// Grass = land eroded by one, so a 1-tile sand beach always rings the grass.
const isGrass = (x, y) =>
  isLand(x, y) && isLand(x - 1, y) && isLand(x + 1, y) && isLand(x, y - 1) && isLand(x, y + 1);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!isGrass(x, y)) continue;
  const N = isGrass(x, y - 1), S = isGrass(x, y + 1), E = isGrass(x + 1, y), Wl = isGrass(x - 1, y);
  let t = GRASS();
  if (!N && !Wl && S && E) t = GRASS_CORNER;             // top-left
  else if (!N && !E && S && Wl) t = GRASS_CORNER | FH;   // top-right
  else if (!S && !Wl && N && E) t = GRASS_CORNER | FV;   // bottom-left
  else if (!S && !E && N && Wl) t = GRASS_CORNER | FH | FV; // bottom-right
  land[at(x, y)] = t;
}

// ── Prop stamping ──
const slotTiles = [];
/** Stamp a sheet rect onto a layer at map (mx,my) top-left. */
const stamp = (layer, spr, mx, my) => {
  for (let dy = 0; dy < spr.h; dy++) for (let dx = 0; dx < spr.w; dx++) {
    const x = mx + dx, y = my + dy;
    if (inb(x, y)) layer[at(x, y)] = gid(spr.c + dx, spr.r + dy);
  }
};
/** Mark a rectangle of the walls layer solid (collision). */
const block = (mx, my, w, h) => {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    if (inb(mx + dx, my + dy)) walls[at(mx + dx, my + dy)] = gid(11, 18); // any non-zero gid
  }
};
/** True if a w×h block of grass is free of other builds/roads around (mx,my). */
const areaFree = (mx, my, w, h, pad = 1) => {
  for (let y = my - pad; y < my + h + pad; y++) for (let x = mx - pad; x < mx + w + pad; x++) {
    if (!inb(x, y)) return false;
    if (!isGrass(x, y)) return false;
    if (build[at(x, y)] || decor[at(x, y)] || walls[at(x, y)] || road.has(at(x, y))) return false;
  }
  return true;
};

const objects = [];
let objectId = 1;
const point = (type, x, y, properties = []) => ({
  id: objectId++, name: '', type, point: true, visible: true, rotation: 0,
  x: Math.round(x), y: Math.round(y), properties,
});
const prop = (name, type, value) => ({ name, type, value });

/** Stamp a house template (2D array of [col,row]) onto a layer. */
const stampHouse = (layer, house, mx, my) => {
  house.tmpl.forEach((row, dy) => row.forEach(([c, r], dx) => {
    if (inb(mx + dx, my + dy)) layer[at(mx + dx, my + dy)] = gid(c, r);
  }));
};

/** Place a building + emit its station slot at the door (one tile below). */
const placeBuilding = (spr, mx, my, region, slot) => {
  stampHouse(build, spr, mx, my);
  block(mx, my + spr.h - 4, spr.w, 4);            // solid lower 4 rows (eave→base)
  const doorX = mx + (spr.w >> 1);
  const doorY = my + spr.h;                        // stand just below the house
  objects.push(point('station', doorX * T + T / 2, doorY * T, [
    prop('region', 'string', region),
    prop('slot', 'int', slot),
  ]));
  slotTiles.push([doorX, doorY]);
};

// Scatter buildings across a district on free grass with spacing.
const HOUSE_LIST = Object.values(HOUSES);
const placeDistrictHouses = (d, region, count, sprs) => {
  let slot = 0, tries = 0;
  const placed = [];
  while (slot < count && tries < 4000) {
    tries++;
    const spr = sprs[slot % sprs.length];
    const mx = 3 + ((rand() * (W - spr.w - 6)) | 0);
    const my = (d.cy - d.ry + 4 + rand() * (d.ry * 2 - spr.h - 6)) | 0;
    if (!areaFree(mx, my, spr.w, spr.h, 2)) continue;
    if (placed.some(([px, py]) => Math.abs(px - mx) < spr.w + 3 && Math.abs(py - my) < spr.h + 3)) continue;
    if (Math.abs((my + spr.h) - STRAIT1) < 8 || Math.abs((my + spr.h) - STRAIT2) < 8) continue;
    placeBuilding(spr, mx, my, region, slot);
    placed.push([mx, my]);
    slot++;
  }
  return placed;
};

placeDistrictHouses(districts[0], 'public', 10, HOUSE_LIST);
placeDistrictHouses(districts[1], 'system', 8, HOUSE_LIST);
placeDistrictHouses(districts[2], 'feature', 6, Object.values(TOWERS));

// ── Roads ── a wandering main street the length of the island (over both
// bridges), with a short spur from every door out to it.
const carve = (x, y) => {
  if (!isGrass(x, y) || walls[at(x, y)]) return;
  land[at(x, y)] = DIRT();
  road.add(at(x, y));
};
const carveWide = (x, y) => { carve(x, y); carve(x + 1, y); };
let sx = 32;
for (let y = 3; y < H - 3; y++) {
  sx += Math.round((32 - sx) * 0.15 + (rand() - 0.5) * 1.4);
  sx = Math.max(6, Math.min(W - 8, Math.abs(y - STRAIT1) < 6 || Math.abs(y - STRAIT2) < 6 ? 31 : sx));
  carveWide(sx, y);
}
const roadCells = [...road];
const nearestRoad = (x, y) => {
  let best = null, bd = 1e9;
  for (const c of roadCells) {
    const rx = c % W, ry = (c / W) | 0;
    const d = Math.abs(rx - x) + Math.abs(ry - y);
    if (d < bd) { bd = d; best = [rx, ry]; }
  }
  return best;
};
for (const [dx, dy] of slotTiles) {
  const tgt = nearestRoad(dx, dy);
  if (!tgt) continue;
  let [x, y] = [dx, dy];
  let guard = 0;
  while ((x !== tgt[0] || y !== tgt[1]) && guard++ < 60) {
    carve(x, y);
    if (Math.abs(tgt[0] - x) > Math.abs(tgt[1] - y)) x += Math.sign(tgt[0] - x);
    else y += Math.sign(tgt[1] - y);
  }
}

// ── Windmills ── one animated landmark per district, placed while there's
// still room (WorldScene draws the sprite; here we emit the point + reserve a
// small collision base so paths and props route around it).
for (const d of districts) {
  for (let tries = 0; tries < 500; tries++) {
    const mx = 8 + ((rand() * (W - 16)) | 0);
    const my = (d.cy - d.ry + 6 + rand() * (d.ry * 2 - 14)) | 0;
    if (!areaFree(mx, my, 4, 4, 1)) continue;
    block(mx, my + 2, 4, 2);                          // solid base
    objects.push(point('windmill', (mx + 2) * T, (my + 4) * T));
    break;
  }
}

// ── Fields ── little tilled crop plots dotted through the meadows.
const pickCrop = () => CROPS[(rand() * CROPS.length) | 0];
const placeField = (w, h) => {
  for (let t = 0; t < 400; t++) {
    const mx = 3 + ((rand() * (W - w - 6)) | 0);
    const my = 3 + ((rand() * (H - h - 6)) | 0);
    if (!areaFree(mx, my, w, h, 1)) continue;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      land[at(mx + x, my + y)] = DIRT();
      road.add(at(mx + x, my + y));           // reserve so scatter avoids it
      if (rand() < 0.72) decor[at(mx + x, my + y)] = rand() < 0.88 ? pickCrop() : PUMPKIN;
    }
    return;
  }
};
for (let i = 0; i < 14; i++) placeField(4, 3);

// ── Scenery: trees ring the coasts, rocks & bushes fleck the interior ──
const scatter = (spr, layer, n, filter, solidRows = 1) => {
  let placed = 0, tries = 0;
  while (placed < n && tries < n * 80) {
    tries++;
    const mx = 2 + ((rand() * (W - spr.w - 4)) | 0);
    const my = 2 + ((rand() * (H - spr.h - 4)) | 0);
    if (!areaFree(mx, my, spr.w, spr.h, 1)) continue;
    if (filter && !filter(mx, my)) continue;
    stamp(layer, spr, mx, my);
    block(mx, my + spr.h - solidRows, spr.w, solidRows);   // trunk/base is solid
    placed++;
  }
};
// Trees prefer the coast (near the beach) for that framed-island look.
const nearCoast = (x, y) => {
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (inb(x + dx, y + dy) && !isLand(x + dx, y + dy)) return true;
  }
  return false;
};
// Woods: clumps of whole trees (pines + leafy shrubs), so forests read as real
// trees rather than a sliced-up block.
const woods = (n, cx, cy, spread) => {
  let placed = 0, tries = 0;
  while (placed < n && tries < n * 40) {
    tries++;
    const mx = cx + ((rand() * spread * 2 - spread) | 0);
    const my = cy + ((rand() * spread * 2 - spread) | 0);
    const spr = rand() < 0.6 ? PINE : SHRUB;
    if (!areaFree(mx, my, spr.w, spr.h, 0)) continue;
    stamp(build, spr, mx, my);
    block(mx, my + spr.h - 1, spr.w, 1);
    placed++;
  }
};
for (const d of districts) {
  for (let k = 0; k < 2; k++) {
    const cx = 5 + ((rand() * (W - 10)) | 0);
    const cy = (d.cy - d.ry + 4 + rand() * (d.ry * 2 - 8)) | 0;
    woods(9, cx, cy, 5);
  }
}
scatter(PINE, build, 30, nearCoast, 1);
scatter(SHRUB, build, 42, null, 1);
for (const rk of ROCKS) scatter(rk, build, 8, null, 1);
scatter(PEBBLE, build, 14, null, 1);
// Bushes & berry bushes as soft decor (no collision).
const scatterDecor = (spr, n) => {
  let placed = 0, tries = 0;
  while (placed < n && tries < n * 60) {
    tries++;
    const mx = 2 + ((rand() * (W - spr.w - 4)) | 0);
    const my = 2 + ((rand() * (H - spr.h - 4)) | 0);
    if (!areaFree(mx, my, spr.w, spr.h, 0)) continue;
    stamp(decor, spr, mx, my);
    placed++;
  }
};
scatterDecor(BUSH, 40);
scatterDecor(BUSH_BERRY, 12);
scatterDecor(FLOWER, 70);

// A well in the meadow's heart as a landmark.
for (let tries = 0; tries < 200; tries++) {
  const mx = districts[0].cx - 2 + ((rand() * 5 - 2) | 0);
  const my = districts[0].cy - 1 + ((rand() * 5 - 2) | 0);
  if (areaFree(mx, my, WELL.w, WELL.h, 2)) { stamp(build, WELL, mx, my); block(mx, my + 1, WELL.w, 2); break; }
}

// ── Water shimmer ── sparkle glints twinkle densely across the open sea. Four
// variants animate at different rates so the shimmer doesn't pulse in unison.
// The animation frames are defined on the tileset below.
const SPARKLE_BASES = [gid(11, 22), gid(12, 22), gid(13, 22), gid(14, 22)];
const seafx = new Array(W * H).fill(0);
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  if (isLand(x, y) || distToLand[at(x, y)] <= 1) continue;   // shallow + deep water
  if (rand() < 0.06) seafx[at(x, y)] = SPARKLE_BASES[(rand() * SPARKLE_BASES.length) | 0];
}

// ── Meta objects: spawn, doors, labels ──
objects.push(point('spawn', districts[0].cx * T, (districts[0].cy + districts[0].ry - 6) * T));
objects.push(point('door', 32 * T, STRAIT1 * T));
objects.push(point('door', 32 * T, STRAIT2 * T));
for (const d of districts) {
  objects.push(point('label', 3 * T, (d.cy - d.ry + 2) * T, [
    prop('text', 'string', d.name),
    prop('theme', 'string', d.theme),
  ]));
}

// ── Water is collision too (can't walk into the sea/lake/shallows) ──
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!isLand(x, y)) walls[at(x, y)] = gid(11, 18);
}

// ── Bridges ── wooden planks span each strait, connecting the districts. The
// deck (cols 31–32) is walkable (walls cleared); posts flank it as pilings.
const DECK = gid(40, 6), POST = gid(38, 6);
const bridgeCol = (S) => {
  // find how far the land reaches toward the strait from each side at x=32
  for (let y = S - 10; y <= S + 10; y++) {
    for (const x of [31, 32]) {
      if (!inb(x, y)) continue;
      build[at(x, y)] = DECK;
      walls[at(x, y)] = 0;                 // walkable deck
      road.delete(at(x, y));
    }
    if (y % 2 === 0) {                      // alternating pilings on both edges
      if (inb(30, y) && !isLand(30, y)) build[at(30, y)] = POST;
      if (inb(33, y) && !isLand(33, y)) build[at(33, y)] = POST;
    }
  }
};
bridgeCol(STRAIT1);
bridgeCol(STRAIT2);

// ── Waterfall ── the lake spills over a short cliff into a splash pool. The
// falling water uses the pack's animated shallow-water tiles (30,6/7/8), whose
// 4-frame animations are re-declared on the tileset below so they shimmer.
const WF_FOAM = gid(30, 6), WF_FALL = gid(30, 7), WF_POOL = gid(30, 8);
const CLIFF = gid(11, 4), CLIFF_TOP = gid(11, 3);
const wfx = LAKE.cx - 1;                          // 2-wide channel, centred under the lake
const wfy = LAKE.cy + LAKE.ry - 1;               // starts at the lake's south lip
const solid = (x, y) => { if (inb(x, y)) walls[at(x, y)] = gid(11, 18); };
for (let dy = 0; dy < 6; dy++) {
  const y = wfy + dy;
  for (let dx = 0; dx < 2; dx++) {               // the falling water
    const x = wfx + dx;
    if (!inb(x, y)) continue;
    land[at(x, y)] = dy === 0 ? WF_FOAM : dy >= 5 ? WF_POOL : WF_FALL;
    decor[at(x, y)] = 0; build[at(x, y)] = 0;
    solid(x, y);
  }
  for (const x of [wfx - 1, wfx + 2]) {           // brown cliff walls flanking it
    if (!inb(x, y)) continue;
    land[at(x, y)] = dy === 0 ? CLIFF_TOP : dy >= 5 ? WF_POOL : CLIFF;
    decor[at(x, y)] = 0; build[at(x, y)] = 0;
    solid(x, y);
  }
}

// ── Animals ── grazing livestock scattered on open grass (WorldScene animates
// and wanders them). A `kind` picks the sprite; they roam around their point.
const ANIMAL_KINDS = ['chicken', 'chicken', 'sheep', 'sheep', 'cow', 'pig'];
const walkable = (x, y) => isLand(x, y) && !walls[at(x, y)] && !build[at(x, y)] && !road.has(at(x, y));
for (const d of districts) {
  let placed = 0, tries = 0;
  while (placed < 6 && tries < 500) {
    tries++;
    const x = 4 + ((rand() * (W - 8)) | 0);
    const y = (d.cy - d.ry + 4 + rand() * (d.ry * 2 - 8)) | 0;
    if (!walkable(x, y) || !walkable(x + 1, y) || !walkable(x, y + 1)) continue;
    objects.push(point('animal', (x + 0.5) * T, (y + 1) * T, [
      prop('kind', 'string', ANIMAL_KINDS[(rand() * ANIMAL_KINDS.length) | 0]),
    ]));
    placed++;
  }
}

// ── Assemble the Tiled document ──
copyFileSync(fileURLToPath(SRC_SHEET), fileURLToPath(new URL(OUT_SHEET, MAPS)));

const tileLayer = (id, name, data) => ({
  id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data,
});

// Per-tile collides flag for every gid used on the walls layer.
const wallIds = new Set();
for (const v of walls) if (v) wallIds.add((v & 0x1fffffff) - 1);
const tileEntries = new Map();
for (const id of wallIds) tileEntries.set(id, { id, properties: [prop('collides', 'bool', true)] });

// Water-sparkle animations (standard Tiled format; Phaser plays them natively).
// Frames: the four glint tiles (11..14, 22) — big → small → gone — then a long
// blank hold so each sparkle twinkles occasionally, not constantly. `blank` is
// an empty cell far down the (unused) bottom of the sheet.
const localId = (c, r) => r * COLS + c;
const glint = [localId(11, 22), localId(12, 22), localId(13, 22), localId(14, 22)];
const blank = localId(40, 60);   // empty cell in the unused bottom of the sheet
const sparkleAnim = (base, holdMs) => {
  const off = glint.indexOf(base);
  const seq = [...glint.slice(off), ...glint.slice(0, off)];  // start at this variant's phase
  const frames = seq.map((tileid, i) => ({ tileid, duration: 150 + i * 20 }));
  frames.push({ tileid: blank, duration: holdMs });           // twinkle then a short rest
  return frames;
};
const HOLDS = [360, 560, 780, 1020];    // different loop lengths → variants drift out of sync
SPARKLE_BASES.forEach((g, i) => {
  const id = (g & 0x1fffffff) - 1;
  tileEntries.set(id, { id, animation: sparkleAnim(id, HOLDS[i % HOLDS.length]) });
});

// Waterfall / shallow-water shimmer: the pack animates each of these tiles
// across its row (cols 30→33). Re-declare those 4-frame loops here.
for (const r of [6, 7, 8]) {
  const id = localId(30, r);
  tileEntries.set(id, {
    id, animation: [30, 31, 32, 33].map((c) => ({ tileid: localId(c, r), duration: 180 })),
  });
}

const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2',
  orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
  width: W, height: H, tilewidth: T, tileheight: T,
  nextlayerid: 9, nextobjectid: objectId,
  layers: [
    tileLayer(1, 'sea', sea),
    tileLayer(8, 'seafx', seafx),
    tileLayer(2, 'ground', ground),
    tileLayer(3, 'land', land),
    tileLayer(4, 'decor', decor),
    tileLayer(5, 'build', build),
    tileLayer(6, 'walls', walls),
    { id: 7, name: 'meta', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects },
  ],
  tilesets: [{
    firstgid: 1, name: 'sunnyside', image: OUT_SHEET,
    imagewidth: COLS * T, imageheight: (4096 / COLS) * T,
    columns: COLS, tilecount: 4096, tilewidth: T, tileheight: T, margin: 0, spacing: 0,
    tiles: [...tileEntries.values()],
  }],
};

// The walls layer is collision-only — hide its filler tiles from the renderer.
map.layers.find((l) => l.name === 'walls').visible = false;

writeFileSync(fileURLToPath(new URL('village.tmj', MAPS)), JSON.stringify(map));
console.log(`wrote village.tmj (${W}x${H} @ ${T}px, ${objects.length} objects) + ${OUT_SHEET}`);
