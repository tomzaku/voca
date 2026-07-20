#!/usr/bin/env node
// Composes `public/game/maps/tileset-world.png` (+ a name → tile mapping in
// tileset-world.json) from the epic rpg pack at the repo root. Run it after
// updating the pack, then `generate-world-map.mjs` to rebuild the map:
//
//   node scripts/compose-world-tileset.mjs
//   node scripts/generate-world-map.mjs
//
// Unlike the old 16px Ninja sheet, this pack's props are NOT tile-aligned in
// their source sheets, so every pick is a pixel rect that we pad out to whole
// tiles. `align` decides where the art sits inside that padded block — props
// sit on the block's bottom edge so they stand on the ground correctly.
//
// The pack ships no water/grass shore tiles (it expects grass autotiles layered
// over water), so this map deliberately only uses fully-opaque fills and rings
// its water with props instead — see generate-world-map.mjs.
//
// Art: EPIC RPG World — basic tileset and assets, standard v3.0.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const T = 32;
const COLUMNS = 16; // tiles per row in the composed sheet
const PACK = new URL('../epic rpg/basic_tileset_and_assets_standard_v3.0/', import.meta.url);
const OUT = new URL('../public/game/maps/', import.meta.url);

const GRASS = 'tiles/tiles-grass light-32x32.png';
const GRASS_MED = 'tiles/tiles-grass medium-32x32.png';
const EARTH = 'tiles/tiles-earth-32x32.png';
const STONE = 'tiles/tiles-stone32x32.png';
const TERRAIN = 'tiles/tiles-terrain-32x32.png';
const WATER = 'tiles/tiles-water.png';
const ASSETS = 'sprites/assets-spritesheet-standard.png';

/** A 1×1 ground fill, addressed by tile coords in its source sheet. */
const fill = (sheet, tx, ty, collides = false) =>
  ({ sheet, px: [tx * T, ty * T, T, T], tiles: [1, 1], collides });

// name → { sheet, px:[x,y,w,h], tiles:[w,h], align, collides }
// Ground fills were chosen by scanning each sheet for fully-opaque tiles.
const PICKS = {
  // ── meadow ── plain grass plus its flower/tuft variants
  grass1: fill(GRASS, 1, 1),
  grass2: fill(GRASS, 9, 0),
  grass3: fill(GRASS, 11, 0),
  grass4: fill(GRASS, 16, 0),
  grass5: fill(GRASS, 18, 0),
  // ── lakeside ── a darker grass so the middle area reads differently
  grassm1: fill(GRASS_MED, 1, 1),
  grassm2: fill(GRASS_MED, 9, 0),
  grassm3: fill(GRASS_MED, 17, 0),
  // ── highland ── earth in a few shades
  earth1: fill(EARTH, 10, 17),
  earth2: fill(EARTH, 1, 17),
  earth3: fill(EARTH, 10, 25),
  // ── roads & water ──
  road: fill(TERRAIN, 1, 1),          // sandy path
  stone: fill(STONE, 1, 1),           // highland paving
  water1: fill(WATER, 0, 2, true),    // 3 frames of the same ripple
  water2: fill(WATER, 1, 2, true),
  water3: fill(WATER, 2, 2, true),

  // ── houses ── pixel rects; padded to whole tiles, art aligned to the bottom
  house_blue:  { sheet: ASSETS, px: [625, 15, 192, 165], tiles: [6, 6], align: 'bottom', collides: true },
  house_red:   { sheet: ASSETS, px: [848, 15, 192, 165], tiles: [6, 6], align: 'bottom', collides: true },
  house_teal:  { sheet: ASSETS, px: [848, 207, 192, 165], tiles: [6, 6], align: 'bottom', collides: true },
  house_stone: { sheet: ASSETS, px: [448, 2, 139, 193], tiles: [5, 7], align: 'bottom', collides: true },

  // ── trees & bushes ──
  tree_big:  { sheet: ASSETS, px: [342, 0, 80, 128], tiles: [3, 4], align: 'bottom', collides: true },
  pine1:     { sheet: ASSETS, px: [270, 1, 61, 95], tiles: [2, 3], align: 'bottom', collides: true },
  pine2:     { sheet: ASSETS, px: [211, 3, 52, 92], tiles: [2, 3], align: 'bottom', collides: true },
  bush1:     { sheet: ASSETS, px: [9, 8, 62, 51], tiles: [2, 2], align: 'bottom', collides: true },
  bush2:     { sheet: ASSETS, px: [9, 68, 62, 51], tiles: [2, 2], align: 'bottom', collides: true },
  bush3:     { sheet: ASSETS, px: [9, 127, 62, 51], tiles: [2, 2], align: 'bottom', collides: true },
  bush4:     { sheet: ASSETS, px: [9, 184, 62, 51], tiles: [2, 2], align: 'bottom', collides: true },
};

// Tile animations (standard Tiled format; Phaser plays these natively).
const ANIMATIONS = {
  water1: { frames: ['water1', 'water2', 'water3'], frameDuration: 420 },
};

// Shelf-pack the blocks into a COLUMNS-wide sheet, in declaration order.
let cx = 0, cy = 0, shelf = 0;
const placed = {}; // name → { x, y, w, h, collides }
for (const [name, p] of Object.entries(PICKS)) {
  const [w, h] = p.tiles;
  if (cx + w > COLUMNS) { cx = 0; cy += shelf; shelf = 0; }
  placed[name] = { x: cx, y: cy, w, h, collides: !!p.collides };
  cx += w;
  shelf = Math.max(shelf, h);
}
const ROWS = cy + shelf;

const composites = await Promise.all(Object.entries(PICKS).map(async ([name, p]) => {
  const [sx, sy, sw, sh] = p.px;
  const [tw, th] = p.tiles;
  const slot = placed[name];
  // Centre horizontally; sit on the bottom edge unless told otherwise.
  const offX = Math.round((tw * T - sw) / 2);
  const offY = p.align === 'bottom' ? th * T - sh : Math.round((th * T - sh) / 2);
  return {
    input: await sharp(fileURLToPath(new URL(p.sheet, PACK)))
      .extract({ left: sx, top: sy, width: sw, height: sh })
      .png().toBuffer(),
    left: slot.x * T + offX,
    top: slot.y * T + offY,
  };
}));

await sharp({
  create: { width: COLUMNS * T, height: ROWS * T, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(composites)
  .png()
  .toFile(fileURLToPath(new URL('tileset-world.png', OUT)));

writeFileSync(
  fileURLToPath(new URL('tileset-world.json', OUT)),
  JSON.stringify({ columns: COLUMNS, tilecount: COLUMNS * ROWS, tileSize: T, tiles: placed, animations: ANIMATIONS }, null, 2),
);
console.log(`wrote tileset-world.png (${COLUMNS * T}x${ROWS * T}) + tileset-world.json (${Object.keys(placed).length} entries)`);
