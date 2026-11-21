import * as THREE from 'three';
import { BUG_SIZE, H, SHIP_H, SHIP_W, W, isBoss, type BugKind, type DropKind } from '../../lib/bugSwarm';
import { DROP_COLOR } from './bugSwarmArt';
import { spiritArt } from './stormSprites';

// Storm over Huế, in 3D: the game's own flat field (lib/bugSwarm's W×H) laid
// out over Huế on a stormy night and seen from a camera leaning back, so the
// field runs away from you and the city scrolls by far below — the Perfume
// River down the middle, the Citadel's walls and roofs on one bank, houses,
// Thiên Mụ's tower and Trường Tiền's arches on the other, lanterns floating
// on the water. Above the field's far edge sits the storm the spirits pour
// out of, lit from inside by lightning.
//
// This draws the things in the sky — the players' phoenix kites and the
// lanterns the spirits drop as 3D models; the storm spirits themselves as
// painted characters on billboards (stormSprites), which read far better
// than primitives at their size. Bullets, sparks and scores are drawn flat
// over it (bugSwarmArt), placed with `local` so they sit where the camera
// puts that point. The rules don't know any of this: a spirit is still a
// "bug" to them, and the field is still flat.
//
// Built from primitives at load — no models to fetch — and kept cheap for
// phones: the city is a handful of chunks recycled as they pass, each a few
// instanced meshes; materials are lit by one sky light and their own glow.

/** How a spirit is held this frame: turned (radians, 0 faces down the
 *  field), stretched, and lifted — so it banks into a swoop, bobs in the
 *  formation, and squashes when a shot lands. Drawing only. */
export interface BugPose { rot: number; sx: number; sy: number; dy: number }

export interface SceneFrame {
  t: number;
  dt: number;
  shake: number;
  bugs: { id: number; kind: BugKind; x: number; y: number; flash: number; pose: BugPose }[];
  drops: { id: number; kind: DropKind; x: number; y: number }[];
  /** The players' kites, by top-left like a ship. `slot` keeps each its own model. */
  kites: { slot: number; x: number; y: number; color: string; tilt: number; hidden: boolean; shield: number }[];
}

const CHUNK = 320;
const CHUNKS = 7;
/** How fast the city goes by underneath. */
const SPEED = 24;
/** The river's width on the ground. The city sits as far below the field as
 *  makes this, seen from the camera, exactly the field's width — so the
 *  river's banks are the edges of where you can fly (see `fit`). */
const RIVER = 360;
/** How far the camera leans back from straight down, and its lens. */
const TILT = (54 * Math.PI) / 180;
const FOV = 34;
const SKY = new THREE.Color('#141a33');

const rand = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

// ── Shared looks ───────────────────────────────────────────────────────────

function glowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A soft cloud puff, for the storm wall and the mist below the field. */
function cloudTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  const r = rand(7);
  for (let i = 0; i < 26; i++) {
    const x = 30 + r() * 68, y = 38 + r() * 52, rad = 14 + r() * 26;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Faint ripples of light on the river, scrolled to make it flow. */
function waterTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 128, 256);
  const r = rand(3);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(120,170,220,${0.25 + r() * 0.35})`;
    c.fillRect(r() * 128, r() * 256, 6 + r() * 26, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const lit = (color: string, o: { glow?: string; gi?: number; flat?: boolean; opacity?: number; metal?: number; rough?: number } = {}) =>
  new THREE.MeshStandardMaterial({
    color, emissive: o.glow ?? '#000000', emissiveIntensity: o.gi ?? 1, flatShading: o.flat ?? true,
    roughness: o.rough ?? 0.7, metalness: o.metal ?? 0,
    transparent: o.opacity !== undefined, opacity: o.opacity ?? 1,
  });

// ── The city below ─────────────────────────────────────────────────────────

/** Copies of one shape, placed and tinted — a row of roofs, a wood of trees. */
function many(geo: THREE.BufferGeometry, mat: THREE.Material, items: { x: number; y: number; z: number; s?: [number, number, number]; ry?: number; color?: string }[]) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  const o = new THREE.Object3D();
  items.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z);
    o.rotation.set(0, it.ry ?? 0, 0);
    o.scale.set(...(it.s ?? [1, 1, 1]));
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (it.color) m.setColorAt(i, new THREE.Color(it.color));
  });
  m.count = items.length;
  return m;
}

interface Kit {
  box: THREE.BoxGeometry; roof: THREE.ConeGeometry; tree: THREE.IcosahedronGeometry; ball: THREE.SphereGeometry;
  land: THREE.Material; water: THREE.MeshStandardMaterial; stone: THREE.Material; brick: THREE.Material; wood: THREE.Material;
  roofGold: THREE.Material; roofDark: THREE.Material; leaf: THREE.Material; wall: THREE.Material; lamp: THREE.Material;
  glow: THREE.Texture;
}

/** A box (or any shape), placed and sized. */
function block(geo: THREE.BufferGeometry, m: THREE.Material, at: [number, number, number], size: [number, number, number]) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(...at);
  o.scale.set(...size);
  return o;
}

/** One stretch of Huế, CHUNK long, running from z=0 back to z=-CHUNK. `kind`
 *  picks its landmark: the Citadel's gate, Thiên Mụ, Trường Tiền, the flag tower. */
function chunk(k: Kit, kind: number, seed: number) {
  const g = new THREE.Group();
  const r = rand(seed);
  const land = new THREE.Mesh(new THREE.PlaneGeometry(3200, CHUNK), k.land);
  land.rotation.x = -Math.PI / 2; land.position.z = -CHUNK / 2;
  g.add(land);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER, CHUNK), k.water);
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.6, -CHUNK / 2);
  g.add(water);
  // Stone embankments, both banks.
  for (const s of [-1, 1]) g.add(block(k.box, k.stone, [s * (RIVER / 2 + 3), 2, -CHUNK / 2], [6, 4, CHUNK]));

  // North bank: the Citadel — a moat, the wall with its crenels, and inside,
  // red halls under yellow-glazed roofs among the trees.
  const wallX = RIVER / 2 + 70;
  const moat = new THREE.Mesh(new THREE.PlaneGeometry(16, CHUNK), k.water);
  moat.rotation.x = -Math.PI / 2; moat.position.set(wallX - 20, 0.5, -CHUNK / 2);
  g.add(moat);
  g.add(block(k.box, k.brick, [wallX, 9, -CHUNK / 2], [14, 18, CHUNK]));
  const crenels = [];
  for (let z = -4; z > -CHUNK; z -= 9) crenels.push({ x: wallX - 5, y: 20, z, s: [3, 4, 5] as [number, number, number] });
  g.add(many(k.box, k.brick, crenels));
  const halls: Parameters<typeof many>[2] = [], hallRoofs: Parameters<typeof many>[2] = [];
  for (let i = 0; i < 9; i++) {
    const x = wallX + 40 + r() * 260, z = -20 - r() * (CHUNK - 40), w = 20 + r() * 22, d = 14 + r() * 12;
    halls.push({ x, y: 6, z, s: [w, 12, d], color: r() < 0.5 ? '#8a2a1e' : '#7a2418' });
    hallRoofs.push({ x, y: 18, z, s: [w * 0.8, 10, d * 0.85], ry: Math.PI / 4 });
  }
  g.add(many(k.box, k.wall, halls));
  g.add(many(k.roof, k.roofGold, hallRoofs));

  // South bank: houses with dark tiled roofs, and street lamps.
  const houses: Parameters<typeof many>[2] = [], houseRoofs: Parameters<typeof many>[2] = [], lamps: Parameters<typeof many>[2] = [];
  for (let i = 0; i < 22; i++) {
    const x = -(RIVER / 2 + 30 + r() * 320), z = -r() * CHUNK, w = 9 + r() * 10, d = 8 + r() * 8;
    houses.push({ x, y: 4, z, s: [w, 8, d], color: ['#d9cfb4', '#e6d39a', '#c9b48e'][i % 3] });
    houseRoofs.push({ x, y: 11, z, s: [w * 0.82, 6, d * 0.85], ry: Math.PI / 4 });
  }
  for (let z = -10; z > -CHUNK; z -= 26) for (const s of [-1, 1]) lamps.push({ x: s * (RIVER / 2 + 10), y: 6, z, s: [1.4, 1.4, 1.4] });
  g.add(many(k.box, k.wall, houses));
  g.add(many(k.roof, k.roofDark, houseRoofs));
  g.add(many(k.ball, k.lamp, lamps));

  // Trees, on both banks.
  const trees: Parameters<typeof many>[2] = [];
  for (let i = 0; i < 46; i++) {
    const s = r() < 0.5 ? -1 : 1;
    const x = s * (RIVER / 2 + 16 + r() * 340), z = -r() * CHUNK, size = 5 + r() * 6;
    if (s > 0 && Math.abs(x - wallX) < 14) continue;
    trees.push({ x, y: size * 0.8, z, s: [size, size * 1.1, size], color: ['#1f4a2c', '#24563a', '#1a3f2a'][i % 3] });
  }
  g.add(many(k.tree, k.leaf, trees));

  // Lantern boats and floating lanterns (hoa đăng) on the river.
  const lights: number[] = [];
  for (let i = 0; i < 34; i++) lights.push((r() - 0.5) * (RIVER - 20), 1.5, -r() * CHUNK);
  const boats: Parameters<typeof many>[2] = [];
  for (let i = 0; i < 3; i++) {
    const x = (r() - 0.5) * (RIVER - 60), z = -20 - r() * (CHUNK - 40);
    boats.push({ x, y: 1.5, z, s: [6, 3, 22], ry: (r() - 0.5) * 0.4 });
    lights.push(x, 8, z + 4);
  }
  g.add(many(k.box, k.wood, boats));
  const pts = new THREE.BufferGeometry();
  pts.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
  g.add(new THREE.Points(pts, new THREE.PointsMaterial({ color: '#ffb347', size: 9, map: k.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  // The landmark.
  if (kind === 0) g.add(gate(k, wallX, -CHUNK * 0.5));
  if (kind === 2) g.add(pagoda(k, -(RIVER / 2 + 46), -CHUNK * 0.45));
  if (kind === 4) g.add(bridge(k, -CHUNK * 0.5));
  if (kind === 5) g.add(flagTower(k, wallX + 2, -CHUNK * 0.55));
  return g;
}

/** Ngọ Môn, the Citadel's great gate: a stone base, two tiers of golden roof. */
function gate(k: Kit, x: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(block(k.box, k.brick, [0, 12, 0], [34, 24, 90]));
  for (const [y, w, d, h] of [[30, 26, 70, 9], [44, 20, 50, 8]] as const) {
    const hall = new THREE.Mesh(k.box, k.wall); hall.scale.set(w * 0.8, h, d * 0.8); hall.position.y = y; g.add(hall);
    const roof = new THREE.Mesh(k.roof, k.roofGold); roof.scale.set(w, 9, d); roof.rotation.y = Math.PI / 4; roof.position.y = y + h / 2 + 4; g.add(roof);
  }
  return g;
}

/** Thiên Mụ's tower: seven octagonal storeys, each a little narrower. */
function pagoda(k: Kit, x: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = lit('#d9b48a', { glow: '#3a2210', gi: 0.4 });
  let y = 0;
  for (let i = 0; i < 7; i++) {
    const rad = 11 - i * 1.15, h = 8 - i * 0.35;
    const storey = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 8), body);
    storey.position.y = y + h / 2; g.add(storey);
    const eave = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.85, rad + 3.5, 2.4, 8), k.roofDark);
    eave.position.y = y + h + 1.2; g.add(eave);
    y += h + 2.4;
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 8), k.roofGold);
  tip.position.y = y + 4.5; g.add(tip);
  // A lamp in its windows: it glows on a stormy night.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: k.glow, color: '#ffcf7a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
  glow.scale.set(60, 60, 1); glow.position.y = y * 0.55; g.add(glow);
  return g;
}

/** Trường Tiền: six low arches across the river, lit along their curves. */
function bridge(k: Kit, z: number) {
  const g = new THREE.Group();
  g.position.z = z;
  const span = (RIVER + 20) / 6, mat = lit('#cfd6e6', { metal: 0.6, rough: 0.35, glow: '#40486a', gi: 0.5 });
  const arch = new THREE.TorusGeometry(span / 2, 1.1, 5, 18, Math.PI);
  const lights: number[] = [];
  for (let i = 0; i < 6; i++) {
    const cx = -(RIVER + 20) / 2 + span * (i + 0.5);
    for (const dz of [-6, 6]) {
      const a = new THREE.Mesh(arch, mat);
      a.position.set(cx, 8, dz); a.scale.y = 0.5; g.add(a);
    }
    for (let j = 0; j <= 8; j++) {
      const ang = (j / 8) * Math.PI;
      lights.push(cx + Math.cos(ang) * span / 2, 8 + Math.sin(ang) * span / 4, 6.5);
    }
  }
  const deck = new THREE.Mesh(k.box, mat); deck.scale.set(RIVER + 30, 2, 14); deck.position.y = 8; g.add(deck);
  const pts = new THREE.BufferGeometry();
  pts.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
  g.add(new THREE.Points(pts, new THREE.PointsMaterial({ color: '#9fd8ff', size: 6, map: k.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  return g;
}

/** Kỳ Đài, the flag tower: three stepped terraces and a tall pole, flag flying. */
function flagTower(k: Kit, x: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(k.box, k.brick); s.scale.set(40 - i * 10, 8, 40 - i * 10); s.position.y = 4 + i * 8; g.add(s);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 60, 6), k.stone); pole.position.y = 54; g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(18, 11), lit('#d8222a', { glow: '#6a0a0a', gi: 0.6 }));
  (flag.material as THREE.Material).side = THREE.DoubleSide;
  flag.position.set(9, 78, 0); flag.name = 'flag'; g.add(flag);
  return g;
}

// ── Things with bodies ─────────────────────────────────────────────────────

/** A kite or lantern: its model, and what it does on its own each frame. */
interface Body {
  root: THREE.Group;
  /** What turns and leans (the root carries the position). */
  pivot: THREE.Group;
  tick?: (t: number) => void;
}

/** `keep` is where each material is handed in — one place to hook them all. */
function body(add: (pivot: THREE.Group, keep: (m: THREE.MeshStandardMaterial) => THREE.MeshStandardMaterial) => ((t: number) => void) | void): Body {
  const root = new THREE.Group(), pivot = new THREE.Group();
  root.add(pivot);
  const tick = add(pivot, (m) => m) ?? undefined;
  return { root, pivot, tick };
}

const mesh = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  return o;
};

function halo(tex: THREE.Texture, color: string, size: number, opacity = 0.55) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1);
  return s;
}

/** The glow round each spirit, in its own colour: so it stands off the river. */
const AURA: Record<BugKind, string> = {
  beetle: '#b48aff', moth: '#7dffe0', wasp: '#ffb800', firefly: '#8dff5a', shell: '#8fd8ff', golden: '#ffd23f',
  splitter: '#4cc4ff', mite: '#4cc4ff', queen: '#a040ff', mantis: '#40ff90', spider: '#ff2a5a', hornet: '#ff9020',
};

/** A spirit: its painting (stormSprites) on a billboard, a white copy over
 *  it for the flash of a hit, and its glow behind. */
interface Spirit { root: THREE.Group; art: THREE.Sprite; white: THREE.Sprite; aura: THREE.Sprite; key: string; size: number }

function spiritSprite(kind: BugKind, tex: THREE.Texture): Spirit {
  const root = new THREE.Group();
  const { w, h } = BUG_SIZE[kind];
  const size = Math.max(w, h) * (isBoss(kind) ? 1.6 : 2.1);
  const aura = halo(tex, AURA[kind], size * 1.5, isBoss(kind) ? 0.4 : 0.45);
  const art = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  const white = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
  for (const sp of [art, white]) sp.scale.set(size, size, 1);
  aura.renderOrder = 1; art.renderOrder = 2; white.renderOrder = 3;
  root.add(aura, art, white);
  return { root, art, white, aura, key: '', size };
}

/** A player's phoenix kite: a bamboo-framed diamond with swept wings in the
 *  player's colour, edged in gold, and three ribbon tails streaming behind. */
function kite(color: string, tex: THREE.Texture) {
  const ribbons: THREE.BufferAttribute[] = [];
  const b = body((p, keep) => {
    const main = keep(lit(color, { glow: color, gi: 0.45 })); main.side = THREE.DoubleSide;
    const gold = keep(lit('#ffd23f', { glow: '#c88a00', gi: 0.6, metal: 0.4 })); gold.side = THREE.DoubleSide;
    const flat = (pts: [number, number][], m: THREE.Material, y: number) => {
      const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const q of pts.slice(1)) s.lineTo(...q); s.closePath();
      const o = mesh(new THREE.ShapeGeometry(s), m, 0, y, 0); o.rotation.x = -Math.PI / 2; p.add(o); return o;
    };
    // Shapes are drawn in x/y with y forward (up the field), then laid flat.
    for (const sd of [-1, 1]) {
      flat([[sd * 2, 3], [sd * 15, 7], [sd * 12, 3], [sd * 15, 0], [sd * 11, -1], [sd * 13, -4], [sd * 3, -3]], gold, -0.2);
      flat([[sd * 2, 2.5], [sd * 13, 5.6], [sd * 10.5, 2.2], [sd * 12.6, -0.2], [sd * 9.5, -1], [sd * 10.6, -3], [sd * 3, -2.5]], main, 0);
    }
    flat([[0, 11], [3.6, 2], [0, -8], [-3.6, 2]], main, 0.3);
    flat([[0, 13.5], [1.6, 9], [0, 7.5], [-1.6, 9]], gold, 0.5);
    const stick = keep(lit('#5a3a1a'));
    const bar = mesh(new THREE.BoxGeometry(0.5, 0.5, 19), stick, 0, 0.6, -1.5); p.add(bar);
    const cross = mesh(new THREE.BoxGeometry(24, 0.5, 0.5), stick, 0, 0.6, -2.5); p.add(cross);
    // Ribbons: strips whose points are swung each frame.
    for (const [x, c] of [[-1.6, color], [0, '#ffd23f'], [1.6, '#ff4d6d']] as const) {
      const geo = new THREE.PlaneGeometry(1.4, 20, 1, 10);
      geo.rotateX(-Math.PI / 2);
      geo.translate(x, -0.3, 18);
      const m = keep(lit(c, { glow: c, gi: 0.6 })); m.side = THREE.DoubleSide;
      p.add(mesh(geo, m));
      ribbons.push(geo.getAttribute('position') as THREE.BufferAttribute);
    }
    p.add(halo(tex, color, 46, 0.4));
  });
  const rest = ribbons.map((a) => Float32Array.from(a.array as Float32Array));
  b.tick = (t) => ribbons.forEach((a, i) => {
    const r = rest[i];
    for (let v = 0; v < a.count; v++) {
      const z = r[v * 3 + 2], along = Math.max(0, z - 8);
      a.setX(v, r[v * 3] + Math.sin(t * 9 - along * 0.35 + i) * along * 0.18);
      a.setY(v, r[v * 3 + 1] + Math.cos(t * 7 - along * 0.3 + i) * along * 0.08);
    }
    a.needsUpdate = true;
  });
  return b;
}

/** A paper lantern in the capsule's colour — what a spirit leaves behind. */
function lantern(kind: DropKind, tex: THREE.Texture) {
  return body((p, keep) => {
    const col = DROP_COLOR[kind];
    const paper = keep(lit(col, { glow: col, gi: 0.9, flat: false, opacity: 0.95 }));
    const ball = mesh(new THREE.SphereGeometry(1, 14, 10), paper); ball.scale.set(5.4, 6.2, 5.4); p.add(ball);
    const cap = keep(lit('#3a2410', { glow: '#c88a00', gi: 0.3 }));
    const cg = new THREE.CylinderGeometry(2.6, 3, 1.6, 10);
    p.add(mesh(cg, cap, 0, 6.2, 0), mesh(cg, cap, 0, -6.2, 0));
    const tassel = mesh(new THREE.CylinderGeometry(0.4, 0.9, 5, 6), keep(lit('#ff4d6d', { glow: '#a01030', gi: 0.5 })), 0, -10, 0);
    p.add(tassel);
    p.add(halo(tex, col, 34, 0.6));
  });
}

// ── The scene ──────────────────────────────────────────────────────────────

const v3 = new THREE.Vector3();

/** Lets go of a thing's geometry and materials, for good. */
function free(o: THREE.Object3D) {
  o.traverse((x) => {
    const m = x as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((y) => y.dispose()); else mat?.dispose();
  });
}

export class StormScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 1, 4000);
  /** Where the camera sits and looks before any shake. */
  private eye = new THREE.Vector3();
  private aim = new THREE.Vector3();
  private cw = 1;
  private ch = 1;
  private city = new THREE.Group();
  private chunks: THREE.Group[] = [];
  private flags: THREE.Object3D[] = [];
  private water: THREE.MeshStandardMaterial;
  private rain: THREE.LineSegments;
  private rainPos: Float32Array;
  private mist: THREE.Sprite[] = [];
  private stormWall: THREE.Sprite[] = [];
  private bolt: THREE.Line;
  private sky: THREE.HemisphereLight;
  private flash: THREE.DirectionalLight;
  private strikeT = 0;
  private strikePower = 0;
  private nextStrike = 3;
  private tex: THREE.Texture;
  private bugs = new Map<number, { kind: BugKind; s: Spirit }>();
  private spare = new Map<BugKind, Spirit[]>();
  /** The spirits' paintings, as textures, by kind and frame. */
  private arts = new Map<string, THREE.Texture>();
  private drops = new Map<number, { kind: DropKind; b: Body }>();
  private kites = new Map<number, { color: string; b: Body; shield: THREE.Mesh }>();
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  /** The field's corners on screen last fit: for the HUD to sit across its top. */
  topWidth = W;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = SKY;
    this.scene.fog = new THREE.Fog(SKY, 500, 1600);
    this.tex = glowTexture();

    this.sky = new THREE.HemisphereLight('#8a9cff', '#2a1a3a', 1.6);
    this.scene.add(this.sky);
    const moon = new THREE.DirectionalLight('#c8d4ff', 1.3);
    moon.position.set(-0.5, 1, 0.6);
    this.scene.add(moon);
    this.flash = new THREE.DirectionalLight('#e8f0ff', 0);
    this.flash.position.set(0.3, 1, -0.5);
    this.scene.add(this.flash);

    const water = waterTexture();
    water.repeat.set(1, 2);
    this.water = new THREE.MeshStandardMaterial({ color: '#16405a', emissive: '#06182a', roughness: 0.25, metalness: 0.3, map: water });
    const kit: Kit = {
      box: new THREE.BoxGeometry(1, 1, 1),
      roof: (() => { const g = new THREE.ConeGeometry(0.75, 1, 4); return g; })(),
      tree: new THREE.IcosahedronGeometry(1, 0),
      ball: new THREE.SphereGeometry(1, 6, 4),
      land: new THREE.MeshLambertMaterial({ color: '#1d2b22' }),
      water: this.water,
      stone: new THREE.MeshLambertMaterial({ color: '#7d7f8a' }),
      brick: new THREE.MeshLambertMaterial({ color: '#6e4e40' }),
      wood: new THREE.MeshLambertMaterial({ color: '#8a5a30', emissive: '#2a1408' }),
      roofGold: new THREE.MeshStandardMaterial({ color: '#e0a800', emissive: '#4a3000', roughness: 0.4, metalness: 0.4, flatShading: true }),
      roofDark: new THREE.MeshLambertMaterial({ color: '#3a3040', flatShading: true }),
      leaf: new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }),
      wall: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
      lamp: new THREE.MeshBasicMaterial({ color: '#ffd28a' }),
      glow: this.tex,
    };
    this.scene.add(this.city);
    const order = [1, 0, 3, 2, 1, 4, 5];
    for (let i = 0; i < CHUNKS; i++) {
      const c = chunk(kit, order[i % order.length], 1000 + i * 77);
      c.position.z = 700 - i * CHUNK;
      c.traverse((o) => { if (o.name === 'flag') this.flags.push(o); });
      this.city.add(c);
      this.chunks.push(c);
    }

    // Mist scudding between the field and the city: the parallax that says "high up".
    const cloud = cloudTexture();
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, color: '#8a90c0', transparent: true, opacity: 0.22, depthWrite: false, fog: true }));
      const size = 160 + (i % 4) * 50;
      s.scale.set(size, size * 0.6, 1);
      s.position.set(((i * 137) % 900) - 450, -60 - (i % 3) * 25, 600 - i * 130);
      this.scene.add(s);
      this.mist.push(s);
    }
    // The storm itself, banked up past the field's far edge.
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, color: '#2a2850', transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
      const size = 220 + (i % 3) * 70;
      s.scale.set(size, size * 0.55, 1);
      s.position.set((i - 6.5) * 75, 30 + (i % 2) * 30, -H / 2 - 120 - (i % 3) * 40);
      this.scene.add(s);
      this.stormWall.push(s);
    }

    // Rain: streaks falling past the camera.
    const N = 700;
    this.rainPos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) this.dropAt(i, Math.random() * 400 - 200);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#a8c8ff', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);

    this.bolt = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f0f6ff', transparent: true, opacity: 0, fog: false }));
    this.scene.add(this.bolt);
  }

  /** (Re)places rain streak i at a random spot in the column, at height y. */
  private dropAt(i: number, y: number) {
    const x = Math.random() * 900 - 450, z = Math.random() * 900 - 500;
    const p = this.rainPos;
    p.set([x, y, z, x - 1.2, y + 12, z - 3], i * 6);
  }

  resize(cw: number, ch: number, dpr: number) {
    if (cw === this.cw && ch === this.ch && this.renderer.getPixelRatio() === Math.min(dpr, 1.75)) return;
    this.cw = cw; this.ch = ch;
    this.renderer.setPixelRatio(Math.min(dpr, 1.75));
    this.renderer.setSize(cw, ch, false);
    this.fit();
  }

  /** Back the camera off until the whole field shows, then centre it. */
  private fit() {
    const cam = this.camera;
    cam.aspect = this.cw / this.ch;
    cam.updateProjectionMatrix();
    const dir = new THREE.Vector3(0, -Math.sin(TILT), -Math.cos(TILT));
    const mx = 1 - 24 / this.cw, my = 1 - 16 / this.ch;
    const corners = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => new THREE.Vector3(x - W / 2, 0, y - H / 2));
    const place = (dist: number) => {
      this.eye.copy(this.aim).addScaledVector(dir, -dist);
      cam.position.copy(this.eye);
      cam.lookAt(this.aim);
      cam.updateMatrixWorld();
    };
    const ndc = () => corners.map((c) => v3.copy(c).project(cam).clone());
    let dist = 700;
    for (let pass = 0; pass < 4; pass++) {
      let lo = 50, hi = 5000;
      for (let i = 0; i < 32; i++) {
        const mid = (lo + hi) / 2;
        place(mid);
        if (ndc().every((p) => Math.abs(p.x) <= mx && Math.abs(p.y) <= my)) hi = mid; else lo = mid;
      }
      dist = hi;
      place(dist);
      const n = ndc();
      const top = Math.max(n[0].y, n[1].y), bottom = Math.min(n[2].y, n[3].y);
      this.aim.z -= ((top + bottom) / 2) * (H / Math.max(0.01, top - bottom));
    }
    place(dist);
    // A sight line from the camera (straight above the river's middle)
    // through the field's edge reaches the ground (RIVER/W) times as far
    // from the middle when the ground is this deep: the banks line up with
    // the field's edges all the way up the screen.
    this.city.position.y = -this.eye.y * (RIVER / W - 1);
    // The mist drifts between the field and the city, wherever that now is.
    this.mist.forEach((m, i) => { m.position.y = this.city.position.y * (0.35 + (i % 3) * 0.15); });
    const fog = this.scene.fog as THREE.Fog;
    fog.near = dist + 150;
    fog.far = dist + 1500;
    const a = this.toScreen(0, 0), b = this.toScreen(W, 0);
    this.topWidth = b.x - a.x;
  }

  /** A game point on screen, in CSS pixels. */
  toScreen(x: number, y: number) {
    v3.set(x - W / 2, 0, y - H / 2).project(this.camera);
    return { x: (v3.x + 1) / 2 * this.cw, y: (1 - v3.y) / 2 * this.ch };
  }

  /** The flat transform (a, b, c, d, e, f, in CSS pixels) that best draws
   *  game coordinates around (x, y) — the camera's view, made flat there. */
  local(x: number, y: number): [number, number, number, number, number, number] {
    const p = this.toScreen(x, y), px = this.toScreen(x + 1, y), py = this.toScreen(x, y + 1);
    const a = px.x - p.x, b = px.y - p.y, c = py.x - p.x, d = py.y - p.y;
    return [a, b, c, d, p.x - a * x - c * y, p.y - b * x - d * y];
  }

  /** Where on the field a point on screen (CSS pixels) is. */
  toGame(px: number, py: number) {
    this.ray.setFromCamera(new THREE.Vector2((px / this.cw) * 2 - 1, 1 - (py / this.ch) * 2), this.camera);
    const hit = this.ray.ray.intersectPlane(this.plane, v3);
    return hit ? { x: hit.x + W / 2, y: hit.z + H / 2 } : { x: W / 2, y: H / 2 };
  }

  /** Lightning, now: a boss falling, a nova. */
  strike(power = 1) {
    this.strikeT = 0.45;
    this.strikePower = Math.max(this.strikePower, power);
    this.boltAt();
  }

  private boltAt() {
    const pts: THREE.Vector3[] = [];
    let x = (Math.random() - 0.5) * 900, y = 120;
    const z = -H / 2 - 160 - Math.random() * 400;
    const ground = this.city.position.y;
    while (y > ground) { pts.push(new THREE.Vector3(x, y, z)); x += (Math.random() - 0.5) * 50; y -= 18 + Math.random() * 22; }
    pts.push(new THREE.Vector3(x, ground, z));
    this.bolt.geometry.dispose();
    this.bolt.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  }

  frame(f: SceneFrame) {
    const { t, dt } = f;
    // The city goes by; a stretch that has passed under the camera goes round to the back.
    for (const c of this.chunks) {
      c.position.z += SPEED * dt;
      if (c.position.z - CHUNK > 700) c.position.z -= CHUNKS * CHUNK;
    }
    if (this.water.map) this.water.map.offset.y -= dt * 0.08;
    for (const fl of this.flags) fl.rotation.y = Math.sin(t * 3) * 0.3;
    for (const m of this.mist) {
      m.position.z += SPEED * 2.2 * dt;
      if (m.position.z > 700) { m.position.z -= 16 * 130; m.position.x = Math.random() * 900 - 450; }
    }
    this.stormWall.forEach((s, i) => { s.position.x += Math.sin(t * 0.2 + i) * dt * 4; });
    const p = this.rainPos;
    for (let i = 0; i < p.length / 6; i++) {
      const fall = 320 * dt;
      p[i * 6 + 1] -= fall; p[i * 6 + 4] -= fall;
      p[i * 6 + 2] += fall * 0.25; p[i * 6 + 5] += fall * 0.25;
      if (p[i * 6 + 1] < this.city.position.y) this.dropAt(i, 200);
    }
    (this.rain.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

    // Lightning now and then, flickering twice.
    this.nextStrike -= dt;
    if (this.nextStrike <= 0) { this.nextStrike = 4 + Math.random() * 7; this.strike(0.7 + Math.random() * 0.5); }
    this.strikeT = Math.max(0, this.strikeT - dt);
    const k = this.strikeT / 0.45;
    const flick = this.strikeT > 0 ? (k > 0.6 ? 1 : k > 0.45 ? 0.15 : k * 1.6) * this.strikePower : 0;
    if (this.strikeT === 0) this.strikePower = 0;
    this.flash.intensity = flick * 4;
    this.sky.intensity = 1.6 + flick * 1.2;
    (this.bolt.material as THREE.LineBasicMaterial).opacity = flick > 0.5 ? 1 : 0;
    for (const s of this.stormWall) s.material.color.set(flick > 0.2 ? '#6a68b0' : '#2a2850');

    this.syncBugs(f);
    this.syncDrops(f);
    this.syncKites(f);

    // Shake, from the camera; everything flat drawn over follows it, since it's placed through the camera.
    const sh = f.shake * 3;
    this.camera.position.copy(this.eye).add(v3.set((Math.random() - 0.5) * sh, 0, (Math.random() - 0.5) * sh));
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
  }

  private art(key: string, cv: HTMLCanvasElement) {
    let t = this.arts.get(key);
    if (!t) { t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; this.arts.set(key, t); }
    return t;
  }

  private syncBugs(f: SceneFrame) {
    const live = new Set<number>();
    for (const b of f.bugs) {
      live.add(b.id);
      let e = this.bugs.get(b.id);
      if (!e || e.kind !== b.kind) {
        if (e) this.release(e);
        const sp = this.spare.get(b.kind)?.pop() ?? spiritSprite(b.kind, this.tex);
        this.scene.add(sp.root);
        e = { kind: b.kind, s: sp };
        this.bugs.set(b.id, e);
      }
      const { w, h } = BUG_SIZE[b.kind];
      const sp = e.s;
      sp.root.position.set(b.x + w / 2 - W / 2, 2 + b.pose.dy * 1.6, b.y + h / 2 - H / 2);
      const look = spiritArt(b.kind, f.t, b.id);
      if (look.key !== sp.key) {
        sp.key = look.key;
        sp.art.material.map = this.art(look.key, look.art);
        sp.white.material.map = this.art(`${look.key}:w`, look.white);
        sp.art.material.needsUpdate = sp.white.material.needsUpdate = true;
      }
      for (const x of [sp.art, sp.white]) {
        x.material.rotation = -b.pose.rot;
        x.scale.set(sp.size * b.pose.sx, sp.size * b.pose.sy, 1);
      }
      sp.white.material.opacity = b.flash;
      sp.aura.material.opacity = (isBoss(b.kind) ? 0.4 : 0.45) + Math.sin(f.t * 4 + b.id) * 0.08;
    }
    for (const [id, e] of this.bugs) if (!live.has(id)) { this.release(e); this.bugs.delete(id); }
  }

  private release(e: { kind: BugKind; s: Spirit }) {
    this.scene.remove(e.s.root);
    const list = this.spare.get(e.kind) ?? [];
    if (list.length < (isBoss(e.kind) ? 1 : 40)) list.push(e.s); else free(e.s.root);
    this.spare.set(e.kind, list);
  }

  private syncDrops(f: SceneFrame) {
    const live = new Set<number>();
    for (const d of f.drops) {
      live.add(d.id);
      let e = this.drops.get(d.id);
      if (!e || e.kind !== d.kind) {
        if (e) { this.scene.remove(e.b.root); free(e.b.root); }
        e = { kind: d.kind, b: lantern(d.kind, this.tex) };
        this.scene.add(e.b.root);
        this.drops.set(d.id, e);
      }
      e.b.root.position.set(d.x - W / 2, 4 + Math.sin(f.t * 3 + d.id) * 1.2, d.y - H / 2);
      e.b.pivot.rotation.set(0, f.t * 1.2 + d.id, Math.sin(f.t * 3.2 + d.id) * 0.35);
    }
    for (const [id, e] of this.drops) if (!live.has(id)) { this.scene.remove(e.b.root); free(e.b.root); this.drops.delete(id); }
  }

  private syncKites(f: SceneFrame) {
    const live = new Set<number>();
    for (const k of f.kites) {
      live.add(k.slot);
      let e = this.kites.get(k.slot);
      if (!e || e.color !== k.color) {
        if (e) { this.scene.remove(e.b.root); free(e.b.root); }
        const b = kite(k.color, this.tex);
        const shield = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 14), new THREE.MeshBasicMaterial({ color: '#4cc9f0', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
        b.root.add(shield);
        e = { color: k.color, b, shield };
        this.scene.add(b.root);
        this.kites.set(k.slot, e);
      }
      e.b.root.visible = !k.hidden;
      e.b.root.position.set(k.x + SHIP_W / 2 - W / 2, 2, k.y + SHIP_H / 2 - H / 2);
      e.b.pivot.rotation.set(Math.sin(f.t * 2.2 + k.slot) * 0.08, 0, -k.tilt * 0.5);
      e.b.tick?.(f.t + k.slot);
      e.shield.visible = k.shield > 0;
      (e.shield.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(f.t * 6) * 0.05;
    }
    for (const [slot, e] of this.kites) if (!live.has(slot)) { this.scene.remove(e.b.root); free(e.b.root); this.kites.delete(slot); }
  }

  dispose() {
    free(this.scene);
    for (const list of this.spare.values()) list.forEach((b) => free(b.root));
    for (const t of this.arts.values()) t.dispose();
    this.water.map?.dispose();
    this.tex.dispose();
    this.renderer.dispose();
  }
}

