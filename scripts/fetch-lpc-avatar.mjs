#!/usr/bin/env node
// Downloads the curated LPC (Liberated Pixel Cup) character layers from the
// Universal LPC Spritesheet Character Generator repo and bakes them into
// compact per-layer sheets for the map avatar:
//
//   node scripts/fetch-lpc-avatar.mjs   →  public/game/avatar/*.png
//
// Source sheets are the LPC "universal" layout (832x1344, 64px frames, 13
// cols × 21 rows); we keep only the walk block (rows 8-11 = up/left/down/
// right, cols 0-8 = stand + 8-frame cycle) reordered to rows
// [down, up, left, right] → 576x256 per layer. Layers stack at runtime
// (body → shoes → pants → top → hair → hat), see src/lib/avatar.ts.
//
// Downloads are cached in .lpc-cache/ (gitignored). The script also extracts
// the authors of the used assets from the repo's CREDITS.csv into
// public/game/avatar/CREDITS.csv — LPC art is CC-BY-SA 3.0 / GPL 3.0 and
// requires that attribution to ship with the app.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const RAW = 'https://raw.githubusercontent.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator/master/';
const CACHE = fileURLToPath(new URL('../.lpc-cache/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/game/avatar/', import.meta.url));

const F = 64;
const WALK_ROWS = { down: 10, up: 8, left: 9, right: 11 }; // rows in the universal sheet
const OUT_ROWS = ['down', 'up', 'left', 'right'];
const COLS = 9; // col 0 = standing, 1-8 = walk cycle

// output name → path inside the repo's spritesheets/
const LAYERS = {};
const add = (name, path) => { LAYERS[name] = `spritesheets/${path}.png`; };

for (const g of ['male', 'female']) {
  for (const skin of ['light', 'olive', 'bronze', 'brown', 'black']) {
    add(`body-${g}-${skin}`, `body/bodies/${g}/${skin}`);
    add(`head-${g}-${skin}`, `head/heads/human/${g}/${skin}`);
  }
  for (const c of ['black', 'dark_brown', 'blonde', 'carrot', 'gray', 'blue']) {
    // one classic style per gender, in a handful of colors
    add(`hair-${g}-${c}`, g === 'male' ? `hair/cowlick/adult/${c}` : `hair/page/female/${c}`);
  }
  for (const c of ['white', 'blue', 'green', 'red']) {
    add(`top-${g}-${c}`, `torso/clothes/longsleeve/longsleeve/${g}/${c}`);
  }
  for (const c of ['black', 'blue', 'brown', 'forest']) {
    add(`pants-${g}-${c}`, `legs/pants/${g}/${c}`);
  }
  add(`shoes-${g}`, `feet/shoes/${g}/black`);
}
add('hat-bandana', 'hat/cloth/bandana/adult/bandana_red');
add('hat-feather', 'hat/cloth/feather_cap/adult/green');
add('hat-bowler', 'hat/formal/bowler/adult/black');
add('hat-crown', 'hat/formal/crown/adult/crown_gold');
add('hat-hood', 'hat/cloth/hood/adult/brown');

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

async function fetchCached(path) {
  const file = CACHE + path.replaceAll('/', '__');
  if (!existsSync(file)) {
    const res = await fetch(RAW + path);
    if (!res.ok) throw new Error(`${res.status} for ${path}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

let n = 0;
for (const [name, path] of Object.entries(LAYERS)) {
  const file = await fetchCached(path);
  const meta = await sharp(file).metadata();
  // The generator's sheets grew extra animation blocks below the classic 21
  // rows — the walk block position is unchanged, so only the width matters.
  if (meta.width !== 832 || meta.height < 12 * F) {
    throw new Error(`${path}: unexpected sheet size ${meta.width}x${meta.height}`);
  }
  const rows = await Promise.all(OUT_ROWS.map((dir) =>
    sharp(file)
      .extract({ left: 0, top: WALK_ROWS[dir] * F, width: COLS * F, height: F })
      .png()
      .toBuffer(),
  ));
  await sharp({
    create: { width: COLS * F, height: 4 * F, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(rows.map((input, i) => ({ input, left: 0, top: i * F })))
    .png()
    .toFile(`${OUT}${name}.png`);
  n++;
}

// ── Attribution ── keep the CREDITS rows of everything we ship.
const creditsCsv = readFileSync(await fetchCached('CREDITS.csv'), 'utf8');
const lines = creditsCsv.split('\n');
const used = Object.values(LAYERS).map((p) => p.replace('spritesheets/', ''));
const kept = lines.filter((line, i) =>
  i === 0 || used.some((p) => line.includes(p.replace(/\/[^/]+\.png$/, ''))));
writeFileSync(`${OUT}CREDITS.csv`, kept.join('\n'));

console.log(`baked ${n} layer sheets + CREDITS.csv (${kept.length - 1} credit rows) to public/game/avatar/`);
