// Bug Swarm: a wave shooter for two in the world (or one, practising). Ships
// along the bottom, a swarm of space bugs in formation above that sways,
// peels off to dive, and drops larvae; every fifth wave a queen. This is the
// game's rules with no drawing and no network — BugSwarm.tsx draws it and
// carries it between the two.
//
// Who decides what, so the two screens can't disagree:
//   the host  runs the swarm — every bug, larva, power-up and score — and
//             both players' shots, the guest's fired from where the guest
//             says its ship is;
//   each player  owns its own ship: where it is, and whether something hit
//             it (so a dodge on your screen is a dodge).

export const W = 270;
export const H = 360;
export const SHIP_W = 14;
export const SHIP_H = 12;
export const SHIP_SPEED = 160;
export const LIVES = 3;
export const MAX_LEVEL = 5;
const INVULNERABLE = 2;
const SHIELD = 6;
const SHOT_SPEED = 330;
const DROP_SPEED = 45;

export type BugKind = 'beetle' | 'moth' | 'wasp' | 'queen';
export const BUG_KINDS: BugKind[] = ['beetle', 'moth', 'wasp', 'queen'];
export const BUG_SIZE: Record<BugKind, { w: number; h: number }> = {
  beetle: { w: 14, h: 12 }, moth: { w: 16, h: 12 }, wasp: { w: 14, h: 13 }, queen: { w: 52, h: 36 },
};
const POINTS: Record<BugKind, number> = { beetle: 10, moth: 20, wasp: 30, queen: 500 };

export type DropKind = 'gun' | 'shield' | 'life';
export const DROP_KINDS: DropKind[] = ['gun', 'shield', 'life'];

export interface Ship {
  x: number; y: number;
  lives: number;
  alive: boolean;
  /** Seconds of not being hurt left (after a hit, or a shield). */
  inv: number;
  shield: number;
  level: number;
  cool: number;
  firing: boolean;
}

export interface Bug {
  id: number; kind: BugKind; hp: number; maxHp: number;
  x: number; y: number;
  /** Its place in the formation, before the sway. */
  hx: number; hy: number;
  mode: 'enter' | 'home' | 'dive' | 'return';
  /** Seconds in this mode (negative: still waiting to fly in). */
  t: number;
  sx: number; sy: number; side: 1 | -1;
  vx: number;
}
export interface Shot { x: number; y: number; vx: number; vy: number; owner: number }
export interface Bomb { id: number; x: number; y: number; vx: number; vy: number }
export interface Drop { id: number; kind: DropKind; x: number; y: number }
export interface Boom { x: number; y: number; big: boolean }

export interface Swarm {
  wave: number;
  bugs: Bug[];
  shots: Shot[];
  bombs: Bomb[];
  drops: Drop[];
  t: number;
  /** Seconds until the next wave flies in, while the sky is clear. */
  between: number;
  nextId: number;
  diveIn: number;
  queenFire: number;
  queenSpawn: number;
  scores: [number, number];
  /** Explosions this step, for the drawing. */
  booms: Boom[];
}

export function newShip(index: number): Ship {
  return { x: W / 2 - SHIP_W / 2 + (index ? 40 : -40), y: H - 34, lives: LIVES, alive: true, inv: INVULNERABLE, shield: 0, level: 1, cool: 0, firing: false };
}

export function newSwarm(): Swarm {
  return { wave: 0, bugs: [], shots: [], bombs: [], drops: [], t: 0, between: 1.5, nextId: 1, diveIn: 3, queenFire: 2, queenSpawn: 5, scores: [0, 0], booms: [] };
}

export const isQueenWave = (n: number) => n % 5 === 0;

function spawnWave(s: Swarm) {
  s.wave += 1;
  const n = s.wave;
  const queen = isQueenWave(n);
  const rows = queen ? 1 : Math.min(5, 2 + Math.floor(n / 2));
  const cols = 8;
  const tough = Math.floor(n / 6);
  for (let r = 0; r < rows; r++) {
    const kind: BugKind = queen ? 'wasp' : r === 0 && n >= 3 ? 'wasp' : r <= 1 && n >= 2 ? 'moth' : 'beetle';
    const hp = (kind === 'moth' ? 2 : 1) + tough;
    for (let c = 0; c < cols; c++) {
      const side = c < cols / 2 ? -1 : 1;
      const hx = (W - (cols - 1) * 26) / 2 + c * 26 - BUG_SIZE[kind].w / 2;
      const hy = (queen ? 92 : 36) + r * 22;
      s.bugs.push({
        id: s.nextId++, kind, hp, maxHp: hp, x: -40, y: -40, hx, hy, mode: 'enter',
        t: -(r * 0.35 + (side < 0 ? c : cols - 1 - c) * 0.12), sx: side < 0 ? -30 : W + 10, sy: 90 + r * 10, side, vx: 0,
      });
    }
  }
  if (queen) {
    const hp = 60 + n * 8;
    s.bugs.push({ id: s.nextId++, kind: 'queen', hp, maxHp: hp, x: W / 2 - 26, y: -50, hx: W / 2 - 26, hy: 40, mode: 'enter', t: -0.5, sx: W / 2 - 26, sy: -60, side: 1, vx: 0 });
  }
  s.diveIn = 2.5;
}

const ease = (k: number) => k * k * (3 - 2 * k);
const centre = (b: { x: number; w: number }) => b.x + b.w / 2;

export function shotsFor(ship: Ship, owner: number): Shot[] {
  const x = ship.x + SHIP_W / 2 - 1, y = ship.y - 4;
  const up = (dx: number, angle = 0): Shot => ({ x: x + dx, y, vx: Math.sin(angle) * SHOT_SPEED, vy: -Math.cos(angle) * SHOT_SPEED, owner });
  const a = 0.14;
  switch (ship.level) {
    case 1: return [up(0)];
    case 2: return [up(-3), up(3)];
    case 3: return [up(0), up(-2, -a), up(2, a)];
    case 4: return [up(-3), up(3), up(-4, -a), up(4, a)];
    default: return [up(0), up(-3), up(3), up(-4, -a * 1.6), up(4, a * 1.6)];
  }
}
export const fireDelay = (level: number) => 0.24 - level * 0.015;

/** Moves a ship by what's held (keys) or toward a point (a finger), and counts down its timers. */
export function moveShip(ship: Ship, dt: number, keys: { dx: number; dy: number }, toward: { x: number; y: number } | null) {
  ship.inv = Math.max(0, ship.inv - dt);
  ship.shield = Math.max(0, ship.shield - dt);
  ship.cool = Math.max(0, ship.cool - dt);
  if (!ship.alive) return;
  if (toward) {
    const k = Math.min(1, dt * 18);
    ship.x += (toward.x - ship.x) * k;
    ship.y += (toward.y - ship.y) * k;
  } else {
    ship.x += keys.dx * SHIP_SPEED * dt;
    ship.y += keys.dy * SHIP_SPEED * dt;
  }
  ship.x = Math.max(2, Math.min(W - SHIP_W - 2, ship.x));
  ship.y = Math.max(H * 0.5, Math.min(H - SHIP_H - 6, ship.y));
}

/** A hit on a ship: a life lost and a gun level with it, unless it's shielded or just came back. */
export function hurtShip(ship: Ship): boolean {
  if (!ship.alive || ship.inv > 0 || ship.shield > 0) return false;
  ship.lives -= 1;
  ship.level = Math.max(1, ship.level - 1);
  ship.inv = INVULNERABLE;
  if (ship.lives <= 0) ship.alive = false;
  return true;
}

export function applyDrop(ship: Ship, kind: DropKind) {
  if (kind === 'gun') ship.level = Math.min(MAX_LEVEL, ship.level + 1);
  else if (kind === 'shield') ship.shield = SHIELD;
  else ship.lives = Math.min(LIVES + 2, ship.lives + 1);
}

export const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const shipBox = (s: Ship) => ({ x: s.x + 2, y: s.y + 2, w: SHIP_W - 4, h: SHIP_H - 3 });
export const bugBox = (b: { kind: BugKind; x: number; y: number }) => ({ x: b.x, y: b.y, w: BUG_SIZE[b.kind].w, h: BUG_SIZE[b.kind].h });
export const bombBox = (b: { x: number; y: number }) => ({ x: b.x - 2, y: b.y - 3, w: 4, h: 6 });
export const dropBox = (d: { x: number; y: number }) => ({ x: d.x - 6, y: d.y - 6, w: 12, h: 12 });

/** One step of the swarm — the host's alone. `ships` are both players' (or one). */
export function stepSwarm(s: Swarm, ships: Ship[], dt: number, rnd: () => number = Math.random) {
  s.t += dt;
  s.booms = [];
  const n = s.wave;

  // A clear sky: the next wave, after a breath.
  if (!s.bugs.length) {
    s.between -= dt;
    if (s.between <= 0) { spawnWave(s); s.between = 2.5; }
  }

  const sway = Math.sin(s.t * 0.7) * 26;
  const targets = ships.filter((p) => p.alive);
  const aim = () => (targets.length ? centre({ x: targets[Math.floor(rnd() * targets.length)].x, w: SHIP_W }) : W / 2);

  // Now and then one peels off to dive.
  s.diveIn -= dt;
  if (s.diveIn <= 0) {
    s.diveIn = Math.max(0.55, 2.1 - n * 0.14) * (0.7 + rnd() * 0.6);
    const home = s.bugs.filter((b) => b.mode === 'home' && b.kind !== 'queen');
    const b = home[Math.floor(rnd() * home.length)];
    if (b) { b.mode = 'dive'; b.t = 0; b.sx = aim(); b.vx = 0; }
  }

  const bombSpeed = 85 + Math.min(60, n * 4);
  const dropBomb = (x: number, y: number, vx = 0) => s.bombs.push({ id: s.nextId++, x, y, vx, vy: bombSpeed });

  for (const b of s.bugs) {
    b.t += dt;
    const size = BUG_SIZE[b.kind];
    if (b.kind === 'queen') {
      if (b.t < 0) continue;
      const k = Math.min(1, b.t / 2);
      b.x = W / 2 - size.w / 2 + Math.sin(s.t * 0.6) * 85 * k;
      b.y = -50 + (40 + 50) * ease(k) + Math.sin(s.t * 1.4) * 8 * k;
      if (k < 1) continue;
      b.mode = 'home';
      s.queenFire -= dt;
      if (s.queenFire <= 0) {
        s.queenFire = Math.max(0.7, 1.6 - n * 0.03);
        const cx = b.x + size.w / 2, cy = b.y + size.h;
        for (let i = -2; i <= 2; i++) dropBomb(cx, cy, i * 32);
      }
      s.queenSpawn -= dt;
      if (s.queenSpawn <= 0) {
        s.queenSpawn = 6;
        for (let i = 0; i < 3; i++) {
          s.bugs.push({ id: s.nextId++, kind: 'wasp', hp: 1, maxHp: 1, x: b.x + 6 + i * 18, y: b.y + 20, hx: 0, hy: 0, mode: 'dive', t: -i * 0.25, sx: aim(), sy: 0, side: 1, vx: 0 });
        }
      }
      continue;
    }
    switch (b.mode) {
      case 'enter': {
        if (b.t < 0) break;
        const k = Math.min(1, b.t / 1.6);
        const e = ease(k);
        b.x = b.sx + (b.hx + sway - b.sx) * e + Math.sin(k * Math.PI) * b.side * -40;
        b.y = b.sy + (b.hy - b.sy) * e - Math.sin(k * Math.PI) * 60;
        if (k >= 1) b.mode = 'home';
        break;
      }
      case 'home':
        b.x = b.hx + sway;
        b.y = b.hy + Math.sin(s.t * 2 + b.id) * 3;
        if (rnd() < (0.012 + n * 0.004) * dt * 2) dropBomb(b.x + size.w / 2, b.y + size.h);
        break;
      case 'dive': {
        if (b.t < 0) break;
        const speed = 105 + Math.min(80, n * 5);
        // Steer toward where it was aimed; a moth weaves as it comes.
        const want = b.sx + (b.kind === 'moth' ? Math.sin(b.t * 5) * 40 : 0);
        b.vx += Math.sign(want - (b.x + size.w / 2)) * 220 * dt;
        b.vx = Math.max(-110, Math.min(110, b.vx));
        b.x += b.vx * dt;
        b.y += speed * dt;
        if (b.t > 0.35 && b.t - dt <= 0.35) dropBomb(b.x + size.w / 2, b.y + size.h, b.vx * 0.3);
        if (b.y > H + 20) {
          if (b.hx === 0 && b.hy === 0) { b.hp = 0; break; } // a queen's escort: gone
          b.mode = 'return'; b.t = 0; b.y = -20;
        }
        break;
      }
      case 'return': {
        const k = Math.min(1, b.t / 1.2);
        b.x += (b.hx + sway - b.x) * Math.min(1, dt * 4);
        b.y = -20 + (b.hy + 20) * ease(k);
        if (k >= 1) b.mode = 'home';
        break;
      }
    }
  }

  // Shots.
  for (const sh of s.shots) { sh.x += sh.vx * dt; sh.y += sh.vy * dt; }
  for (const sh of s.shots) {
    if (sh.y < -10) continue;
    for (const b of s.bugs) {
      if (b.hp <= 0 || (b.mode === 'enter' && b.t < 0)) continue;
      if (!overlap({ x: sh.x, y: sh.y, w: 2, h: 6 }, bugBox(b))) continue;
      b.hp -= 1;
      sh.y = -100;
      if (b.hp <= 0) {
        s.scores[sh.owner] += POINTS[b.kind] * (b.mode === 'dive' ? 2 : 1);
        const cx = b.x + BUG_SIZE[b.kind].w / 2, cy = b.y + BUG_SIZE[b.kind].h / 2;
        s.booms.push({ x: cx, y: cy, big: b.kind === 'queen' });
        if (b.kind === 'queen') {
          s.drops.push({ id: s.nextId++, kind: 'gun', x: cx - 14, y: cy });
          s.drops.push({ id: s.nextId++, kind: 'life', x: cx + 14, y: cy });
          s.bombs = [];
        } else {
          const r = rnd();
          const kind: DropKind | null = r < 0.06 ? 'gun' : r < 0.085 ? 'shield' : r < 0.093 ? 'life' : null;
          if (kind) s.drops.push({ id: s.nextId++, kind, x: cx, y: cy });
        }
      }
      break;
    }
  }
  s.shots = s.shots.filter((sh) => sh.y > -10 && sh.x > -10 && sh.x < W + 10);
  s.bugs = s.bugs.filter((b) => b.hp > 0);

  for (const b of s.bombs) { b.x += b.vx * dt; b.y += b.vy * dt; }
  s.bombs = s.bombs.filter((b) => b.y < H + 10 && b.x > -10 && b.x < W + 10);
  for (const d of s.drops) d.y += DROP_SPEED * dt;
  s.drops = s.drops.filter((d) => d.y < H + 10);
}

/** A bug rammed by a ship: gone, no points. */
export function crash(s: Swarm, id: number) {
  const b = s.bugs.find((x) => x.id === id);
  if (!b || b.kind === 'queen') return;
  s.booms.push({ x: b.x + BUG_SIZE[b.kind].w / 2, y: b.y + BUG_SIZE[b.kind].h / 2, big: false });
  b.hp = 0;
  s.bugs = s.bugs.filter((x) => x.hp > 0);
}
