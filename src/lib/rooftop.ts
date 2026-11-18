// Rooftop Run: a side-scrolling platformer over Huế's rooftops, played by two
// together (or alone, for practice). This is the game itself — the level, the
// physics, the enemies — with no drawing and no network, so both players run
// the same rules. RooftopRun.tsx draws it and carries it between the two.
//
// Units are world pixels (a tile is 16) and seconds; everything steps at a
// fixed 60 Hz so a jump is the same height on every device.
//
// The co-op is in the level: a wall too high for one jump (stand still, and
// your partner can jump off your head), and gates that stay open only while
// someone stands on their plate. Alone, the gates stand open.

export const T = 16;
export const ROWS = 15;
export const STEP = 1 / 60;
export const LIVES = 5;
export const TIME_LIMIT = 300;

const RUN = 120;
const ACCEL_GROUND = 1000;
const ACCEL_AIR = 650;
const FRICTION = 1200;
const JUMP = 380;
const GRAVITY = 2100;
/** Lighter while rising with the button held: a tap hops, a hold jumps high. */
const GRAVITY_HELD = 1000;
const MAX_FALL = 430;
const COYOTE = 0.08;
const BUFFER = 0.12;
const STOMP_BOUNCE = 260;
const STOMP_BOUNCE_HELD = 400;
const SPRING = 560;
export const RESPAWN_S = 1.4;
const BOAT_SPEED = 32;

export const PLAYER_W = 12;
export const PLAYER_H = 20;

export type EnemyKind = 'walker' | 'hopper';
export interface Boat { x0: number; y: number; w: number; range: number }
export interface Level {
  w: number;
  tiles: string[];
  spawns: { x: number; y: number }[];
  enemies: { id: number; kind: EnemyKind; x: number; y: number }[];
  boats: Boat[];
  /** Plates and gates by tile index → the group that links them. */
  plates: Map<number, number>;
  gates: Map<number, number>;
  /** Where you come back, in order along the level; the first is the start. */
  checkpoints: { x: number; y: number }[];
  goalX: number;
}

// ── The level ───────────────────────────────────────────────────────────────

class Builder {
  cols: string[][] = [];
  start = 0;
  boats: Boat[] = [];
  plates = new Map<number, number>();
  gates = new Map<number, number>();
  private groupAt = new Map<string, number>();

  /** A stretch of roof `w` wide whose top is `top` (a row), or a gap with none. */
  seg(w: number, top: number | null, fill = '#') {
    this.start = this.cols.length;
    for (let i = 0; i < w; i++) {
      const col = Array<string>(ROWS).fill('.');
      if (top !== null) for (let r = top; r < ROWS; r++) col[r] = fill;
      this.cols.push(col);
    }
    return this;
  }
  pit(w: number) { return this.seg(w, null); }
  water(w: number) { return this.seg(w, ROWS - 2, '~'); }

  /** Lays `text` along `row`, from `dx` into the last stretch; spaces leave what's there. */
  put(dx: number, row: number, text: string) {
    [...text].forEach((ch, j) => { if (ch !== ' ') this.cols[this.start + dx + j][row] = ch; });
    return this;
  }
  column(dx: number, r0: number, r1: number, ch: string) {
    for (let r = r0; r <= r1; r++) this.cols[this.start + dx][r] = ch;
    return this;
  }
  fill(dx0: number, dx1: number, r0: number, r1: number, ch: string) {
    for (let dx = dx0; dx <= dx1; dx++) this.column(dx, r0, r1, ch);
    return this;
  }
  boat(dx: number, row: number, range: number) {
    this.boats.push({ x0: (this.start + dx) * T, y: row * T, w: 3 * T, range: range * T });
    return this;
  }
  plate(dx: number, row: number, group: number) {
    this.put(dx, row, 'P');
    this.groupAt.set(`${this.start + dx},${row}`, group);
    return this;
  }
  gate(dx: number, r0: number, r1: number, group: number) {
    this.column(dx, r0, r1, 'D');
    for (let r = r0; r <= r1; r++) this.groupAt.set(`${this.start + dx},${r}`, group);
    return this;
  }

  build(): Level {
    const w = this.cols.length;
    const tiles: string[] = Array(w * ROWS);
    const spawns: { x: number; y: number }[] = [];
    const enemies: Level['enemies'] = [];
    const checkpoints: { x: number; y: number }[] = [];
    let goalX = (w - 2) * T;
    for (let c = 0; c < w; c++) {
      for (let r = 0; r < ROWS; r++) {
        let ch = this.cols[c][r];
        const i = r * w + c;
        const feet = { x: c * T + (T - PLAYER_W) / 2, y: (r + 1) * T - PLAYER_H };
        if (ch === 'S') spawns[0] = feet;
        if (ch === 'U') spawns[1] = feet;
        if (ch === 'e' || ch === 'h') {
          const kind: EnemyKind = ch === 'e' ? 'walker' : 'hopper';
          const size = enemySize(kind);
          enemies.push({ id: enemies.length, kind, x: c * T + (T - size.w) / 2, y: (r + 1) * T - size.h });
        }
        if ('SUeh'.includes(ch)) ch = '.';
        if (ch === 'C') checkpoints.push(feet);
        if (ch === 'G') goalX = c * T + T / 2;
        if (ch === 'P') this.plates.set(i, this.groupAt.get(`${c},${r}`) ?? 0);
        if (ch === 'D') this.gates.set(i, this.groupAt.get(`${c},${r}`) ?? 0);
        tiles[i] = ch;
      }
    }
    return { w, tiles, spawns, enemies, boats: this.boats, plates: this.plates, gates: this.gates, checkpoints: [spawns[0], ...checkpoints], goalX };
  }
}

/** The one level: from the street, over the rooftops and the river, to the citadel's gate.
 *  Characters: # roof · B brick · ? lantern box · = balcony (stand on it from above) ·
 *  ^ spikes · ~ river · o coin · J spring · C checkpoint · P plate · D gate · G goal ·
 *  S/U where the two start · e beetle · h frog. */
export function buildLevel(): Level {
  const b = new Builder();
  // The street: lantern boxes to knock from below, the first beetle.
  b.seg(28, 13)
    .put(1, 12, 'S.U')
    .put(6, 9, '?')
    .put(10, 9, 'B?B?B')
    .put(11, 6, 'o.o')
    .put(18, 12, 'e')
    .put(21, 10, '===')
    .put(21, 8, 'ooo');
  // Rooftops over the lane: gaps to clear, roofs up and down.
  b.pit(2);
  b.seg(6, 11).put(1, 8, 'oooo');
  b.pit(3);
  b.seg(5, 9).put(1, 6, 'ooo');
  b.pit(2);
  b.seg(11, 12).put(3, 8, 'B?B').put(7, 11, 'e');
  b.seg(6, 10).put(2, 9, '^^');
  b.seg(5, 12).put(1, 11, 'C');
  // The river: sampans to ride across.
  b.water(20).boat(1, 11, 3).boat(7, 11, 3).boat(13, 11, 3).put(4, 7, 'ooo').put(11, 7, 'ooo');
  b.seg(9, 12).put(1, 11, 'C').put(6, 11, 'e');
  // The high wall: one lifts the other, who opens the tunnel from the top.
  b.seg(4, 12);
  b.seg(7, 7).fill(0, 6, 10, 11, '.').gate(0, 10, 11, 1).plate(3, 6, 1).put(1, 4, 'ooooo').put(3, 11, 'oo');
  b.seg(10, 12).put(2, 11, 'C').put(7, 11, 'h');
  // The gate: hold the plate so your partner can pass; they hold the far one for you.
  b.seg(14, 12).plate(2, 11, 2).gate(6, 6, 11, 2).column(6, 0, 5, 'B').plate(10, 11, 2).put(8, 8, 'ooo');
  // Balconies over spikes, a beetle, a spring to the high coins.
  b.pit(2);
  b.seg(18, 12).put(3, 11, '^^^^^^').put(2, 8, '========').put(3, 7, 'oooooo').put(11, 11, 'e').put(15, 11, 'J').column(15, 2, 4, 'o');
  b.seg(6, 12).put(1, 11, 'C').put(4, 11, 'h');
  // Up the steps, over the last gap, to the citadel gate.
  b.seg(2, 11); b.seg(2, 10); b.seg(2, 9); b.seg(2, 8).put(0, 5, 'oo');
  b.pit(4);
  b.seg(6, 11).put(3, 10, 'e');
  b.seg(22, 12).put(6, 11, 'G');
  return b.build();
}

// ── Bodies and the world they move in ──────────────────────────────────────

export interface Body { x: number; y: number; w: number; h: number; vx: number; vy: number; ground: boolean }
/** Something to stand on that moves: a boat, or your partner's head. */
export interface Platform { id: string; x: number; y: number; w: number; dx: number; dy: number }

export interface World {
  level: Level;
  /** Gate groups standing open this step. */
  open: Set<number>;
  solo: boolean;
  platforms: Platform[];
}

export const tileAt = (lv: Level, c: number, r: number) => (r < 0 || r >= ROWS || c < 0 || c >= lv.w ? '.' : lv.tiles[r * lv.w + c]);

export function solidAt(w: World, c: number, r: number) {
  const lv = w.level;
  if (c < 0 || c >= lv.w) return true;
  if (r < 0 || r >= ROWS) return false;
  const ch = lv.tiles[r * lv.w + c];
  if (ch === '#' || ch === 'B' || ch === '?' || ch === 'X' || ch === 'J') return true;
  if (ch === 'D') return !w.open.has(lv.gates.get(r * lv.w + c) ?? 0);
  return false;
}

/** Where a boat is `t` seconds in: along its stretch and back. */
export function boatX(b: Boat, t: number) {
  const d = (t * BOAT_SPEED) % (2 * b.range);
  return b.x0 + (d < b.range ? d : 2 * b.range - d);
}

export function boatPlatforms(lv: Level, t: number): Platform[] {
  return lv.boats.map((b, i) => {
    const x = boatX(b, t);
    return { id: `boat${i}`, x, y: b.y, w: b.w, dx: x - boatX(b, t - STEP), dy: 0 };
  });
}

/** Moves sideways, stopping at walls. True if it hit one. */
function moveX(w: World, b: Body, dx: number) {
  b.x += dx;
  const top = Math.floor(b.y / T);
  const bottom = Math.floor((b.y + b.h - 0.01) / T);
  if (dx > 0) {
    const c = Math.floor((b.x + b.w - 0.01) / T);
    for (let r = top; r <= bottom; r++) if (solidAt(w, c, r)) { b.x = c * T - b.w; b.vx = 0; return true; }
  } else if (dx < 0) {
    const c = Math.floor(b.x / T);
    for (let r = top; r <= bottom; r++) if (solidAt(w, c, r)) { b.x = (c + 1) * T; b.vx = 0; return true; }
  }
  return false;
}

interface YResult { landedOn: string | null; bumped: number | null; tile: string | null }

/** Moves up or down: landing on roofs, balconies and platforms, bumping heads on what's above. */
function moveY(w: World, b: Body, dy: number, platforms: Platform[]): YResult {
  const out: YResult = { landedOn: null, bumped: null, tile: null };
  const prevBottom = b.y + b.h;
  b.y += dy;
  const left = Math.floor(b.x / T);
  const right = Math.floor((b.x + b.w - 0.01) / T);
  const lv = w.level;
  if (dy > 0) {
    const r = Math.floor((b.y + b.h - 0.01) / T);
    for (let c = left; c <= right; c++) {
      const oneWay = tileAt(lv, c, r) === '=' && prevBottom <= r * T + 0.5;
      if (solidAt(w, c, r) || oneWay) {
        b.y = r * T - b.h; b.vy = 0; b.ground = true;
        // The tile under the middle of the feet, or under whichever foot is on something.
        const mid = Math.floor((b.x + b.w / 2) / T);
        out.tile = solidAt(w, mid, r) || tileAt(lv, mid, r) === '=' ? tileAt(lv, mid, r) : tileAt(lv, c, r);
        return out;
      }
    }
    for (const p of platforms) {
      if (prevBottom <= p.y + 0.5 && b.y + b.h >= p.y && b.x + b.w > p.x && b.x < p.x + p.w) {
        b.y = p.y - b.h; b.vy = 0; b.ground = true; out.landedOn = p.id;
        return out;
      }
    }
  } else if (dy < 0) {
    const r = Math.floor(b.y / T);
    for (let c = left; c <= right; c++) {
      if (solidAt(w, c, r)) {
        b.y = (r + 1) * T; b.vy = 0;
        const mid = Math.floor((b.x + b.w / 2) / T);
        const hit = solidAt(w, mid, r) ? mid : c;
        out.bumped = r * lv.w + hit;
        return out;
      }
    }
  }
  return out;
}

// ── The player ──────────────────────────────────────────────────────────────

export interface Input { left: boolean; right: boolean; jump: boolean }

export interface Player extends Body {
  facing: 1 | -1;
  coyote: number;
  buffer: number;
  wasJump: boolean;
  /** What it's standing on that moves, carried along with it. */
  on: string | null;
  /** Seconds since it died; 0 while alive. */
  dead: number;
  /** Reached the goal: done, waiting for the partner. */
  goal: boolean;
  deaths: number;
  /** The furthest checkpoint reached. */
  cp: number;
  /** Seconds of running, for the leg animation. */
  run: number;
}

export function newPlayer(at: { x: number; y: number }): Player {
  return { x: at.x, y: at.y, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, ground: false, facing: 1, coyote: 0, buffer: 0, wasJump: false, on: null, dead: 0, goal: false, deaths: 0, cp: 0, run: 0 };
}

export type PlayerEvent = { kind: 'jump' } | { kind: 'spring' } | { kind: 'bump'; tile: number };

/** One step of a live player: run, jump, fall, land. */
export function stepPlayer(p: Player, input: Input, w: World, dt: number): PlayerEvent[] {
  const ev: PlayerEvent[] = [];
  const pressed = input.jump && !p.wasJump;
  p.wasJump = input.jump;
  if (p.goal) input = { left: false, right: false, jump: false };

  // Carried by whatever it stood on last step.
  const carrier = p.on ? w.platforms.find((q) => q.id === p.on) : undefined;
  if (carrier) { moveX(w, p, carrier.dx); p.y += carrier.dy; }

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir) {
    p.facing = dir as 1 | -1;
    const a = p.ground ? ACCEL_GROUND : ACCEL_AIR;
    p.vx += Math.sign(dir * RUN - p.vx) * Math.min(Math.abs(dir * RUN - p.vx), a * dt);
  } else if (p.ground) {
    p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), FRICTION * dt);
  }
  p.run = p.ground && Math.abs(p.vx) > 10 ? p.run + dt : 0;

  p.coyote = p.ground ? COYOTE : p.coyote - dt;
  p.buffer = pressed ? BUFFER : p.buffer - dt;
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -JUMP; p.buffer = 0; p.coyote = 0; p.ground = false; p.on = null;
    ev.push({ kind: 'jump' });
  }
  p.vy = Math.min(p.vy + (p.vy < 0 && input.jump ? GRAVITY_HELD : GRAVITY) * dt, MAX_FALL);

  moveX(w, p, p.vx * dt);
  p.ground = false;
  p.on = null;
  const y = moveY(w, p, p.vy * dt, w.platforms);
  p.on = y.landedOn;
  if (y.bumped !== null) ev.push({ kind: 'bump', tile: y.bumped });
  if (y.tile === 'J') { p.vy = -SPRING; p.ground = false; ev.push({ kind: 'spring' }); }
  return ev;
}

/** A dead player: up, then down off the screen, through everything. */
export function stepDead(p: Player, dt: number) {
  p.dead += dt;
  if (p.dead < 0.35) return;
  p.vy = Math.min(p.vy + GRAVITY * 0.6 * dt, MAX_FALL);
  p.y += p.vy * dt;
}

export function kill(p: Player) {
  if (p.dead) return;
  p.dead = 1e-6; p.vx = 0; p.vy = -320; p.deaths += 1; p.on = null;
}

export function respawn(p: Player, at: { x: number; y: number }) {
  Object.assign(p, { x: at.x, y: at.y, vx: 0, vy: 0, dead: 0, on: null, ground: false });
}

/** Spikes, the river, or off the bottom. */
export function hurts(w: World, b: Body) {
  if (b.y > ROWS * T + 8) return true;
  const lv = w.level;
  const left = Math.floor((b.x + 2) / T), right = Math.floor((b.x + b.w - 2) / T);
  const top = Math.floor(b.y / T), bottom = Math.floor((b.y + b.h - 1) / T);
  for (let c = left; c <= right; c++) {
    for (let r = top; r <= bottom; r++) {
      const ch = tileAt(lv, c, r);
      if (ch === '^' && b.y + b.h > r * T + 9) return true;
      if (ch === '~' && b.y + b.h > r * T + 6) return true;
    }
  }
  return false;
}

/** Coins the body is touching, as tile indexes. */
export function coinsTouched(lv: Level, b: Body): number[] {
  const out: number[] = [];
  const left = Math.floor((b.x + 1) / T), right = Math.floor((b.x + b.w - 1) / T);
  const top = Math.floor((b.y + 1) / T), bottom = Math.floor((b.y + b.h - 1) / T);
  for (let c = left; c <= right; c++) for (let r = top; r <= bottom; r++) if (tileAt(lv, c, r) === 'o') out.push(r * lv.w + c);
  return out;
}

/** The plate under this body's feet, if it's standing on one. */
export function plateUnder(lv: Level, b: Body): number | null {
  if (!b.ground) return null;
  const c = Math.floor((b.x + b.w / 2) / T);
  const r = Math.floor((b.y + b.h - 1) / T);
  const i = r * lv.w + c;
  return lv.plates.has(i) ? i : null;
}

// ── Enemies ─────────────────────────────────────────────────────────────────

export interface Enemy extends Body { id: number; kind: EnemyKind; dir: 1 | -1; alive: boolean; timer: number }

export const enemySize = (k: EnemyKind) => (k === 'walker' ? { w: 14, h: 11 } : { w: 14, h: 12 });

export function newEnemies(lv: Level): Enemy[] {
  return lv.enemies.map((e) => ({ ...e, ...enemySize(e.kind), vx: 0, vy: 0, ground: false, dir: -1, alive: true, timer: 0.6 + (e.id % 3) * 0.4 }));
}

/** A beetle walks and turns at walls and edges; a frog waits, then leaps. Only the host runs these. */
export function stepEnemy(e: Enemy, w: World, dt: number) {
  if (!e.alive) return;
  if (e.kind === 'walker') {
    e.vx = e.dir * 30;
    if (e.ground) {
      // An edge ahead: turn rather than walk off.
      const ahead = Math.floor((e.dir > 0 ? e.x + e.w + 1 : e.x - 1) / T);
      const below = Math.floor((e.y + e.h + 1) / T);
      if (!solidAt(w, ahead, below) && tileAt(w.level, ahead, below) !== '=') e.dir = (-e.dir) as 1 | -1;
    }
  } else {
    if (e.ground) {
      e.vx = 0;
      e.timer -= dt;
      if (e.timer <= 0) { e.vy = -300; e.vx = e.dir * 55; e.ground = false; e.timer = 1.6; }
    }
  }
  e.vy = Math.min(e.vy + GRAVITY * 0.8 * dt, MAX_FALL);
  if (moveX(w, e, e.vx * dt)) e.dir = (-e.dir) as 1 | -1;
  const wasAir = !e.ground;
  e.ground = false;
  moveY(w, e, e.vy * dt, []);
  // A frog turns round after each leap, so it guards its patch of roof.
  if (e.kind === 'hopper' && wasAir && e.ground) e.dir = (-e.dir) as 1 | -1;
  if (e.y > ROWS * T + 8 || hurts(w, e)) e.alive = false;
}

export const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** A player meeting an enemy: landing on it (stomp), or hurt by it. */
export function meet(p: Player, prevBottom: number, e: { x: number; y: number; w: number; h: number }, jumpHeld: boolean): 'stomp' | 'hurt' | null {
  const shrunk = { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 2 };
  if (!overlap(p, shrunk)) return null;
  if (p.vy > 0 && prevBottom <= e.y + 6) {
    p.vy = -(jumpHeld ? STOMP_BOUNCE_HELD : STOMP_BOUNCE);
    p.on = null;
    return 'stomp';
  }
  return 'hurt';
}
