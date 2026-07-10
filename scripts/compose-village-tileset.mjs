#!/usr/bin/env node
// Composes `public/game/maps/tileset-village.png` (+ a name → tile mapping in
// tileset-village.json) from the Ninja Adventure asset pack sitting at the
// repo root. Run it after updating the pack, then `generate-world-map.mjs`
// to rebuild the map that uses it:
//
//   node scripts/compose-village-tileset.mjs
//   node scripts/generate-world-map.mjs
//
// Uses `sharp` (already present in node_modules as a transitive dependency).
//
// Art: Ninja Adventure Asset Pack by Pixel-boy & AAA — CC0 1.0
// (https://pixel-boy.itch.io/ninja-adventure-asset-pack)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const T = 16;
const COLUMNS = 16; // tiles per row in the composed sheet
const PACK = new URL('../Ninja Adventure - Asset Pack/Backgrounds/Tilesets/', import.meta.url);
const OUT = new URL('../public/game/maps/', import.meta.url);

// name → [source sheet, tile x, tile y, tiles wide, tiles tall, collides]
const PICKS = {
  // ── ground fills (TilesetFloor terrain blocks) ──
  grass1: ['TilesetFloor.png', 0, 12, 1, 1, false],
  grass2: ['TilesetFloor.png', 1, 12, 1, 1, false],
  grass3: ['TilesetFloor.png', 2, 12, 1, 1, false],
  grass4: ['TilesetFloor.png', 3, 12, 1, 1, false],
  sand1: ['TilesetFloor.png', 1, 1, 1, 1, false],
  sand_pebble: ['TilesetFloor.png', 1, 4, 1, 1, false],
  sand_dune: ['TilesetFloor.png', 6, 1, 1, 1, false],
  sand_road: ['TilesetFloor.png', 0, 5, 1, 1, false],
  sand_road2: ['TilesetFloor.png', 1, 5, 1, 1, false],
  sand_road3: ['TilesetFloor.png', 2, 5, 1, 1, false],
  dirt: ['TilesetFloor.png', 4, 8, 1, 1, false],

  // ── river & bridge (TilesetWater) ──
  bank_top: ['TilesetWater.png', 5, 5, 1, 1, true],     // grass above, water below
  water: ['../Animated/Water Ripples/SpriteSheet16x16.png', 0, 0, 1, 1, true],
  water_f2: ['../Animated/Water Ripples/SpriteSheet16x16.png', 1, 0, 1, 1, true],
  water_f3: ['../Animated/Water Ripples/SpriteSheet16x16.png', 2, 0, 1, 1, true],
  water_f4: ['../Animated/Water Ripples/SpriteSheet16x16.png', 3, 0, 1, 1, true],
  bank_bottom: ['TilesetWater.png', 5, 2, 1, 1, true],  // water above, sand below
  bridge_top: ['TilesetWater.png', 4, 11, 2, 1, false], // wooden deck, 2 cols wide
  bridge_mid: ['TilesetWater.png', 4, 12, 2, 1, false],
  bridge_bottom: ['TilesetWater.png', 4, 14, 2, 1, false],
  bridge_top_r: ['TilesetWater.png', 8, 11, 1, 1, false], // right-edge column
  bridge_mid_r: ['TilesetWater.png', 8, 12, 1, 1, false],
  bridge_bottom_r: ['TilesetWater.png', 8, 14, 1, 1, false],

  // ── forest (TilesetNature / TilesetHouse) ──
  tree_small: ['TilesetNature.png', 0, 0, 2, 2, true],
  tree_big: ['TilesetNature.png', 4, 2, 4, 3, true],
  tree_round: ['TilesetNature.png', 6, 8, 2, 2, true],
  stump: ['TilesetNature.png', 0, 8, 2, 2, true],
  tuft1: ['TilesetNature.png', 1, 10, 1, 1, false],
  tuft2: ['TilesetNature.png', 4, 10, 1, 1, false],
  tuft3: ['TilesetNature.png', 6, 10, 1, 1, false],
  flower1: ['TilesetNature.png', 0, 11, 1, 1, false],
  flower2: ['TilesetNature.png', 1, 11, 1, 1, false],
  flower3: ['TilesetNature.png', 6, 11, 1, 1, false],
  rock_a: ['TilesetNature.png', 15, 8, 1, 1, true],
  rock_b: ['TilesetNature.png', 4, 13, 1, 1, true],
  house_a: ['TilesetHouse.png', 0, 0, 4, 3, true],
  house_b: ['TilesetHouse.png', 4, 0, 4, 3, true],
  house_c: ['TilesetHouse.png', 8, 0, 4, 3, true],
  house_d: ['TilesetHouse.png', 12, 0, 4, 3, true],
  torii: ['TilesetHouse.png', 0, 5, 3, 2, false], // village gate, walk-under
  fence_h: ['TilesetHouse.png', 11, 5, 1, 1, true],

  // ── desert (TilesetDesert) ──
  dhouse: ['TilesetDesert.png', 0, 0, 3, 3, true],
  dtower: ['TilesetDesert.png', 3, 0, 3, 4, true],
  well: ['TilesetDesert.png', 0, 3, 2, 2, true],
  palm_big: ['TilesetDesert.png', 10, 7, 4, 3, true],
  palm_small: ['TilesetDesert.png', 10, 10, 2, 2, true],
  palm_small2: ['TilesetDesert.png', 12, 10, 2, 2, true],
  dtuft: ['TilesetDesert.png', 8, 9, 1, 1, false],
  dplant: ['TilesetDesert.png', 8, 10, 2, 2, false],
  sprout1: ['TilesetDesert.png', 14, 10, 1, 1, false],
  sprout2: ['TilesetDesert.png', 14, 11, 1, 1, false],
  pot1: ['TilesetDesert.png', 6, 11, 1, 1, false],
  pot2: ['TilesetDesert.png', 7, 11, 1, 1, false],
};

// Tile animations (standard Tiled format; Phaser plays them natively).
// name → frame names + per-frame duration in ms.
const ANIMATIONS = {
  water: { frames: ['water', 'water_f2', 'water_f3', 'water_f4'], frameDuration: 300 },
};

// Shelf-pack the blocks into a COLUMNS-wide sheet, in declaration order.
let cx = 0, cy = 0, shelf = 0;
const placed = {}; // name → { x, y, w, h, collides }
for (const [name, [, , , w, h, collides]] of Object.entries(PICKS)) {
  if (cx + w > COLUMNS) { cx = 0; cy += shelf; shelf = 0; }
  placed[name] = { x: cx, y: cy, w, h, collides };
  cx += w;
  shelf = Math.max(shelf, h);
}
const ROWS = cy + shelf;

const composites = Object.entries(PICKS).map(async ([name, [sheet, sx, sy, w, h]]) => ({
  input: await sharp(fileURLToPath(new URL(sheet, PACK)))
    .extract({ left: sx * T, top: sy * T, width: w * T, height: h * T })
    .png()
    .toBuffer(),
  left: placed[name].x * T,
  top: placed[name].y * T,
}));

await sharp({
  create: {
    width: COLUMNS * T,
    height: ROWS * T,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(await Promise.all(composites))
  .png()
  .toFile(fileURLToPath(new URL('tileset-village.png', OUT)));

writeFileSync(
  fileURLToPath(new URL('tileset-village.json', OUT)),
  JSON.stringify({ columns: COLUMNS, tilecount: COLUMNS * ROWS, tileSize: T, tiles: placed, animations: ANIMATIONS }, null, 2),
);
console.log(`wrote tileset-village.png (${COLUMNS * T}x${ROWS * T}) + tileset-village.json (${Object.keys(placed).length} entries)`);
