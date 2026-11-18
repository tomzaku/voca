// Citadel Guard: a tower defence for two in the world (or one, practising).
// Monsters march along two lanes that meet before Huế's citadel gate; the
// players build towers beside the road to stop them. This is the game's rules
// with no drawing and no network — CitadelGuard.tsx draws it and carries it.
//
// The host runs all of it. A tower defence is slow enough that the guest can
// simply ask ("build a frost tower here", "upgrade that one") and draw what
// the host sends back, so there's one game and nothing to reconcile.
//
// Co-op: each player has their own gold and their own towers (only you can
// upgrade or sell yours), every kill pays you both, and the gate's lives are
// shared. Two players means two players' gold, so the monsters are tougher.

export const COLS = 20;
export const ROWS = 12;
export const T = 16;
export const W = COLS * T;
export const H = ROWS * T;
export const LIVES = 20;
const FIRST_BREAK = 30;
const BREAK = 20;

type P = [number, number];
const LANES: P[][] = [
  [[-1, 2], [4, 2], [4, 4], [9, 4], [9, 6], [12, 6]],
  [[-1, 10], [6, 10], [6, 8], [10, 8], [10, 6], [12, 6]],
];
const COMMON: P[] = [[12, 6], [15, 6], [15, 3], [17, 3], [17, 6], [20, 6]];
/** Where the gate stands: not for building on. */
const GATE = { c: 19, r0: 3, r1: 9 };
const TREES: P[] = [[1, 6], [2, 7], [8, 1], [13, 1], [14, 10], [3, 12 - 1], [12, 9], [16, 9], [7, 6], [1, 0]];

export type TowerKind = 'archer' | 'cannon' | 'frost' | 'firework';
export const TOWER_KINDS: TowerKind[] = ['archer', 'cannon', 'frost', 'firework'];
export interface TowerStats { cost: number[]; range: number[]; dmg: number[]; rate: number[]; air: boolean; splash?: number; slow?: number[]; airBonus?: number }
export const TOWERS: Record<TowerKind, TowerStats> = {
  archer: { cost: [50, 40, 70], range: [2.6, 2.9, 3.3], dmg: [6, 10, 16], rate: [0.6, 0.5, 0.4], air: true },
  cannon: { cost: [80, 60, 100], range: [2.2, 2.4, 2.7], dmg: [14, 24, 40], rate: [1.4, 1.3, 1.2], air: false, splash: 0.95 },
  frost: { cost: [60, 50, 80], range: [2.2, 2.5, 2.8], dmg: [2, 3, 5], rate: [0.9, 0.8, 0.7], air: true, slow: [0.4, 0.5, 0.6] },
  firework: { cost: [110, 90, 140], range: [3.5, 3.9, 4.3], dmg: [22, 36, 60], rate: [1.6, 1.5, 1.3], air: true, airBonus: 2 },
};
export const MAX_LEVEL = 3;

export type EnemyKind = 'rat' | 'beetle' | 'crab' | 'moth' | 'toad';
export const ENEMY_KINDS: EnemyKind[] = ['rat', 'beetle', 'crab', 'moth', 'toad'];
export const ENEMIES: Record<EnemyKind, { hp: number; speed: number; gold: number; armor: number; air: boolean; leak: number }> = {
  rat: { hp: 18, speed: 1.7, gold: 3, armor: 0, air: false, leak: 1 },
  beetle: { hp: 40, speed: 1.0, gold: 5, armor: 0, air: false, leak: 1 },
  crab: { hp: 130, speed: 0.6, gold: 11, armor: 4, air: false, leak: 2 },
  moth: { hp: 28, speed: 1.25, gold: 6, armor: 0, air: true, leak: 1 },
  toad: { hp: 1100, speed: 0.45, gold: 80, armor: 6, air: false, leak: 5 },
};

// ── The map ─────────────────────────────────────────────────────────────────

interface Path { pts: { x: number; y: number }[]; cum: number[]; len: number }

function makePath(points: P[]): Path {
  const pts = points.map(([c, r]) => ({ x: (c + 0.5) * T, y: (r + 0.5) * T }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, len: cum[cum.length - 1] };
}

export const PATHS: Path[] = LANES.map((lane) => makePath([...lane, ...COMMON.slice(1)]));

export function posAt(p: Path, d: number) {
  if (d <= 0) return { ...p.pts[0] };
  for (let i = 1; i < p.pts.length; i++) {
    if (d <= p.cum[i]) {
      const k = (d - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1]);
      return { x: p.pts[i - 1].x + (p.pts[i].x - p.pts[i - 1].x) * k, y: p.pts[i - 1].y + (p.pts[i].y - p.pts[i - 1].y) * k };
    }
  }
  return { ...p.pts[p.pts.length - 1] };
}

/** Each tile: 0 grass (yours to build on), 1 road, 2 a tree, 3 the gate. */
export const TILES: number[] = (() => {
  const g = Array<number>(COLS * ROWS).fill(0);
  const mark = (c: number, r: number, v: number) => { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) g[r * COLS + c] = v; };
  for (const pts of [...LANES, COMMON]) {
    for (let i = 1; i < pts.length; i++) {
      const [c0, r0] = pts[i - 1], [c1, r1] = pts[i];
      for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) mark(c, r, 1);
    }
  }
  for (let r = GATE.r0; r <= GATE.r1; r++) mark(GATE.c, r, 3);
  for (const [c, r] of TREES) if (g[r * COLS + c] === 0) mark(c, r, 2);
  return g;
})();

export const tileAt = (c: number, r: number) => (c < 0 || c >= COLS || r < 0 || r >= ROWS ? 3 : TILES[r * COLS + c]);

// ── State ───────────────────────────────────────────────────────────────────

export interface Tower { id: number; owner: number; kind: TowerKind; level: number; c: number; r: number; cool: number; spent: number; aim: number }
export interface Enemy { id: number; kind: EnemyKind; hp: number; max: number; lane: number; d: number; x: number; y: number; slow: number; slowT: number }
/** A tower firing, for the drawing: from where to where. */
export interface Shot { kind: TowerKind; x0: number; y0: number; x1: number; y1: number }

export interface Guard {
  players: number;
  towers: Tower[];
  enemies: Enemy[];
  gold: number[];
  lives: number;
  wave: number;
  phase: 'build' | 'wave';
  /** Seconds until the next wave marches, between waves. */
  countdown: number;
  queue: EnemyKind[];
  spawnIn: number;
  spawned: number;
  nextId: number;
  /** Shots since the drawing (or the guest) last took them. */
  shots: Shot[];
  speed: 1 | 2;
  over: boolean;
  t: number;
}

export function newGuard(players: number): Guard {
  return {
    players, towers: [], enemies: [], gold: Array(players).fill(players > 1 ? 150 : 200), lives: LIVES, wave: 0, phase: 'build',
    countdown: FIRST_BREAK, queue: [], spawnIn: 0, spawned: 0, nextId: 1, shots: [], speed: 1, over: false, t: 0,
  };
}

export function waveOf(n: number): EnemyKind[] {
  const list: EnemyKind[] = [];
  const count = 6 + n * 2;
  for (let i = 0; i < count; i++) {
    let k: EnemyKind = 'beetle';
    if (n >= 2 && i % 3 === 0) k = 'rat';
    if (n >= 4 && n % 2 === 0 && i % 4 === 1) k = 'moth';
    if (n >= 6 && i % 5 === 2) k = 'crab';
    list.push(k);
  }
  if (n % 10 === 0) list.push('toad');
  return list;
}

const spawnGap = (n: number) => Math.max(0.35, 0.9 - n * 0.03);
const hpScale = (g: Guard) => (1 + 0.2 * (g.wave - 1)) * (g.players > 1 ? 1.5 : 1);

export const canBuild = (g: Guard, c: number, r: number) => tileAt(c, r) === 0 && !g.towers.some((t) => t.c === c && t.r === r);
export const towerAt = (g: { towers: Pick<Tower, 'c' | 'r' | 'id'>[] }, c: number, r: number) => g.towers.find((t) => t.c === c && t.r === r);
export const upgradeCost = (t: Pick<Tower, 'kind' | 'level'>) => (t.level >= MAX_LEVEL ? null : TOWERS[t.kind].cost[t.level]);
export const refund = (t: Pick<Tower, 'spent'>) => Math.floor(t.spent * 0.7);

export function build(g: Guard, owner: number, kind: TowerKind, c: number, r: number) {
  const cost = TOWERS[kind].cost[0];
  if (g.over || !canBuild(g, c, r) || (g.gold[owner] ?? 0) < cost) return false;
  g.gold[owner] -= cost;
  g.towers.push({ id: g.nextId++, owner, kind, level: 1, c, r, cool: 0, spent: cost, aim: 0 });
  return true;
}

export function upgrade(g: Guard, owner: number, id: number) {
  const t = g.towers.find((x) => x.id === id);
  if (!t || t.owner !== owner) return false;
  const cost = upgradeCost(t);
  if (cost === null || g.gold[owner] < cost) return false;
  g.gold[owner] -= cost;
  t.level += 1;
  t.spent += cost;
  return true;
}

export function sell(g: Guard, owner: number, id: number) {
  const t = g.towers.find((x) => x.id === id);
  if (!t || t.owner !== owner) return false;
  g.gold[owner] += refund(t);
  g.towers = g.towers.filter((x) => x !== t);
  return true;
}

function startWave(g: Guard) {
  g.wave += 1;
  g.phase = 'wave';
  g.queue = waveOf(g.wave);
  g.spawnIn = 0;
  g.spawned = 0;
}

/** Either player, between waves: send the next one now, for a little gold each. */
export function callWave(g: Guard) {
  if (g.over || g.phase !== 'build') return;
  const bonus = Math.ceil(g.countdown / 2);
  g.gold = g.gold.map((x) => x + bonus);
  startWave(g);
}

function hurt(g: Guard, e: Enemy, dmg: number) {
  e.hp -= Math.max(1, dmg - ENEMIES[e.kind].armor);
  if (e.hp <= 0) g.gold = g.gold.map((x) => x + ENEMIES[e.kind].gold);
}

export function stepGuard(g: Guard, dt: number, rnd: () => number = Math.random) {
  if (g.over) return;
  g.t += dt;

  if (g.phase === 'build') {
    g.countdown -= dt;
    if (g.countdown <= 0) startWave(g);
  } else {
    g.spawnIn -= dt;
    if (g.queue.length && g.spawnIn <= 0) {
      const kind = g.queue.shift()!;
      const s = ENEMIES[kind];
      const max = Math.round(s.hp * hpScale(g));
      const lane = kind === 'toad' ? Math.floor(rnd() * 2) : g.spawned % 2;
      const p = posAt(PATHS[lane], 0);
      g.enemies.push({ id: g.nextId++, kind, hp: max, max, lane, d: 0, x: p.x, y: p.y, slow: 0, slowT: 0 });
      g.spawned += 1;
      g.spawnIn = spawnGap(g.wave);
    }
    if (!g.queue.length && !g.enemies.length) {
      g.phase = 'build';
      g.countdown = BREAK;
      const bonus = 20 + g.wave * 2;
      g.gold = g.gold.map((x) => x + bonus);
    }
  }

  // March.
  for (const e of g.enemies) {
    e.slowT = Math.max(0, e.slowT - dt);
    const v = ENEMIES[e.kind].speed * T * (e.slowT > 0 ? 1 - e.slow : 1);
    e.d += v * dt;
    const path = PATHS[e.lane];
    if (e.d >= path.len) {
      g.lives = Math.max(0, g.lives - ENEMIES[e.kind].leak);
      e.hp = -Infinity;
      continue;
    }
    const p = posAt(path, e.d);
    e.x = p.x; e.y = p.y;
  }
  g.enemies = g.enemies.filter((e) => e.hp !== -Infinity);
  if (g.lives <= 0) { g.over = true; return; }

  // Fire: each tower at the monster furthest along the road that it can reach.
  for (const t of g.towers) {
    t.cool -= dt;
    if (t.cool > 0) continue;
    const s = TOWERS[t.kind];
    const lv = t.level - 1;
    const tx = (t.c + 0.5) * T, ty = (t.r + 0.5) * T;
    const reach = s.range[lv] * T;
    let target: Enemy | null = null;
    let best = -1;
    for (const e of g.enemies) {
      if (e.hp <= 0 || (ENEMIES[e.kind].air && !s.air)) continue;
      if (Math.hypot(e.x - tx, e.y - ty) > reach) continue;
      const along = e.d / PATHS[e.lane].len;
      if (along > best) { best = along; target = e; }
    }
    if (!target) continue;
    t.cool = s.rate[lv];
    t.aim = Math.atan2(target.y - ty, target.x - tx);
    g.shots.push({ kind: t.kind, x0: tx, y0: ty, x1: target.x, y1: target.y });
    let dmg = s.dmg[lv];
    if (s.airBonus && ENEMIES[target.kind].air) dmg *= s.airBonus;
    if (s.splash) {
      const r = s.splash * T;
      for (const e of g.enemies) {
        if (e.hp > 0 && !ENEMIES[e.kind].air && Math.hypot(e.x - target.x, e.y - target.y) <= r) hurt(g, e, dmg);
      }
    } else {
      hurt(g, target, dmg);
    }
    if (s.slow) { target.slow = Math.max(target.slow * (target.slowT > 0 ? 1 : 0), s.slow[lv]); target.slowT = 1.2; }
  }
  g.enemies = g.enemies.filter((e) => e.hp > 0);
  if (g.shots.length > 200) g.shots.splice(0, g.shots.length - 200);
}
