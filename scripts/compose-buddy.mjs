#!/usr/bin/env node
// Composes `public/game/buddy/player.png` — the character that walks the world —
// from the epic rpg pack's 96×96 player sheets:
//
//   node scripts/compose-buddy.mjs
//
// The source draws the player small and centred inside 96×96 frames, which would
// leave the sprite floating above its feet in-game. So we crop every frame to the
// bounding box shared by all of them (stable, so the walk cycle doesn't jitter)
// and pack idle + walk into one horizontal strip:
//
//   frames  0–15  idle  — 4 per direction, in DIRS order
//   frames 16–31  walk  — 4 per direction, in DIRS order
//
// Row order in the source sheets is down, left, up, right (rows 1 and 3 are
// mirror images — verified against the art).
//
// Art: EPIC RPG World — basic tileset and assets, standard v3.0.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const SRC = new URL('../epic rpg/basic_tileset_and_assets_standard_v3.0/player/', import.meta.url);
const OUT = new URL('../public/game/buddy/', import.meta.url);

const FRAME = 96;   // source frame size
const COLS = 4;     // frames per direction
const ROWS = 4;     // directions: down, left, up, right
const SHEETS = ['player-idle-96x96.png', 'player-walk-96x96.png'];

/** Alpha box shared by every frame of both sheets. */
async function sharedBox() {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const file of SHEETS) {
    const { data, info } = await sharp(fileURLToPath(new URL(file, SRC)))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
        const lx = x % FRAME, ly = y % FRAME;
        if (lx < x0) x0 = lx;
        if (lx > x1) x1 = lx;
        if (ly < y0) y0 = ly;
        if (ly > y1) y1 = ly;
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const box = await sharedBox();

const parts = [];
let i = 0;
for (const file of SHEETS) {
  const path = fileURLToPath(new URL(file, SRC));
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      parts.push({
        input: await sharp(path)
          .extract({
            left: col * FRAME + box.left,
            top: row * FRAME + box.top,
            width: box.width,
            height: box.height,
          })
          .png().toBuffer(),
        left: i++ * box.width,
        top: 0,
      });
    }
  }
}

mkdirSync(fileURLToPath(OUT), { recursive: true });
await sharp({
  create: { width: box.width * parts.length, height: box.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(parts)
  .png()
  .toFile(fileURLToPath(new URL('player.png', OUT)));

console.log(`wrote player.png — ${parts.length} frames of ${box.width}x${box.height} (source box ${JSON.stringify(box)})`);
