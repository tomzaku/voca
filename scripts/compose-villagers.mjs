// Build the villager atlas from the Sunnyside pack's layered human character.
//
//   node scripts/compose-villagers.mjs
//
// The pack draws the human as stacked layers in a 96×64 frame — a bald `base`
// body plus one hair layer — animated as horizontal strips, one file per clip.
// Only two clips are needed here: a 9-frame idle and an 8-frame walk.
//
// Note the pack has a SINGLE front-facing view; there is no up/down/left/right
// art for any clip. The scene mirrors for left and reuses the front view for up
// and down, which is all the source art supports.
//
// Every frame is cropped to the same tight box, computed as the union of opaque
// pixels across all looks and clips, with the feet on the bottom edge — so a
// sprite drawn with origin (0.5, 1) stands exactly on its tile.

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const HUMAN = new URL(
  '../tiled/extracted/v2.1/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets/Characters/Human/',
  import.meta.url,
);
const OUT = new URL('../public/game/characters/', import.meta.url);

/** Hair layers, each composited over `base` to make one villager. */
export const LOOKS = ['base', 'bowlhair', 'curlyhair', 'longhair', 'mophair', 'shorthair', 'spikeyhair'];
const CLIPS = [
  { dir: 'IDLE', name: 'idle', frames: 9 },
  { dir: 'WALKING', name: 'walk', frames: 8 },
];

const SRC_FRAME = 96, SRC_H = 64;
// Union of opaque pixels across every look and clip, feet on the bottom edge.
const CROP = { left: 38, top: 19, width: 20, height: 20 };
const PAD = 1;

const file = (look, clip) => new URL(`${clip.dir}/${look}_${clip.name}_strip${clip.frames}.png`, HUMAN);

/** base + hair for one clip, as a raw RGBA strip. */
async function composeStrip(look, clip) {
  const base = await sharp(fileURLToPath(file('base', clip)))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (look === 'base') return base;
  const hair = await sharp(fileURLToPath(file(look, clip))).ensureAlpha().raw().toBuffer();
  const out = Buffer.from(base.data);
  for (let i = 0; i < out.length; i += 4) {
    const a = hair[i + 3];
    if (!a) continue;
    const af = a / 255, ia = 1 - af;
    out[i] = hair[i] * af + out[i] * ia;
    out[i + 1] = hair[i + 1] * af + out[i + 1] * ia;
    out[i + 2] = hair[i + 2] * af + out[i + 2] * ia;
    out[i + 3] = Math.max(out[i + 3], a);
  }
  return { data: out, info: base.info };
}

// Lay the atlas out as one row per look, one column per frame.
const perLook = CLIPS.reduce((a, c) => a + c.frames, 0);   // 17
const CELL_W = CROP.width + PAD, CELL_H = CROP.height + PAD;
const ATLAS_W = perLook * CELL_W;
const ATLAS_H = LOOKS.length * CELL_H;
const atlas = Buffer.alloc(ATLAS_W * ATLAS_H * 4);
const frames = {};

for (let li = 0; li < LOOKS.length; li++) {
  const look = LOOKS[li];
  let col = 0;
  for (const clip of CLIPS) {
    const { data, info } = await composeStrip(look, clip);
    if (info.width !== clip.frames * SRC_FRAME || info.height !== SRC_H) {
      throw new Error(`${look} ${clip.name}: unexpected strip ${info.width}x${info.height}`);
    }
    for (let f = 0; f < clip.frames; f++) {
      const dx = col * CELL_W, dy = li * CELL_H;
      for (let y = 0; y < CROP.height; y++) {
        for (let x = 0; x < CROP.width; x++) {
          const sx = f * SRC_FRAME + CROP.left + x, sy = CROP.top + y;
          const si = (sy * info.width + sx) * 4;
          const di = ((dy + y) * ATLAS_W + (dx + x)) * 4;
          atlas[di] = data[si]; atlas[di + 1] = data[si + 1];
          atlas[di + 2] = data[si + 2]; atlas[di + 3] = data[si + 3];
        }
      }
      frames[`${look}-${clip.name}-${f}`] = {
        frame: { x: dx, y: dy, w: CROP.width, h: CROP.height },
        rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: CROP.width, h: CROP.height },
        sourceSize: { w: CROP.width, h: CROP.height },
      };
      col++;
    }
  }
}

const png = 'villagers.png';
await sharp(atlas, { raw: { width: ATLAS_W, height: ATLAS_H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(new URL(png, OUT)));
writeFileSync(new URL('villagers.json', OUT), JSON.stringify({
  frames,
  meta: { image: png, size: { w: ATLAS_W, h: ATLAS_H }, scale: 1 },
}));

console.log(`wrote ${png} (${ATLAS_W}x${ATLAS_H}) — ${LOOKS.length} looks × ${perLook} frames = ${Object.keys(frames).length}`);
console.log(`looks: ${LOOKS.join(', ')}`);
