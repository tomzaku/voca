// Add the game contract to the converted room: a `walls` collision layer and a
// `meta` object layer (spawn + station slots + area label).
//
//   node scripts/author-sunnyside-meta.mjs [overlay.png]
//
// Run after convert-sunnyside-room.mjs. Rewrites public/game/maps/sunnyside-world.tmj
// in place, so it is idempotent: existing generated layers are dropped first.
//
// The GameMaker room carries none of this. Walkability is inferred from the
// terrain (see the colour test below) and station slots are placed at the door
// of each building, which is why the layout still reads as a village.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const MAPS = new URL('../public/game/maps/', import.meta.url);
const TMJ = new URL('sunnyside-world.tmj', MAPS);
const map = JSON.parse(readFileSync(TMJ, 'utf8'));
const atlas = JSON.parse(readFileSync(new URL('props.json', MAPS), 'utf8'));

const T = map.tilewidth, W = map.width, H = map.height;
const ts = map.tilesets[0];
const FH = 0x80000000, FV = 0x40000000, FD = 0x20000000;
const at = (x, y) => y * W + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// Drop anything a previous run added so this script can be re-run. The
// converter renames the room's decorative fence layer to `fences`, so a layer
// called `walls` here can only be one we generated.
map.layers = map.layers.filter((l) => l.name !== 'walls' && l.name !== 'meta');
const layer = (n) => map.layers.find((l) => l.name === n && l.type === 'tilelayer')?.data;

// ── Ground composite, for the walkability colour test ──
const sheet = await sharp(fileURLToPath(new URL(ts.image, MAPS)))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = sheet.info.width, OW = W * T;
const ground = Buffer.alloc(OW * H * T * 4);
for (const n of ['sea', 'land', 'paths']) {
  const d = layer(n);
  for (let i = 0; i < d.length; i++) {
    const gid = d[i];
    if (!gid) continue;
    const fh = !!(gid & FH), fv = !!(gid & FV), fd = !!(gid & FD);
    const id = (gid & 0x1fffffff) - ts.firstgid;
    const sc = (id % ts.columns) * T, sr = ((id / ts.columns) | 0) * T;
    const dx = (i % W) * T, dy = ((i / W) | 0) * T;
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        let sx = x, sy = y;
        if (fv) sy = T - 1 - sy;
        if (fh) sx = T - 1 - sx;
        if (fd) { const t = sx; sx = sy; sy = t; }
        const si = ((sr + sy) * SW + (sc + sx)) * 4;
        const a = sheet.data[si + 3];
        if (!a) continue;
        const di = ((dy + y) * OW + (dx + x)) * 4, af = a / 255, ia = 1 - af;
        ground[di] = sheet.data[si] * af + ground[di] * ia;
        ground[di + 1] = sheet.data[si + 1] * af + ground[di + 1] * ia;
        ground[di + 2] = sheet.data[si + 2] * af + ground[di + 2] * ia;
        ground[di + 3] = 255;
      }
    }
  }
}

/** Mean colour of a tile's middle, ignoring the noisy edges. */
function patch(tx, ty) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 5; y < 12; y++) {
    for (let x = 5; x < 12; x++) {
      const i = ((ty * T + y) * OW + (tx * T + x)) * 4;
      r += ground[i]; g += ground[i + 1]; b += ground[i + 2]; n++;
    }
  }
  return [r / n, g / n, b / n];
}

/** Grass, dirt path and sand are standable; water and cliff rock are not. */
function standable([r, g, b]) {
  if (b > r + 20) return false;             // water
  if (r + g + b < 210) return false;        // deep shade
  if (g > r && g > b) return true;          // grass
  return r > 165 && g > 115 && r - b > 45;  // dirt / sand / plank bridges
}

const blocked = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) if (!standable(patch(x, y))) blocked[at(x, y)] = 1;
}

// Buildings and fences are solid. The forest and decoration layers are not:
// their canopies overhang ground you can legitimately walk under, and treating
// them as solid cuts the island into unreachable pockets.
const building = layer('building');
for (const n of ['building', 'fences']) {
  const d = layer(n);
  for (let i = 0; i < d.length; i++) if (d[i]) blocked[i] = 1;
}

// ── Solid props ──
const SOFT = /shadow|glint|sparkle|bird|smoke|reflect|flower|grass|cloud/i;
const MOBILE = /^spr_(idle|doing|carry|swimming|attack|jump|roll|run|walk|dig|axe|mining|hurt|death|casting|caught|reeling|waiting|watering|hammering)/i;
const propSheet = await sharp(fileURLToPath(new URL(atlas.meta.image, MAPS)))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const PW = propSheet.info.width;
const opaque = new Map();
const opaqueOf = (key, f) => {
  if (opaque.has(key)) return opaque.get(key);
  const { w, h } = f.frame;
  const grid = new Uint8Array(w * h);
  let top = h, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (propSheet.data[((f.frame.y + y) * PW + (f.frame.x + x)) * 4 + 3] > 128) {
        grid[y * w + x] = 1;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  const v = { grid, w, h, top, bottom };
  opaque.set(key, v);
  return v;
};

const propsLayer = map.layers.find((l) => l.name === 'props');
for (const o of propsLayer.objects) {
  if (SOFT.test(o.name) || MOBILE.test(o.name)) continue;
  const p = Object.fromEntries(o.properties.map((q) => [q.name, q.value]));
  const f = atlas.frames[`${o.name}_0`];
  if (!f) continue;
  const op = opaqueOf(`${o.name}_0`, f);
  if (op.bottom < 0) continue;
  const bandTop = op.bottom - Math.max(1, Math.round((op.bottom - op.top + 1) * 0.35));
  const x0 = o.x - op.w * p.originX, y0 = o.y - op.h * p.originY;
  const cover = new Map();
  for (let y = bandTop; y <= op.bottom; y++) {
    for (let x = 0; x < op.w; x++) {
      if (!op.grid[y * op.w + x]) continue;
      const tx = Math.floor((x0 + x) / T), ty = Math.floor((y0 + y) / T);
      if (!inb(tx, ty)) continue;
      const k = at(tx, ty);
      cover.set(k, (cover.get(k) ?? 0) + 1);
    }
  }
  for (const [k, n] of cover) if (n >= T * T * 0.30) blocked[k] = 1;
}

// ── Keep only the largest connected walkable region ──
// Everything else is an offshore islet the buddy could never reach; sealing
// them off keeps tap-to-walk from routing into somewhere it cannot go.
const region = new Int32Array(W * H).fill(-1);
let best = -1, bestN = 0, regions = 0;
for (let s = 0; s < W * H; s++) {
  if (blocked[s] || region[s] !== -1) continue;
  const id = regions++;
  const q = [s]; region[s] = id; let n = 0;
  while (q.length) {
    const c = q.pop(); n++;
    const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inb(nx, ny)) continue;
      const ni = at(nx, ny);
      if (blocked[ni] || region[ni] !== -1) continue;
      region[ni] = id; q.push(ni);
    }
  }
  if (n > bestN) { bestN = n; best = id; }
}
for (let i = 0; i < W * H; i++) if (!blocked[i] && region[i] !== best) blocked[i] = 1;
const open = blocked.reduce((a, v) => a + (v ? 0 : 1), 0);
console.log(`walkable ${open}/${W * H} tiles (${(100 * open / (W * H)).toFixed(1)}%), ${regions} regions, kept the largest (${bestN})`);

// ── Station slots at building doors ──
// Flood the building layer into houses, then stand a slot on the first
// walkable tile below each house's bottom edge.
const seen = new Uint8Array(W * H);
const houses = [];
for (let s = 0; s < W * H; s++) {
  if (!building[s] || seen[s]) continue;
  const q = [s]; seen[s] = 1; const cells = [];
  while (q.length) {
    const c = q.pop(); cells.push(c);
    const cx = c % W, cy = (c / W) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (!inb(nx, ny)) continue;
        const ni = at(nx, ny);
        if (!building[ni] || seen[ni]) continue;
        seen[ni] = 1; q.push(ni);
      }
    }
  }
  if (cells.length >= 12) houses.push(cells);
}

const doors = [];
for (const cells of houses) {
  const xs = cells.map((c) => c % W), ys = cells.map((c) => (c / W) | 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cx = Math.round((minX + maxX) / 2), cy = Math.round((minY + maxY) / 2);
  // Prefer standing below the house — that's where its door faces — then fall
  // back to either side and finally above, so a house backed against a cliff
  // still gets a slot.
  const tries = [];
  for (let dy = 1; dy <= 4; dy++) tries.push([cx, maxY + dy]);
  for (let dx = 1; dx <= 3; dx++) tries.push([maxX + dx, cy], [minX - dx, cy]);
  for (let dy = 1; dy <= 3; dy++) tries.push([cx, minY - dy]);
  for (const [x, y] of tries) {
    if (!inb(x, y) || blocked[at(x, y)]) continue;
    doors.push({ x, y, area: cells.length });
    break;
  }
}
// Biggest houses first, so the most prominent buildings get the public slots.
doors.sort((a, b) => b.area - a.area);
console.log(`found ${houses.length} houses, ${doors.length} with a reachable door`);

const NEEDED = { public: 8, system: 7, feature: 6 };
const total = NEEDED.public + NEEDED.system + NEEDED.feature;
if (doors.length < total) {
  console.warn(`only ${doors.length} doors for ${total} slots — the rest will be spread over open ground`);
}

// Spread the three regions across the island rather than clustering them, by
// interleaving the door list west-to-east.
const byX = [...doors].sort((a, b) => a.x - b.x);
const objects = [];
let objId = 1;
const prop = (name, type, value) => ({ name, type, value });
const point = (type, x, y, properties = []) => ({
  id: objId++, name: '', type, x, y, width: 0, height: 0,
  point: true, rotation: 0, visible: true, properties,
});

const order = ['public', 'system', 'feature'];
const counts = { public: 0, system: 0, feature: 0 };
let placed = 0;
for (const d of byX) {
  if (placed >= total) break;
  // Round-robin so each region's slots are scattered along the island.
  let region = null;
  for (let k = 0; k < order.length; k++) {
    const cand = order[(placed + k) % order.length];
    if (counts[cand] < NEEDED[cand]) { region = cand; break; }
  }
  if (!region) break;
  objects.push(point('station', d.x * T + T / 2, d.y * T + T, [
    prop('region', 'string', region),
    prop('slot', 'int', counts[region]),
  ]));
  counts[region]++; placed++;
}
// Not every template slot gets a house — the island has fewer buildings than
// the game has collections. Fill the rest on open ground, keeping them well
// clear of each other and of the doors already taken.
if (placed < total) {
  const taken = objects.map((o) => ({ x: o.x / T, y: o.y / T }));
  const MIN_GAP = 6;
  const far = (x, y) => taken.every((p) => Math.hypot(p.x - x, p.y - y) >= MIN_GAP);
  const open = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (blocked[at(x, y)]) continue;
      // Want a bit of elbow room, not a one-tile ledge.
      let room = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!blocked[at(x + dx, y + dy)]) room++;
      if (room === 9) open.push({ x, y });
    }
  }
  // Sweep west to east so the fillers spread out like the door slots do.
  open.sort((a, b) => a.x - b.x || a.y - b.y);
  for (const o of open) {
    if (placed >= total) break;
    if (!far(o.x, o.y)) continue;
    let region = null;
    for (let k = 0; k < order.length; k++) {
      const cand = order[(placed + k) % order.length];
      if (counts[cand] < NEEDED[cand]) { region = cand; break; }
    }
    if (!region) break;
    objects.push(point('station', o.x * T + T / 2, o.y * T + T, [
      prop('region', 'string', region),
      prop('slot', 'int', counts[region]),
    ]));
    taken.push(o);
    counts[region]++; placed++;
  }
}
console.log(`placed ${placed} station slots`, counts);
if (placed < total) console.warn(`WARNING: ${total - placed} slots unplaced — collections will not all appear`);

// ── Spawn: the open tile nearest the middle of the island ──
let spawn = null, bestD = Infinity;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (blocked[at(x, y)]) continue;
    const d = (x - W / 2) ** 2 + (y - H / 2) ** 2;
    if (d < bestD) { bestD = d; spawn = { x, y }; }
  }
}
objects.unshift(point('spawn', spawn.x * T + T / 2, spawn.y * T + T / 2));

// One free-roam area: no doors, a single label naming the island.
objects.push(point('label', 3 * T, 2 * T, [
  prop('text', 'string', 'Sunnyside'),
  prop('theme', 'string', 'forest'),
]));

// ── Emit the collision layer ──
// WorldScene reads `walls` and treats any non-zero tile as solid. The room's
// own decorative fence layer was renamed `fences` by the converter, so the name
// is free for the real thing. Tile 1 is the sheet's blank tile: invisible, and
// the layer is hidden anyway.
const wallsData = Array.from(blocked, (v) => (v ? 1 : 0));
map.layers.push({
  id: map.nextlayerid++, name: 'walls', type: 'tilelayer',
  x: 0, y: 0, width: W, height: H, opacity: 1, visible: false, data: wallsData,
});
map.layers.push({
  id: map.nextlayerid++, name: 'meta', type: 'objectgroup',
  x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects,
});
map.nextobjectid = objId;

writeFileSync(TMJ, JSON.stringify(map));
console.log(`updated sunnyside-world.tmj — +walls (collision) +meta (${objects.length} objects)`);

// ── Optional overlay ──
const outPath = process.argv[2];
if (outPath) {
  const full = Buffer.from(ground);
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      if (!blocked[at(tx, ty)]) continue;
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const i = ((ty * T + y) * OW + (tx * T + x)) * 4;
          full[i] = full[i] * 0.5 + 128; full[i + 1] *= 0.5; full[i + 2] *= 0.5; full[i + 3] = 255;
        }
      }
    }
  }
  const mark = (x, y, c) => {
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const px = x + dx, py = y + dy;
        if (px < 0 || py < 0 || px >= OW || py >= H * T) continue;
        const i = (py * OW + px) * 4;
        full[i] = c[0]; full[i + 1] = c[1]; full[i + 2] = c[2]; full[i + 3] = 255;
      }
    }
  };
  const COLOR = { public: [60, 200, 255], system: [255, 220, 40], feature: [255, 90, 220] };
  for (const o of objects) {
    if (o.type === 'station') {
      const r = o.properties.find((p) => p.name === 'region').value;
      mark(o.x, o.y, COLOR[r]);
    } else if (o.type === 'spawn') mark(o.x, o.y, [255, 255, 255]);
  }
  await sharp(full, { raw: { width: OW, height: H * T, channels: 4 } })
    .resize({ width: OW * 2, height: H * T * 2, kernel: 'nearest' })
    .png().toFile(outPath);
  console.log(`wrote ${outPath}`);
}
