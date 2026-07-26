// Fast .tmj -> PNG preview (single 16px sheet). Builds one RGBA buffer directly.
// Usage: node scripts/_preview-tmj.mjs map.tmj out.png [scale]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const [tmjPath, outPath, scaleArg] = process.argv.slice(2);
const scale = +(scaleArg || 3);
const map = JSON.parse(readFileSync(tmjPath, 'utf8'));
const T = map.tilewidth;
const ts = map.tilesets[0];
const COLS = ts.columns;
const W = map.width, H = map.height;
const sheetPath = path.resolve(path.dirname(tmjPath), ts.image);
const { data: sd, info: si } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = si.width;

const FH = 0x80000000, FV = 0x40000000;
// Destination at 1x tile res first; scale up once at the end.
const out = Buffer.alloc(W * T * H * T * 4);
const OW = W * T;
// background
for (let i = 0; i < out.length; i += 4) { out[i] = 20; out[i + 1] = 30; out[i + 2] = 50; out[i + 3] = 255; }

const blit = (gid, dx, dy) => {
  const fh = gid & FH, fv = gid & FV;
  const id = (gid & 0x1fffffff) - ts.firstgid;
  const sc = (id % COLS) * T, sr = ((id / COLS) | 0) * T;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const sx = sc + (fh ? T - 1 - x : x), sy = sr + (fv ? T - 1 - y : y);
    const si2 = (sy * SW + sx) * 4;
    const a = sd[si2 + 3];
    if (a === 0) continue;
    const di = ((dy + y) * OW + (dx + x)) * 4;
    if (a === 255) { out[di] = sd[si2]; out[di + 1] = sd[si2 + 1]; out[di + 2] = sd[si2 + 2]; out[di + 3] = 255; }
    else { // alpha blend
      const af = a / 255, ia = 1 - af;
      out[di] = sd[si2] * af + out[di] * ia;
      out[di + 1] = sd[si2 + 1] * af + out[di + 1] * ia;
      out[di + 2] = sd[si2 + 2] * af + out[di + 2] * ia;
      out[di + 3] = 255;
    }
  }
};

for (const layer of map.layers) {
  if (layer.type !== 'tilelayer' || layer.visible === false) continue;
  const d = layer.data;
  for (let i = 0; i < d.length; i++) {
    const gid = d[i];
    if (!gid) continue;
    blit(gid, (i % W) * T, ((i / W) | 0) * T);
  }
}

await sharp(out, { raw: { width: OW, height: H * T, channels: 4 } })
  .resize({ width: OW * scale, height: H * T * scale, kernel: 'nearest' })
  .png().toFile(outPath);
console.log(`wrote ${outPath} (${OW * scale}x${H * T * scale})`);
