// Convert the Sunnyside World asset pack's GameMaker example room (the scene
// pictured in Sunnyside_World_ExampleScene.png) into a Tiled .tmj the game can
// load, plus the single merged 16px tileset image it references.
//
//   unzip -o "tiled/Sunnyside_World_ASSET_PACK_V2.1 (1).zip" -d tiled/extracted/v2.1
//   node scripts/convert-sunnyside-room.mjs
//   node scripts/author-sunnyside-meta.mjs      # collision + spawn + station slots
//
// tiled/extracted is gitignored (47 MB), so the unzip step is needed on a fresh
// checkout. The room ships as tiled/extracted/.../rooms/Room1/Room1.yy — a GameMaker
// room with 13 tile layers over two tilesets:
//
//   tileset_sunnysideworld  16px, 64 cols, 4096 tiles  (byte-identical to the
//                                                       tileset already in the
//                                                       project)
//   tileset_forest          32px, 10 cols,  180 tiles  (the `forest` layer only)
//
// Tiled maps have one tile size, so the forest tiles are quartered into 16px
// tiles and appended below the sunnyside sheet. One tileset means every layer
// can stay on Phaser's TilemapGPULayer fast path.
//
// What this does NOT produce is the `meta` object layer (spawn / door / label /
// station slots) or a collision `walls` layer — the GameMaker room has no such
// data, and its own "walls" layer is decorative fence art. See
// generate-sunnyside-world.mjs for how the game's contract is authored.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const PACK = new URL(
  '../tiled/extracted/v2.1/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Gamemaker/',
  import.meta.url,
);
const MAPS = new URL('../public/game/maps/', import.meta.url);
const ROOM = new URL('rooms/Room1/Room1.yy', PACK);
const SHEET_SUNNY = new URL('sprites/spr_tileset_sunnysideworld/01c7190f-24e1-476f-bc93-8df9dc5c4275.png', PACK);
const SHEET_FOREST = new URL('sprites/spr_tileset_sunnysideworld_forest/83d9b4f8-2e52-468e-a8a8-46d14bb2adba.png', PACK);

const T = 16;            // output tile size
const COLS = 64;         // output sheet columns (matches the sunnyside sheet)
const SUNNY_TILES = 4096;

// ── GameMaker tile encoding ──
const GM_INDEX = 0x0007ffff;
const GM_FLIP = 0x10000000;   // flip vertically
const GM_MIRROR = 0x20000000; // mirror horizontally
const GM_ROTATE = 0x40000000; // rotate 90° clockwise
const GM_EMPTY = 0x80000000;

// ── Tiled gid flags ──
const TF_H = 0x80000000, TF_V = 0x40000000, TF_D = 0x20000000;

/**
 * GameMaker and Tiled both express the eight square orientations, but with
 * different primitives and different composition order. Rather than trust a
 * hand-derived table, build both groups as pixel permutations on a 4×4 grid and
 * match them up.
 */
function orientationTable() {
  const N = 4;
  const ident = [...Array(N * N).keys()];
  const transpose = (g) => g.map((_, i) => g[(i % N) * N + ((i / N) | 0)]);
  const mirrorH = (g) => g.map((_, i) => g[((i / N) | 0) * N + (N - 1 - (i % N))]);
  const flipV = (g) => g.map((_, i) => g[(N - 1 - ((i / N) | 0)) * N + (i % N)]);
  // GameMaker's rotate is 90° clockwise = transpose, then mirror horizontally.
  const rot90 = (g) => mirrorH(transpose(g));

  // Tiled: diagonal flip is applied first, then horizontal, then vertical.
  const tiled = new Map();
  for (let f = 0; f < 8; f++) {
    let g = ident;
    if (f & 1) g = transpose(g);
    if (f & 2) g = mirrorH(g);
    if (f & 4) g = flipV(g);
    let flags = 0;
    if (f & 1) flags |= TF_D;
    if (f & 2) flags |= TF_H;
    if (f & 4) flags |= TF_V;
    tiled.set(g.join(','), flags);
  }

  // GameMaker: mirror, then flip, then rotate.
  const table = new Map();
  for (let f = 0; f < 8; f++) {
    let g = ident;
    if (f & 1) g = mirrorH(g);
    if (f & 2) g = flipV(g);
    if (f & 4) g = rot90(g);
    const key = (f & 1 ? GM_MIRROR : 0) | (f & 2 ? GM_FLIP : 0) | (f & 4 ? GM_ROTATE : 0);
    const match = tiled.get(g.join(','));
    if (match === undefined) throw new Error(`no Tiled orientation matches GM combo ${f}`);
    table.set(key, match);
  }
  return table;
}

const ORIENT = orientationTable();

/** GameMaker RLE: a negative count means "repeat the next value |n| times". */
function decodeTiles(tiles) {
  if (tiles.TileSerialiseData) return tiles.TileSerialiseData;
  const src = tiles.TileCompressedData;
  const out = [];
  for (let i = 0; i < src.length;) {
    const n = src[i++];
    if (n < 0) { const v = src[i++]; for (let k = 0; k < -n; k++) out.push(v); }
    else { for (let k = 0; k < n; k++) out.push(src[i++]); }
  }
  return out;
}

/** GameMaker .yy is JSON with trailing commas. */
function readYY(url) {
  const raw = readFileSync(url, 'utf8').replace(/^﻿/, '');
  return JSON.parse(raw.replace(/,(\s*[}\]])/g, '$1'));
}

const room = readYY(ROOM);
const W = room.roomSettings.Width / T | 0;   // 1366/16 -> 85, room grid says 86
const tileLayers = room.layers.filter((l) => l.resourceType === 'GMRTileLayer');
const MAP_W = Math.max(...tileLayers.map((l) => (l.tiles.SerialiseWidth * (l.tilesetId.name === 'tileset_forest' ? 2 : 1))));
const MAP_H = Math.max(...tileLayers.map((l) => (l.tiles.SerialiseHeight * (l.tilesetId.name === 'tileset_forest' ? 2 : 1))));
console.log(`room ${room.roomSettings.Width}x${room.roomSettings.Height}px -> map ${MAP_W}x${MAP_H} tiles (unused W=${W})`);

// ── Build the merged tileset sheet ──
// The sunnyside sheet is kept byte-for-byte at the top so tile ids 0..4095 keep
// their meaning; the quartered forest tiles are appended in 64-wide rows.
const forestImg = sharp(fileURLToPath(SHEET_FOREST));
const fMeta = await forestImg.metadata();
const F_COLS = fMeta.width / 32;                 // 320/32 = 10
const F_TILES = (fMeta.width / 32) * (fMeta.height / 32);
const forestRaw = await forestImg.ensureAlpha().raw().toBuffer();
const sunnyMeta = await sharp(fileURLToPath(SHEET_SUNNY)).metadata();
const sunnyRaw = await sharp(fileURLToPath(SHEET_SUNNY)).ensureAlpha().raw().toBuffer();

const quarterCount = F_TILES * 4;                // 180 * 4 = 720 sixteen-px tiles
const extraRows = Math.ceil(quarterCount / COLS);
const OUT_W = COLS * T;                          // 1024
const OUT_H = sunnyMeta.height + extraRows * T;
const sheet = Buffer.alloc(OUT_W * OUT_H * 4);
sunnyRaw.copy(sheet, 0);

/** Copy one 16×16 block out of the forest sheet into output tile slot `dst`. */
const putQuarter = (fx, fy, dst) => {
  const dc = (dst % COLS) * T, dr = ((dst / COLS) | 0) * T;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const s = ((fy + y) * fMeta.width + (fx + x)) * 4;
      const d = ((dr + y) * OUT_W + (dc + x)) * 4;
      sheet[d] = forestRaw[s]; sheet[d + 1] = forestRaw[s + 1];
      sheet[d + 2] = forestRaw[s + 2]; sheet[d + 3] = forestRaw[s + 3];
    }
  }
};

// Forest tile f contributes four output tiles at SUNNY_TILES + f*4 + (0..3),
// ordered top-left, top-right, bottom-left, bottom-right.
for (let f = 0; f < F_TILES; f++) {
  const sx = (f % F_COLS) * 32, sy = ((f / F_COLS) | 0) * 32;
  putQuarter(sx, sy, SUNNY_TILES + f * 4 + 0);
  putQuarter(sx + T, sy, SUNNY_TILES + f * 4 + 1);
  putQuarter(sx, sy + T, SUNNY_TILES + f * 4 + 2);
  putQuarter(sx + T, sy + T, SUNNY_TILES + f * 4 + 3);
}

const sheetName = 'tileset-sunnyside-world.png';
await sharp(sheet, { raw: { width: OUT_W, height: OUT_H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(new URL(sheetName, MAPS)));
console.log(`wrote ${sheetName} (${OUT_W}x${OUT_H}, ${COLS * (OUT_H / T)} tiles)`);

// ── Convert the layers ──
const FIRSTGID = 1;
const toGid = (v) => {
  if (v & GM_EMPTY) return 0;
  const idx = v & GM_INDEX;
  const flags = ORIENT.get(v & (GM_FLIP | GM_MIRROR | GM_ROTATE)) ?? 0;
  return ((idx + FIRSTGID) | flags) >>> 0;
};

const layers = [];
let layerId = 1;
// GameMaker draws higher `depth` further back, so ascending draw order is
// descending depth.
const ordered = [...room.layers].sort((a, b) => b.depth - a.depth);

for (const l of ordered) {
  if (l.resourceType !== 'GMRTileLayer') continue;
  const isForest = l.tilesetId.name === 'tileset_forest';
  const sw = l.tiles.SerialiseWidth, sh = l.tiles.SerialiseHeight;
  const src = decodeTiles(l.tiles);
  const data = new Array(MAP_W * MAP_H).fill(0);

  if (!isForest) {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (x >= MAP_W || y >= MAP_H) continue;
        data[y * MAP_W + x] = toGid(src[y * sw + x] >>> 0);
      }
    }
  } else {
    // Each 32px forest cell becomes a 2×2 block of the quartered tiles.
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const v = src[y * sw + x] >>> 0;
        if (v & GM_EMPTY) continue;
        const f = v & GM_INDEX;
        const base = SUNNY_TILES + f * 4 + FIRSTGID;
        const dx = x * 2, dy = y * 2;
        if (dx + 1 >= MAP_W || dy + 1 >= MAP_H) continue;
        data[dy * MAP_W + dx] = base + 0;
        data[dy * MAP_W + dx + 1] = base + 1;
        data[(dy + 1) * MAP_W + dx] = base + 2;
        data[(dy + 1) * MAP_W + dx + 1] = base + 3;
      }
    }
  }

  layers.push({
    // The room's `walls` layer is decorative fence and railing art. The game's
    // map contract reserves that name for the collision grid, which
    // author-sunnyside-meta.mjs generates, so rename this one out of the way.
    id: layerId++, name: l.name === 'walls' ? 'fences' : l.name, type: 'tilelayer',
    x: 0, y: 0, width: MAP_W, height: MAP_H,
    opacity: 1, visible: true, data,
  });
}

// ── Props ──
// The room's two asset layers place 570 loose sprites (trees, animals, props,
// characters). They aren't tiles, so they're packed into a single atlas — 112
// sprites, 547 frames — and emitted as point objects carrying everything the
// scene needs to place and animate them.
const PROP_PAD = 1;

/** Every distinct sprite the room places, with its frames and GameMaker origin. */
const spriteDefs = new Map();
for (const l of ordered) {
  if (l.resourceType !== 'GMRAssetLayer') continue;
  for (const a of l.assets) {
    if (a.resourceType !== 'GMRSpriteGraphic' || spriteDefs.has(a.spriteId.name)) continue;
    const name = a.spriteId.name;
    const yy = readYY(new URL(`sprites/${name}/${name}.yy`, PACK));
    spriteDefs.set(name, {
      name,
      w: yy.width, h: yy.height,
      ox: yy.sequence?.xorigin ?? 0, oy: yy.sequence?.yorigin ?? 0,
      fps: yy.sequence?.playbackSpeed || 0,
      files: yy.frames.map((f) => new URL(`sprites/${name}/${f.name}.png`, PACK)),
    });
  }
}

// Shelf-pack the frames, tallest first, into the smallest square that fits.
const frames = [];
for (const s of spriteDefs.values()) {
  s.files.forEach((file, i) => frames.push({ key: `${s.name}_${i}`, w: s.w, h: s.h, file }));
}
frames.sort((a, b) => b.h - a.h || b.w - a.w);

let ATLAS = 256;
const packed = new Map();
for (;;) {
  packed.clear();
  let x = 0, y = 0, shelf = 0, ok = true;
  for (const f of frames) {
    if (x + f.w + PROP_PAD > ATLAS) { x = 0; y += shelf + PROP_PAD; shelf = 0; }
    if (y + f.h + PROP_PAD > ATLAS) { ok = false; break; }
    packed.set(f.key, { x, y, w: f.w, h: f.h, file: f.file });
    x += f.w + PROP_PAD;
    shelf = Math.max(shelf, f.h);
  }
  if (ok) break;
  ATLAS *= 2;
  if (ATLAS > 4096) throw new Error('props atlas exceeded 4096px');
}

const atlas = Buffer.alloc(ATLAS * ATLAS * 4);
for (const [, p] of packed) {
  const { data, info } = await sharp(fileURLToPath(p.file))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let yy = 0; yy < Math.min(info.height, p.h); yy++) {
    for (let xx = 0; xx < Math.min(info.width, p.w); xx++) {
      const s = (yy * info.width + xx) * 4;
      const d = ((p.y + yy) * ATLAS + (p.x + xx)) * 4;
      atlas[d] = data[s]; atlas[d + 1] = data[s + 1];
      atlas[d + 2] = data[s + 2]; atlas[d + 3] = data[s + 3];
    }
  }
}
const propsPng = 'props.png';
await sharp(atlas, { raw: { width: ATLAS, height: ATLAS, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(new URL(propsPng, MAPS)));

const atlasJson = { frames: {}, meta: { image: propsPng, size: { w: ATLAS, h: ATLAS }, scale: 1 } };
for (const [key, p] of packed) {
  atlasJson.frames[key] = {
    frame: { x: p.x, y: p.y, w: p.w, h: p.h },
    rotated: false, trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h },
    sourceSize: { w: p.w, h: p.h },
  };
}
writeFileSync(new URL('props.json', MAPS), JSON.stringify(atlasJson));
console.log(`wrote ${propsPng} + props.json (${ATLAS}x${ATLAS}, ${packed.size} frames, ${spriteDefs.size} sprites)`);

const props = [];
let objId = 1;
for (const l of ordered) {
  if (l.resourceType !== 'GMRAssetLayer') continue;
  for (const a of l.assets) {
    if (a.resourceType !== 'GMRSpriteGraphic') continue;
    const s = spriteDefs.get(a.spriteId.name);
    props.push({
      id: objId++, name: a.spriteId.name, type: 'prop',
      // GameMaker positions a sprite by its origin, so carry the origin through
      // and let the scene set it — x/y stay the room's own coordinates.
      x: a.x, y: a.y, width: 0, height: 0, point: true, visible: true, rotation: a.rotation || 0,
      properties: [
        { name: 'layer', type: 'string', value: l.name },
        { name: 'frames', type: 'int', value: s.files.length },
        { name: 'fps', type: 'float', value: s.fps },
        { name: 'originX', type: 'float', value: s.w ? s.ox / s.w : 0 },
        { name: 'originY', type: 'float', value: s.h ? s.oy / s.h : 0 },
        { name: 'scaleX', type: 'float', value: a.scaleX ?? 1 },
        { name: 'scaleY', type: 'float', value: a.scaleY ?? 1 },
      ],
    });
  }
}
layers.push({
  id: layerId++, name: 'props', type: 'objectgroup',
  x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects: props,
});

const map = {
  compressionlevel: -1,
  width: MAP_W, height: MAP_H, tilewidth: T, tileheight: T,
  infinite: false, orientation: 'orthogonal', renderorder: 'right-down',
  nextlayerid: layerId, nextobjectid: objId,
  tiledversion: '1.10.2', type: 'map', version: '1.10',
  tilesets: [{
    firstgid: FIRSTGID,
    name: 'sunnyside',
    image: sheetName,
    imagewidth: OUT_W, imageheight: OUT_H,
    tilewidth: T, tileheight: T,
    columns: COLS, tilecount: COLS * (OUT_H / T),
    margin: 0, spacing: 0,
  }],
  layers,
};

const outName = 'sunnyside-world.tmj';
writeFileSync(new URL(outName, MAPS), JSON.stringify(map));
const solid = layers.filter((l) => l.type === 'tilelayer')
  .map((l) => `${l.name}:${l.data.filter(Boolean).length}`).join(' ');
console.log(`wrote ${outName} — ${MAP_W}x${MAP_H}, ${layers.length - 1} tile layers, ${props.length} props`);
console.log(`  ${solid}`);
