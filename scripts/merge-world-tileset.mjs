#!/usr/bin/env node
// Merges extra 32px tile sheets onto the composed world sheet and rewrites
// `village.tmj` to point at the result:
//
//   node scripts/compose-world-tileset.mjs   # tileset-world.png (base)
//   node scripts/generate-world-map.mjs      # village.tmj
//   node scripts/merge-world-tileset.mjs     # tileset-village.png + retarget the map
//
// The map document carries one embedded tileset (WorldScene loads a single
// tileset image), so anything you want to paint with in Tiled has to live in
// that one sheet. Extra sheets are appended *below* the base, whole rows at a
// time, so every existing gid keeps its meaning and the map data is untouched.
//
// Output is a separate file from its inputs, so re-running is idempotent and
// safe after re-composing the base.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const T = 32;
const COLUMNS = 16; // the merged sheet keeps the base sheet's width
const MAPS = new URL('../public/game/maps/', import.meta.url);

const BASE = 'tileset-world.png';
const EXTRAS = ['tiles-summer.png']; // pasted in order, each starting on a fresh row
const OUT_IMAGE = 'tileset-village.png';
const MAP = 'village.tmj';

const path = (name) => fileURLToPath(new URL(name, MAPS));

const metaOf = async (name) => {
  const { width, height } = await sharp(path(name)).metadata();
  if (width % T || height % T) {
    throw new Error(`${name} is ${width}x${height}, not a whole number of ${T}px tiles`);
  }
  if (width > COLUMNS * T) {
    throw new Error(`${name} is ${width / T} tiles wide, wider than the ${COLUMNS}-column sheet`);
  }
  return { name, cols: width / T, rows: height / T };
};

const base = await metaOf(BASE);
const extras = [];
for (const name of EXTRAS) extras.push(await metaOf(name));

// Each sheet keeps its own layout (autotile blocks stay readable in Tiled);
// they just stack vertically. Trailing columns of a narrow sheet stay empty.
let row = base.rows;
const blocks = [];
for (const e of extras) {
  blocks.push({ ...e, top: row });
  row += e.rows;
}
const ROWS = row;

await sharp({
  create: {
    width: COLUMNS * T,
    height: ROWS * T,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: path(base.name), left: 0, top: 0 },
    ...blocks.map((b) => ({ input: path(b.name), left: 0, top: b.top * T })),
  ])
  .png()
  .toFile(path(OUT_IMAGE));

// Retarget the map's single embedded tileset. Its `name` — and so every gid in
// the layers — stays put; only the image and its size grow.
const map = JSON.parse(readFileSync(path(MAP), 'utf8'));
if (map.tilesets.length !== 1) {
  throw new Error(`${MAP} has ${map.tilesets.length} tilesets; expected exactly 1`);
}
const ts = map.tilesets[0];
ts.image = OUT_IMAGE;
ts.imagewidth = COLUMNS * T;
ts.imageheight = ROWS * T;
ts.columns = COLUMNS;
ts.tilecount = COLUMNS * ROWS;
writeFileSync(path(MAP), `${JSON.stringify(map, null, 2)}\n`);

console.log(`wrote ${OUT_IMAGE} (${COLUMNS * T}x${ROWS * T}, ${COLUMNS * ROWS} tiles)`);
for (const b of blocks) {
  const first = ts.firstgid + b.top * COLUMNS;
  console.log(`  ${b.name}: ${b.cols}x${b.rows} tiles at row ${b.top} (gid ${first}…)`);
}
console.log(`updated ${MAP} → ${OUT_IMAGE}`);
