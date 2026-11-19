// Bug Swarm: a wave shooter for two in the world (or one, practising). Ships
// along the bottom, a swarm of space bugs in formation above that sways,
// peels off to dive, and drops larvae; every fifth wave a boss — four of
// them, in turn, each fighting its own way. This is the game's rules with no
// drawing and no network — BugSwarm.tsx draws it and carries it between the two.
//
// Who decides what, so the two screens can't disagree:
//   the host  runs the swarm — every bug, bullet, power-up and score — and
//             both players' shots, the guest's fired from where the guest
//             says its ship is, with the guest's weapon;
//   each player  owns its own ship: where it is, what it's armed with, and
//             whether something hit it (so a dodge on your screen is a dodge).
//
// Weapons come in capsules the bugs drop: the same weapon again levels it up,
// another swaps to it at the level you had. Kills in quick succession build a
// combo that multiplies the score; a hit breaks it. A nova clears the sky of
// bullets and hurts everything in it — you start with one.
//
// Every third wave, each player drafts a perk (one of three), so a run grows
// its own way; and kills fill an overdrive meter, set off for a few seconds
// of double fire with nothing able to touch you.

export const W = 270;
export const H = 360;
export const SHIP_W = 14;
export const SHIP_H = 12;
export const SHIP_SPEED = 160;
export const LIVES = 3;
export const MAX_LEVEL = 5;
const INVULNERABLE = 2;
const SHIELD = 6;
const DROP_SPEED = 45;

export type BossKind = 'queen' | 'mantis' | 'spider' | 'hornet';
export const BOSSES: BossKind[] = ['queen', 'mantis', 'spider', 'hornet'];
/** firefly: a kamikaze that hunts your ship · shell: armoured, shoots back ·
 *  golden: a moth worth a fortune, crossing the top now and then. */
export type BugKind = 'beetle' | 'moth' | 'wasp' | 'firefly' | 'shell' | 'golden' | 'splitter' | 'mite' | BossKind;
export const BUG_KINDS: BugKind[] = ['beetle', 'moth', 'wasp', 'queen', 'mantis', 'spider', 'hornet', 'firefly', 'shell', 'golden', 'splitter', 'mite'];
export const BUG_SIZE: Record<BugKind, { w: number; h: number }> = {
  beetle: { w: 14, h: 12 }, moth: { w: 16, h: 12 }, wasp: { w: 14, h: 13 },
  firefly: { w: 10, h: 11 }, shell: { w: 16, h: 14 }, golden: { w: 16, h: 12 }, splitter: { w: 15, h: 13 }, mite: { w: 8, h: 8 },
  queen: { w: 52, h: 36 }, mantis: { w: 50, h: 36 }, spider: { w: 52, h: 38 }, hornet: { w: 46, h: 36 },
};
export const isBoss = (k: BugKind): k is BossKind => (BOSSES as string[]).includes(k);
export const POINTS: Record<BugKind, number> = { splitter: 40, mite: 15, beetle: 10, moth: 20, wasp: 30, firefly: 40, shell: 50, golden: 300, queen: 500, mantis: 600, spider: 700, hornet: 800 };
export const MAX_NOVAS = 3;
/** Seconds a combo waits for the next kill. */
const COMBO_S = 2.2;
/** The score multiplier a combo of `n` kills is worth: ×1, then one more every four kills, to ×5. */
export const multiplier = (n: number) => Math.min(5, 1 + Math.floor(n / 4));

/** Which boss comes on wave `n`, if one does: every fifth wave, the four in turn. */
export const bossOf = (n: number): BossKind | null => (n > 0 && n % 5 === 0 ? BOSSES[(n / 5 - 1) % BOSSES.length] : null);

export type Weapon = 'blaster' | 'laser' | 'rockets' | 'scatter';
export const WEAPONS: Weapon[] = ['blaster', 'laser', 'rockets', 'scatter'];
export type DropKind = 'gun' | 'shield' | 'life' | 'laser' | 'rockets' | 'scatter' | 'blaster' | 'nova' | 'time';
export const DROP_KINDS: DropKind[] = ['gun', 'shield', 'life', 'laser', 'rockets', 'scatter', 'blaster', 'nova', 'time'];

// ── Perks ───────────────────────────────────────────────────────────────────

export type PerkKind = 'rapid' | 'power' | 'drone' | 'magnet' | 'armor' | 'novas' | 'pierce' | 'charge';
export const PERKS: PerkKind[] = ['rapid', 'power', 'drone', 'magnet', 'armor', 'novas', 'pierce', 'charge'];
/** How many times each can be taken. */
export const PERK_MAX: Record<PerkKind, number> = { rapid: 3, power: 3, drone: 2, magnet: 2, armor: 2, novas: 2, pierce: 2, charge: 2 };
export type Perks = Record<PerkKind, number>;
export const noPerks = (): Perks => ({ rapid: 0, power: 0, drone: 0, magnet: 0, armor: 0, novas: 0, pierce: 0, charge: 0 });
/** Waves after which there's a draft: every third. */
export const isDraftWave = (n: number) => n > 0 && n % 3 === 0;

/** Three perks to choose between, none already taken as far as it goes. */
export function draftFor(perks: Perks, rnd: () => number = Math.random): PerkKind[] {
  const open = PERKS.filter((p) => perks[p] < PERK_MAX[p]);
  for (let i = open.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [open[i], open[j]] = [open[j], open[i]]; }
  return open.slice(0, 3);
}

export function takePerk(ship: Ship, p: PerkKind) {
  if (ship.perks[p] >= PERK_MAX[p]) return;
  ship.perks[p] += 1;
  if (p === 'armor') ship.lives += 1;
  if (p === 'novas') ship.novas += 1;
}

export const maxLives = (ship: Ship) => LIVES + 2 + ship.perks.armor;
export const maxNovas = (ship: Ship) => MAX_NOVAS + ship.perks.novas;
/** How far a ship reaches for a capsule. */
export const reach = (ship: Ship) => 7 + ship.perks.magnet * 14;
/** Seconds of overdrive. */
export const OVERDRIVE_S = 6;
/** Where a drone flies, circling its ship. */
export function dronePos(ship: Pick<Ship, 'x' | 'y'>, i: number, t: number) {
  const a = t * 3 + i * Math.PI;
  return { x: ship.x + SHIP_W / 2 + Math.cos(a) * 17, y: ship.y + SHIP_H / 2 - 2 + Math.sin(a) * 6 };
}
/** What a ship's drones fire, once every DRONE_S. */
export const DRONE_S = 0.38;
export function droneShots(ship: Ship, owner: number, t: number): Shot[] {
  const out: Shot[] = [];
  for (let i = 0; i < ship.perks.drone; i++) {
    const p = dronePos(ship, i, t);
    out.push({ x: p.x - 1, y: p.y - 4, vx: 0, vy: -330, owner, kind: 'bolt', dmg: 0.7 * 1.3 ** ship.perks.power, life: 3 });
  }
  return out;
}
const isWeapon = (k: DropKind): k is Weapon => (WEAPONS as string[]).includes(k);

export type ShotKind = 'bolt' | 'beam' | 'rocket' | 'pellet';
export const SHOT_KINDS: ShotKind[] = ['bolt', 'beam', 'rocket', 'pellet'];
export type BombKind = 'larva' | 'orb' | 'sting' | 'blade';
export const BOMB_KINDS: BombKind[] = ['larva', 'orb', 'sting', 'blade'];

export interface Ship {
  x: number; y: number;
  lives: number;
  alive: boolean;
  /** Seconds of not being hurt left (after a hit, or a shield). */
  inv: number;
  shield: number;
  level: number;
  weapon: Weapon;
  /** Novas in hand. */
  novas: number;
  /** Seconds of overdrive left. */
  odT: number;
  perks: Perks;
  cool: number;
  droneCool: number;
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
  /** A boss's attack timers. */
  a1: number; a2: number;
}
export interface Shot {
  x: number; y: number; vx: number; vy: number; owner: number; kind: ShotKind; dmg: number;
  /** Seconds left (pellets fly a short way). */
  life: number;
  /** A beam (or a piercing shot) goes through bugs: the ones it has already hit. */
  hit?: number[];
  /** How many more bugs a piercing shot may go through. */
  pierce?: number;
}
export interface Bomb { id: number; x: number; y: number; vx: number; vy: number; kind: BombKind }
export interface Drop { id: number; kind: DropKind; x: number; y: number }
/** A rocket going off, for the drawing. */
export interface Blast { x: number; y: number }
/** A kill, for the score that floats up from it. */
export interface Kill { x: number; y: number; pts: number; owner: number }
/** A nova going off. */
export interface Nova { x: number; y: number; owner: number }

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
  scores: [number, number];
  /** Rockets that went off since the drawing (or the guest) last took them. */
  blasts: Blast[];
  /** Kills and novas, likewise. */
  kills: Kill[];
  novas: Nova[];
  /** Each player's combo: kills in a row, and seconds left to add to it. */
  combo: [number, number];
  comboT: [number, number];
  /** Seconds until a golden moth may cross, this wave. */
  goldIn: number;
  /** Whether this wave has been flown without anyone being hit, for the bonus. */
  clean: boolean;
  /** Each player's overdrive meter, 0–1, filled by kills. */
  meter: [number, number];
  /** Seconds the bugs' bullets crawl, from a slow-mo capsule. */
  slowT: number;
}

export function newShip(index: number): Ship {
  return { x: W / 2 - SHIP_W / 2 + (index ? 40 : -40), y: H - 34, lives: LIVES, alive: true, inv: INVULNERABLE, shield: 0, level: 1, weapon: 'blaster', novas: 1, odT: 0, perks: noPerks(), cool: 0, droneCool: 0, firing: false };
}

export function newSwarm(): Swarm {
  return {
    wave: 0, bugs: [], shots: [], bombs: [], drops: [], t: 0, between: 1.5, nextId: 1, diveIn: 3, scores: [0, 0],
    blasts: [], kills: [], novas: [], combo: [0, 0], comboT: [0, 0], goldIn: Infinity, clean: true, meter: [0, 0], slowT: 0,
  };
}

const bug = (s: Swarm, b: Partial<Bug> & Pick<Bug, 'kind' | 'hp' | 'x' | 'y'>): Bug => ({
  id: s.nextId++, maxHp: b.hp, hx: 0, hy: 0, mode: 'dive', t: 0, sx: W / 2, sy: 0, side: 1, vx: 0, a1: 1.5, a2: 4, ...b,
});

/** Each wave's shape, in turn: a block, a V, a diamond, staggered rows. */
type Formation = 'grid' | 'vee' | 'diamond' | 'stagger';
const FORMATIONS: Formation[] = ['grid', 'vee', 'diamond', 'stagger'];

function spawnWave(s: Swarm, rnd: () => number) {
  s.wave += 1;
  s.clean = true;
  const n = s.wave;
  const boss = bossOf(n);
  const rows = boss ? 1 : Math.min(5, 2 + Math.floor((n + 1) / 2));
  const cols = n >= 7 && !boss ? 9 : 8;
  const tough = Math.floor(n / 5);
  const shape = FORMATIONS[(n - 1) % FORMATIONS.length];
  const gap = cols === 9 ? 25 : 26;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const mid = (cols - 1) / 2;
      if (shape === 'diamond' && Math.abs(c - mid) + Math.abs(r - (rows - 1) / 2) * 1.5 > mid + 0.5) continue;
      // What flies in this slot: wasps up top, then moths, beetles below —
      // with shells and fireflies mixed in as the waves go on.
      let kind: BugKind = boss ? 'wasp' : r === 0 && n >= 3 ? 'wasp' : r <= 1 && n >= 2 ? 'moth' : 'beetle';
      if (!boss && n >= 4 && r === rows - 1 && c % 3 === 1) kind = 'shell';
      if (!boss && n >= 3 && r === Math.min(1, rows - 1) && (c === 0 || c === cols - 1)) kind = 'firefly';
      if (!boss && n >= 5 && rows >= 3 && r === Math.floor(rows / 2) && c % 3 === 1) kind = 'splitter';
      const hp = (kind === 'moth' ? 2 : kind === 'shell' ? 4 : kind === 'splitter' ? 3 : 1) + tough;
      const side = c < cols / 2 ? -1 : 1;
      const hx = (W - (cols - 1) * gap) / 2 + c * gap - BUG_SIZE[kind].w / 2 + (shape === 'stagger' && r % 2 ? gap / 2 - (c === cols - 1 ? gap : 0) : 0);
      const hy = (boss ? 100 : 36) + r * 22 + (shape === 'vee' ? Math.abs(c - mid) * -5 + 18 : 0);
      s.bugs.push(bug(s, {
        kind, hp, x: -40, y: -40, hx, hy, mode: 'enter',
        t: -(r * 0.3 + (side < 0 ? c : cols - 1 - c) * 0.1), sx: side < 0 ? -30 : W + 10, sy: 90 + r * 10, side,
      }));
    }
  }
  if (boss) {
    // Each time round the four, a little tougher.
    const hp = 70 + n * 10;
    const { w } = BUG_SIZE[boss];
    s.bugs.push(bug(s, { kind: boss, hp, x: W / 2 - w / 2, y: -50, hx: W / 2 - w / 2, hy: 40, mode: 'enter', t: -0.5, a1: 2, a2: 5 }));
  }
  s.diveIn = 2;
  // Now and then a golden moth crosses, somewhere in the wave.
  s.goldIn = n >= 2 && rnd() < 0.4 ? 4 + rnd() * 10 : Infinity;
}

const ease = (k: number) => k * k * (3 - 2 * k);

// ── Weapons ─────────────────────────────────────────────────────────────────

/** What one pull of the trigger fires, by weapon and level. */
export function shotsFor(ship: Ship, owner: number): Shot[] {
  const x = ship.x + SHIP_W / 2 - 1, y = ship.y - 4;
  const lv = ship.level;
  const power = 1.3 ** ship.perks.power;
  const pierce = ship.perks.pierce;
  const shot = (dx: number, angle: number, kind: ShotKind, speed: number, dmg: number, life = 3): Shot => ({
    x: x + dx, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, owner, kind, dmg: dmg * power, life,
    ...(pierce && (kind === 'bolt' || kind === 'pellet') ? { pierce, hit: [] } : {}),
  });
  switch (ship.weapon) {
    case 'laser': {
      // Thin beams, very fast, through everything in their way.
      const lanes = [[0], [-3, 3], [-4, 0, 4], [-6, -2, 2, 6], [-8, -4, 0, 4, 8]][lv - 1];
      return lanes.map((dx) => ({ ...shot(dx, 0, 'beam', 520, 0.6), hit: [] }));
    }
    case 'rockets': {
      const n = [1, 2, 2, 3, 4][lv - 1];
      return Array.from({ length: n }, (_, i) => shot((i - (n - 1) / 2) * 6, (i - (n - 1) / 2) * 0.5, 'rocket', 110, 2));
    }
    case 'scatter': {
      const n = 4 + lv;
      const spread = 0.42 + lv * 0.04;
      return Array.from({ length: n }, (_, i) => shot(0, -spread + (2 * spread * i) / (n - 1), 'pellet', 300, 1, 0.55));
    }
    default: {
      const up = (dx: number, angle = 0) => shot(dx, angle, 'bolt', 330, 1);
      const a = 0.14;
      switch (lv) {
        case 1: return [up(0)];
        case 2: return [up(-3), up(3)];
        case 3: return [up(0), up(-2, -a), up(2, a)];
        case 4: return [up(-3), up(3), up(-4, -a), up(4, a)];
        default: return [up(0), up(-3), up(3), up(-4, -a * 1.6), up(4, a * 1.6)];
      }
    }
  }
}

export function fireDelay(ship: Pick<Ship, 'weapon' | 'level' | 'perks' | 'odT'>) {
  const base = ship.weapon === 'laser' ? 0.11 : ship.weapon === 'rockets' ? 0.62 - ship.level * 0.05 : ship.weapon === 'scatter' ? 0.45 - ship.level * 0.03 : 0.24 - ship.level * 0.015;
  return base * 0.82 ** ship.perks.rapid * (ship.odT > 0 ? 0.5 : 1);
}

/** Moves shots one step; a rocket turns toward the nearest bug in front of it. */
export function moveShots(shots: Shot[], bugs: { x: number; y: number; kind: BugKind }[], dt: number) {
  for (const s of shots) {
    if (s.kind === 'rocket') {
      let best: { x: number; y: number } | null = null, bestD = Infinity;
      for (const b of bugs) {
        const cx = b.x + BUG_SIZE[b.kind].w / 2, cy = b.y + BUG_SIZE[b.kind].h / 2;
        if (cy > s.y + 10) continue;
        const d = Math.hypot(cx - s.x, cy - s.y);
        if (d < bestD) { bestD = d; best = { x: cx, y: cy }; }
      }
      const speed = Math.min(280, Math.hypot(s.vx, s.vy) + 260 * dt);
      let angle = Math.atan2(s.vy, s.vx);
      if (best) {
        const want = Math.atan2(best.y - s.y, best.x - s.x);
        let turn = want - angle;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        angle += Math.max(-4.5 * dt, Math.min(4.5 * dt, turn));
      }
      s.vx = Math.cos(angle) * speed;
      s.vy = Math.sin(angle) * speed;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
}

export const shotBox = (s: Pick<Shot, 'x' | 'y' | 'kind'>) =>
  s.kind === 'beam' ? { x: s.x, y: s.y, w: 2, h: 12 } : s.kind === 'pellet' ? { x: s.x - 1, y: s.y - 1, w: 3, h: 3 } : s.kind === 'rocket' ? { x: s.x - 1.5, y: s.y - 2, w: 3, h: 5 } : { x: s.x, y: s.y, w: 2, h: 6 };
export const shotGone = (s: Shot) => s.y < -14 || s.y > H + 10 || s.x < -10 || s.x > W + 10 || s.life <= 0;

/** Moves a ship by what's held (keys) or toward a point (a finger), and counts down its timers. */
export function moveShip(ship: Ship, dt: number, keys: { dx: number; dy: number }, toward: { x: number; y: number } | null) {
  ship.inv = Math.max(0, ship.inv - dt);
  ship.shield = Math.max(0, ship.shield - dt);
  ship.cool = Math.max(0, ship.cool - dt);
  ship.droneCool = Math.max(0, ship.droneCool - dt);
  ship.odT = Math.max(0, ship.odT - dt);
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
  if (!ship.alive || ship.inv > 0 || ship.shield > 0 || ship.odT > 0) return false;
  ship.lives -= 1;
  ship.level = Math.max(1, ship.level - 1);
  ship.inv = INVULNERABLE;
  if (ship.lives <= 0) ship.alive = false;
  return true;
}

export function applyDrop(ship: Ship, kind: DropKind) {
  if (kind === 'gun') ship.level = Math.min(MAX_LEVEL, ship.level + 1);
  else if (kind === 'shield') ship.shield = SHIELD;
  else if (kind === 'life') ship.lives = Math.min(maxLives(ship), ship.lives + 1);
  else if (kind === 'nova') ship.novas = Math.min(maxNovas(ship), ship.novas + 1);
  else if (isWeapon(kind)) {
    if (ship.weapon === kind) ship.level = Math.min(MAX_LEVEL, ship.level + 1);
    else ship.weapon = kind;
  }
}

export const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const shipBox = (s: Ship) => ({ x: s.x + 2, y: s.y + 2, w: SHIP_W - 4, h: SHIP_H - 3 });
export const bugBox = (b: { kind: BugKind; x: number; y: number }) => {
  const { w, h } = BUG_SIZE[b.kind];
  // A boss is hit on its body, not the tips of its wings.
  return isBoss(b.kind) ? { x: b.x + 6, y: b.y + 4, w: w - 12, h: h - 6 } : { x: b.x, y: b.y, w, h };
};
export const bombBox = (b: { x: number; y: number; kind?: BombKind }) => (b.kind === 'orb' ? { x: b.x - 3, y: b.y - 3, w: 6, h: 6 } : { x: b.x - 2, y: b.y - 3, w: 4, h: 6 });
export const dropBox = (d: { x: number; y: number }) => ({ x: d.x - 7, y: d.y - 7, w: 14, h: 14 });

// ── The swarm ───────────────────────────────────────────────────────────────

/** One step of the swarm — the host's alone. `ships` are both players' (or one). */
export function stepSwarm(s: Swarm, ships: Ship[], dt: number, rnd: () => number = Math.random) {
  s.t += dt;
  const n = s.wave;

  // A clear sky: the next wave, after a breath.
  if (!s.bugs.length) {
    // A wave cleared: a bonus, doubled if nobody was hit.
    if (s.wave > 0 && s.between === 2.5) {
      const bonus = 50 * s.wave * (s.clean ? 2 : 1);
      for (const o of ships.map((_, i) => i)) { s.scores[o] += bonus; s.kills.push({ x: W / 2, y: H * 0.42, pts: bonus, owner: o }); }
      // A draft wave: a longer breath, to choose.
      if (isDraftWave(s.wave)) s.between = 7;
    }
    s.between -= dt;
    if (s.between <= 0) { spawnWave(s, rnd); s.between = 2.5; }
  }
  for (const o of [0, 1]) { s.comboT[o] -= dt; if (s.comboT[o] <= 0) s.combo[o] = 0; }
  s.slowT = Math.max(0, s.slowT - dt);

  const sway = Math.sin(s.t * 0.7) * 26;
  const targets = ships.filter((p) => p.alive);
  const aimAt = () => targets.length ? targets[Math.floor(rnd() * targets.length)] : null;
  const aimX = () => { const t = aimAt(); return t ? t.x + SHIP_W / 2 : W / 2; };

  // Now and then some peel off to dive — more at once as the waves go on.
  s.diveIn -= dt;
  if (s.diveIn <= 0) {
    s.diveIn = Math.max(0.45, 1.9 - n * 0.13) * (0.7 + rnd() * 0.6);
    for (let k = 0; k < 1 + Math.floor(n / 5); k++) {
      const home = s.bugs.filter((b) => b.mode === 'home' && !isBoss(b.kind) && b.kind !== 'golden' && b.kind !== 'shell');
      const b = home[Math.floor(rnd() * home.length)];
      if (b) { b.mode = 'dive'; b.t = -k * 0.3; b.sx = aimX(); b.vx = 0; }
    }
  }
  // A golden moth, crossing the top.
  s.goldIn -= dt;
  if (s.goldIn <= 0) {
    s.goldIn = Infinity;
    const fromLeft = rnd() < 0.5;
    s.bugs.push(bug(s, { kind: 'golden', hp: 3 + Math.floor(n / 5), x: fromLeft ? -20 : W + 4, y: 18, mode: 'home', side: fromLeft ? 1 : -1 }));
  }

  const bombSpeed = 85 + Math.min(90, n * 5);
  /** From wave 4 the formation aims at you — not perfectly. */
  const aimedDrop = (x: number, y: number) => {
    const t = n >= 4 ? aimAt() : null;
    if (!t) { fire(x, y, 0, bombSpeed); return; }
    const a = Math.atan2(t.y - y, t.x + SHIP_W / 2 - x) + (rnd() - 0.5) * 0.3;
    fire(x, y, Math.cos(a) * bombSpeed, Math.sin(a) * bombSpeed);
  };
  const fire = (x: number, y: number, vx: number, vy: number, kind: BombKind = 'larva') => s.bombs.push({ id: s.nextId++, x, y, vx, vy, kind });
  /** Aimed at a ship (or straight down), `spread` radians apart. */
  const aimed = (x: number, y: number, count: number, spread: number, speed: number, kind: BombKind) => {
    const t = aimAt();
    const base = t ? Math.atan2(t.y + SHIP_H / 2 - y, t.x + SHIP_W / 2 - x) : Math.PI / 2;
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      fire(x, y, Math.cos(a) * speed, Math.sin(a) * speed, kind);
    }
  };
  const escorts = (b: Bug, kind: BugKind, count: number) => {
    const { w } = BUG_SIZE[b.kind];
    for (let i = 0; i < count; i++) s.bugs.push(bug(s, { kind, hp: 1 + Math.floor(n / 10), x: b.x + 6 + (i * (w - 12)) / Math.max(1, count - 1), y: b.y + 20, t: -i * 0.25, sx: aimX() }));
  };

  for (const b of s.bugs) {
    b.t += dt;
    const size = BUG_SIZE[b.kind];
    if (isBoss(b.kind)) {
      if (b.t < 0) continue;
      const k = Math.min(1, b.t / 2);
      const cx = b.x + size.w / 2, low = b.y + size.h;
      if (k < 1) {
        b.x = W / 2 - size.w / 2;
        b.y = -50 + 90 * ease(k);
        continue;
      }
      b.mode = 'home';
      // Below half its health, a boss is enraged: it attacks faster, and adds a move.
      const rage = b.hp < b.maxHp / 2;
      b.a1 -= dt * (rage ? 1.6 : 1);
      b.a2 -= dt * (rage ? 1.3 : 1);
      const harder = Math.min(0.5, n * 0.012);
      const rageShot = () => { if (rage) aimed(cx, low, 3, 0.3, 120, 'sting'); };
      switch (b.kind) {
        case 'queen':
          // Sways wide; fans of larvae, and wasps to dive at you.
          b.x = W / 2 - size.w / 2 + Math.sin(s.t * 0.6) * 85;
          b.y = 40 + Math.sin(s.t * 1.4) * 8;
          if (b.a1 <= 0) { b.a1 = 1.6 - harder; for (let i = -2; i <= 2; i++) fire(cx, low, i * 32, bombSpeed); rageShot(); }
          if (b.a2 <= 0) { b.a2 = 6; escorts(b, 'wasp', 3); }
          break;
        case 'mantis': {
          // Darts side to side; aimed triple slashes; now and then swoops down.
          if (b.sy > 0) {
            // Mid-swoop: down toward where it aimed, then back up.
            b.sy -= dt;
            const p = 1 - b.sy / 1.6;
            b.x += (b.sx - size.w / 2 - b.x) * Math.min(1, dt * 3);
            b.y = 36 + Math.sin(p * Math.PI) * (H * 0.45);
          } else {
            b.x += (W / 2 - size.w / 2 + Math.sin(s.t * 1.3) * 95 - b.x) * Math.min(1, dt * 4);
            b.y = 36 + Math.sin(s.t * 2.2) * 6;
            if (b.a1 <= 0) { b.a1 = 1.9 - harder; aimed(cx, low, rage ? 5 : 3, 0.22, 135, 'blade'); }
            if (b.a2 <= 0) { b.a2 = rage ? 4.5 : 7; b.sy = 1.6; b.sx = aimX(); }
          }
          break;
        }
        case 'spider':
          // Hangs and drifts; rings of orbs all round, and spiderlings.
          b.x = W / 2 - size.w / 2 + Math.sin(s.t * 0.45) * 60;
          b.y = 34 + Math.sin(s.t * 0.9) * 14;
          if (b.a1 <= 0) {
            b.a1 = 2.6 - harder;
            const count = 12 + Math.floor(n / 10) * 2, turn = s.t;
            for (let i = 0; i < count; i++) { const a = turn + (i / count) * Math.PI * 2; fire(cx, b.y + size.h / 2, Math.cos(a) * 70, Math.sin(a) * 70, 'orb'); }
            // Enraged, a second ring, faster and offset, close behind.
            if (rage) for (let i = 0; i < count; i++) { const a = turn + ((i + 0.5) / count) * Math.PI * 2; fire(cx, b.y + size.h / 2, Math.cos(a) * 100, Math.sin(a) * 100, 'orb'); }
          }
          if (b.a2 <= 0) { b.a2 = 5; escorts(b, 'beetle', 2); }
          break;
        case 'hornet':
          // Zigzags fast; quick stingers aimed at you, and wasps.
          b.x = W / 2 - size.w / 2 + Math.sin(s.t * 1.7) * 90;
          b.y = 40 + Math.abs(Math.sin(s.t * 2.6)) * 30;
          if (b.a1 <= 0) { b.a1 = 1.3 - harder; aimed(cx, low, rage ? 3 : 2, 0.12, 175, 'sting'); }
          if (b.a2 <= 0) { b.a2 = 6; escorts(b, 'wasp', 3); }
          break;
      }
      continue;
    }
    if (b.kind === 'golden') {
      b.x += b.side * 75 * dt;
      b.y = 18 + Math.sin(b.t * 4) * 6;
      if (b.x < -30 || b.x > W + 30) b.hp = 0; // flown away
      continue;
    }
    if (b.kind === 'shell' && b.mode === 'home' && rnd() < (0.25 + n * 0.02) * dt) aimedDrop(b.x + size.w / 2, b.y + size.h);
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
        if (rnd() < (0.012 + n * 0.005) * dt * 2) aimedDrop(b.x + size.w / 2, b.y + size.h);
        break;
      case 'dive': {
        if (b.t < 0) break;
        if (b.kind === 'firefly') {
          // Hunts: straight at a ship, turning hard, faster as it comes.
          const t = targets[0] ? targets.reduce((p, q) => (Math.abs(q.x - b.x) < Math.abs(p.x - b.x) ? q : p)) : null;
          const tx = t ? t.x + SHIP_W / 2 : W / 2, ty = t ? t.y : H;
          const sp = 120 + Math.min(80, n * 4) + b.t * 40;
          const a = Math.atan2(ty - b.y, tx - (b.x + size.w / 2));
          b.vx += (Math.cos(a) * sp - b.vx) * Math.min(1, dt * 3);
          b.x += b.vx * dt;
          b.y += Math.max(60, Math.sin(a) * sp) * dt;
          if (b.y > H + 20) { b.mode = 'return'; b.t = 0; b.y = -20; }
          break;
        }
        const speed = 105 + Math.min(100, n * 6);
        // Steer toward where it was aimed; a moth weaves as it comes.
        const want = b.sx + (b.kind === 'moth' ? Math.sin(b.t * 5) * 40 : 0);
        b.vx += Math.sign(want - (b.x + size.w / 2)) * 220 * dt;
        b.vx = Math.max(-110, Math.min(110, b.vx));
        b.x += b.vx * dt;
        b.y += speed * dt;
        if (b.t > 0.35 && b.t - dt <= 0.35) fire(b.x + size.w / 2, b.y + size.h, b.vx * 0.3, bombSpeed);
        if (b.y > H + 20) {
          if (b.hx === 0 && b.hy === 0) { b.hp = 0; break; } // a boss's escort: gone
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
  moveShots(s.shots, s.bugs, dt);
  const live = (b: Bug) => b.hp > 0 && !(b.mode === 'enter' && b.t < 0);
  const kill = (b: Bug, owner: number) => {
    s.meter[owner] = Math.min(1, s.meter[owner] + (isBoss(b.kind) ? 0.5 : 0.035) * (1 + 0.4 * (ships[owner]?.perks.charge ?? 0)));
    s.combo[owner] = Math.min(99, s.combo[owner] + 1);
    s.comboT[owner] = COMBO_S;
    const pts = POINTS[b.kind] * (b.mode === 'dive' && !isBoss(b.kind) ? 2 : 1) * multiplier(s.combo[owner]);
    s.scores[owner] += pts;
    const cx = b.x + BUG_SIZE[b.kind].w / 2, cy = b.y + BUG_SIZE[b.kind].h / 2;
    s.kills.push({ x: cx, y: cy, pts, owner });
    if (b.kind === 'golden') {
      s.drops.push({ id: s.nextId++, kind: WEAPONS[1 + Math.floor(rnd() * 3)], x: cx - 10, y: cy });
      s.drops.push({ id: s.nextId++, kind: 'nova', x: cx + 10, y: cy });
      return;
    }
    // A splitter bursts into two mites that dive at you.
    if (b.kind === 'splitter') for (const dx of [-5, 5]) s.bugs.push(bug(s, { kind: 'mite', hp: 1, x: cx + dx - 4, y: cy - 4, sx: aimX(), t: 0 }));
    // Later on, a firefly bursts into bullets as it dies.
    if (b.kind === 'firefly' && n >= 8) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; fire(cx, cy, Math.cos(a) * 80, Math.sin(a) * 80, 'orb'); }
    if (isBoss(b.kind)) {
      s.drops.push({ id: s.nextId++, kind: WEAPONS[1 + Math.floor(rnd() * 3)], x: cx - 16, y: cy });
      s.drops.push({ id: s.nextId++, kind: 'life', x: cx + 16, y: cy });
      s.bombs = [];
      return;
    }
    const r = rnd();
    const kind: DropKind | null = r < 0.05 ? 'gun' : r < 0.08 ? WEAPONS[Math.floor(rnd() * WEAPONS.length)] : r < 0.1 ? 'shield' : r < 0.108 ? 'life' : r < 0.118 ? 'nova' : r < 0.128 ? 'time' : null;
    if (kind) s.drops.push({ id: s.nextId++, kind, x: cx, y: cy });
  };
  const damage = (b: Bug, dmg: number, owner: number) => {
    if (b.hp <= 0) return;
    b.hp -= dmg;
    if (b.hp <= 0) kill(b, owner);
  };
  for (const sh of s.shots) {
    if (shotGone(sh)) continue;
    const box = shotBox(sh);
    for (const b of s.bugs) {
      if (!live(b) || !overlap(box, bugBox(b))) continue;
      if (sh.kind === 'beam') {
        if (sh.hit!.includes(b.id)) continue;
        sh.hit!.push(b.id);
        damage(b, sh.dmg, sh.owner);
        continue;
      }
      if (sh.kind === 'rocket') {
        // Goes off: the bug it struck, and a little to everything near.
        s.blasts.push({ x: sh.x, y: sh.y });
        damage(b, sh.dmg, sh.owner);
        for (const o of s.bugs) {
          if (o === b || !live(o)) continue;
          const ox = o.x + BUG_SIZE[o.kind].w / 2, oy = o.y + BUG_SIZE[o.kind].h / 2;
          if (Math.hypot(ox - sh.x, oy - sh.y) < 20) damage(o, 1, sh.owner);
        }
      } else {
        if (sh.hit?.includes(b.id)) continue;
        damage(b, sh.dmg, sh.owner);
        // A piercing shot goes on through, as many bugs as it has left.
        if (sh.pierce) { sh.pierce -= 1; sh.hit!.push(b.id); continue; }
      }
      sh.life = 0;
      break;
    }
  }
  s.shots = s.shots.filter((sh) => !shotGone(sh));
  s.bugs = s.bugs.filter((b) => b.hp > 0);
  for (const list of [s.blasts, s.kills, s.novas]) if (list.length > 40) list.splice(0, list.length - 40);

  const crawl = s.slowT > 0 ? 0.4 : 1;
  for (const b of s.bombs) { b.x += b.vx * dt * crawl; b.y += b.vy * dt * crawl; }
  s.bombs = s.bombs.filter((b) => b.y < H + 10 && b.y > -20 && b.x > -10 && b.x < W + 10);
  for (const d of s.drops) d.y += DROP_SPEED * dt;
  s.drops = s.drops.filter((d) => d.y < H + 10);
}

/** A slow-mo capsule, picked up by anyone: the bugs' bullets crawl a while. */
export function slowMo(s: Swarm) { s.slowT = 5; }

/** Sets off `owner`'s overdrive, if their meter's full; true if it went. */
export function overdrive(s: Swarm, owner: number) {
  if (s.meter[owner] < 1) return false;
  s.meter[owner] = 0;
  return true;
}

/** A player was hit: their combo is broken, and the wave's no longer clean. */
export function noteHurt(s: Swarm, owner: number) {
  s.combo[owner] = 0;
  s.comboT[owner] = 0;
  s.clean = false;
}

/** A nova, set off by `owner` at (x, y): every bullet gone, every bug hurt — a
 *  boss by a slice of its health — and the kills are theirs. */
export function nova(s: Swarm, owner: number, x: number, y: number) {
  s.bombs = [];
  s.novas.push({ x, y, owner });
  for (const b of s.bugs) {
    // (A splitter caught in a nova just goes: no mites.)
    if (b.hp <= 0 || (b.mode === 'enter' && b.t < 0)) continue;
    b.hp -= isBoss(b.kind) ? b.maxHp * 0.08 : 4;
    if (b.hp <= 0) {
      s.combo[owner] = Math.min(99, s.combo[owner] + 1);
      s.comboT[owner] = COMBO_S;
      const pts = POINTS[b.kind] * multiplier(s.combo[owner]);
      s.scores[owner] += pts;
      s.kills.push({ x: b.x + BUG_SIZE[b.kind].w / 2, y: b.y + BUG_SIZE[b.kind].h / 2, pts, owner });
    }
  }
  // A boss survives a nova, however low it was.
  for (const b of s.bugs) if (isBoss(b.kind) && b.hp <= 0) b.hp = 1;
  s.bugs = s.bugs.filter((b) => b.hp > 0);
}

/** A bug rammed by a ship: gone, no points. Bosses shrug it off. */
export function crash(s: Swarm, id: number) {
  const b = s.bugs.find((x) => x.id === id);
  if (!b || isBoss(b.kind) || b.kind === 'golden') return;
  b.hp = 0;
  s.bugs = s.bugs.filter((x) => x.hp > 0);
}
