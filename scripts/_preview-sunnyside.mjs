// Preview the converted room: tile layers plus the atlas props, in the same
// draw order the scene will use. Verification only.
//   node scripts/_preview-sunnyside.mjs out.png [scale]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const MAPS = new URL('../public/game/maps/', import.meta.url);
const [outPath, scaleArg] = process.argv.slice(2);
const scale = +(scaleArg || 2);

const map = JSON.parse(readFileSync(new URL('sunnyside-world.tmj', MAPS), 'utf8'));
const atlas = JSON.parse(readFileSync(new URL('props.json', MAPS), 'utf8'));
const T = map.tilewidth, W = map.width, H = map.height;
const ts = map.tilesets[0];

const sheet = await sharp(fileURLToPath(new URL(ts.image, MAPS)))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const propSheet = await sharp(fileURLToPath(new URL(atlas.meta.image, MAPS)))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const OW = W * T, OH = H * T;
const out = Buffer.alloc(OW * OH * 4);
for (let i = 0; i < out.length; i += 4) { out[i] = 20; out[i + 1] = 30; out[i + 2] = 50; out[i + 3] = 255; }

const FH = 0x80000000, FV = 0x40000000, FD = 0x20000000;

/** Alpha-blend one source pixel into the canvas. */
const put = (src, si, dx, dy) => {
  if (dx < 0 || dy < 0 || dx >= OW || dy >= OH) return;
  const a = src[si + 3];
  if (a === 0) return;
  const di = (dy * OW + dx) * 4;
  const af = a / 255, ia = 1 - af;
  out[di] = src[si] * af + out[di] * ia;
  out[di + 1] = src[si + 1] * af + out[di + 1] * ia;
  out[di + 2] = src[si + 2] * af + out[di + 2] * ia;
  out[di + 3] = 255;
};

const SW = sheet.info.width;
const blitTile = (gid, dx, dy) => {
  const fh = !!(gid & FH), fv = !!(gid & FV), fd = !!(gid & FD);
  const id = (gid & 0x1fffffff) - ts.firstgid;
  const sc = (id % ts.columns) * T, sr = ((id / ts.columns) | 0) * T;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      // Tiled: diagonal flip first, then horizontal, then vertical.
      let sx = x, sy = y;
      if (fv) sy = T - 1 - sy;
      if (fh) sx = T - 1 - sx;
      if (fd) { const t = sx; sx = sy; sy = t; }
      put(sheet.data, ((sr + sy) * SW + (sc + sx)) * 4, dx + x, dy + y);
    }
  }
};

const PW = propSheet.info.width;
const blitProp = (o) => {
  const p = Object.fromEntries(o.properties.map((q) => [q.name, q.value]));
  const f = atlas.frames[`${o.name}_0`];
  if (!f) return;
  const ox = f.frame.w * p.originX, oy = f.frame.h * p.originY;
  const x0 = Math.round(o.x - ox * p.scaleX), y0 = Math.round(o.y - oy * p.scaleY);
  for (let y = 0; y < f.frame.h; y++) {
    for (let x = 0; x < f.frame.w; x++) {
      const sx = p.scaleX < 0 ? f.frame.w - 1 - x : x;
      const sy = p.scaleY < 0 ? f.frame.h - 1 - y : y;
      put(propSheet.data, ((f.frame.y + sy) * PW + (f.frame.x + sx)) * 4, x0 + x, y0 + y);
    }
  }
};

const propsLayer = map.layers.find((l) => l.name === 'props');
const byLayer = new Map();
for (const o of propsLayer.objects) {
  const k = o.properties.find((q) => q.name === 'layer').value;
  if (!byLayer.has(k)) byLayer.set(k, []);
  byLayer.get(k).push(o);
}

// Draw order taken from the GameMaker room: asset layers interleave with tiles.
const ORDER = ['sea', 'clouds_02', 'land', 'paths', 'shadows', 'decoration_01',
  'Assets_2', 'forest', 'building', 'walls', 'decoration_02', 'decoration_03',
  'Assets_1', 'cloud_shadow', 'clouds_01'];

for (const name of ORDER) {
  const tl = map.layers.find((l) => l.name === name && l.type === 'tilelayer');
  if (tl) {
    for (let i = 0; i < tl.data.length; i++) {
      const gid = tl.data[i];
      if (gid) blitTile(gid, (i % W) * T, ((i / W) | 0) * T);
    }
  } else if (byLayer.has(name)) {
    for (const o of byLayer.get(name)) blitProp(o);
  }
}

await sharp(out, { raw: { width: OW, height: OH, channels: 4 } })
  .resize({ width: OW * scale, height: OH * scale, kernel: 'nearest' })
  .png().toFile(outPath);
console.log(`wrote ${outPath} (${OW * scale}x${OH * scale})`);
