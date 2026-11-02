// 8-ball pool: the table's physics and the rules — pure, so the game screen,
// the other player's screen and the tests all play the same game.
//
// The table is 200 × 100 units (the cloth inside the cushions), the head
// string at x = 50, the rack's apex on the foot spot at x = 150. A shot is an
// angle and a power; `simulate` rolls it out in fixed steps and reports where
// everything ended up and what happened on the way (what the cue ball hit
// first, what went down), which is all the rules need.
//
// In a match the shooter's screen is the judge: it simulates, applies the
// rules, and sends the resulting state. The other screen replays the shot for
// show and then takes that state as it is, so the two tables can't drift.

export const TABLE_W = 200;
export const TABLE_H = 100;
export const BALL_R = 2.6;
export const POCKET_R = 5.2;
export const HEAD_X = 50;
export const FOOT_X = 150;
/** Top speed a full-power shot gives the cue ball, units per second. */
export const MAX_SPEED = 330;

const STEP = 1 / 240;
/** Rolling friction: speed lost per second. */
const FRICTION = 36;
const CUSHION = 0.78;
const BALL_BOUNCE = 0.96;
const STOP = 1.2;

export const POCKETS: readonly { x: number; y: number }[] = [
  { x: 0, y: 0 }, { x: TABLE_W / 2, y: -1.5 }, { x: TABLE_W, y: 0 },
  { x: 0, y: TABLE_H }, { x: TABLE_W / 2, y: TABLE_H + 1.5 }, { x: TABLE_W, y: TABLE_H },
];

export type Group = 'solids' | 'stripes';
export const groupOf = (id: number): Group | 'eight' | 'cue' =>
  id === 0 ? 'cue' : id === 8 ? 'eight' : id < 8 ? 'solids' : 'stripes';

export interface Ball { id: number; x: number; y: number; down: boolean }

export interface PoolState {
  balls: Ball[];
  /** Whose shot: 0 or 1 (solo: always 0). */
  turn: 0 | 1;
  /** Each player's group, once the table's been claimed. */
  groups: [Group | null, Group | null];
  /** The player to shoot may place the cue ball anywhere first. */
  inHand: boolean;
  /** Before the break, the cue ball goes behind the head string. */
  breaking: boolean;
  winner: 0 | 1 | null;
  /** Shots taken — also a match message's sequence number. */
  shots: number;
  /** What went wrong on the last shot, for the screen to say. */
  foul: Foul | null;
}

export type Foul = 'scratch' | 'noHit' | 'wrongFirst';

/** The rack: a triangle on the foot spot, the 8 in the middle, a solid and a stripe in the back corners. */
export function newGame(): PoolState {
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 15, 7];
  const balls: Ball[] = [{ id: 0, x: HEAD_X - 15, y: TABLE_H / 2, down: false }];
  const d = BALL_R * 2 + 0.05;
  let k = 0;
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i <= row; i++) {
      balls.push({ id: order[k++], x: FOOT_X + row * d * Math.cos(Math.PI / 6), y: TABLE_H / 2 + (i - row / 2) * d, down: false });
    }
  }
  return { balls, turn: 0, groups: [null, null], inHand: true, breaking: true, winner: null, shots: 0, foul: null };
}

export interface ShotResult {
  /** Positions every few steps, for drawing the shot as it happens. */
  frames: Ball[][];
  balls: Ball[];
  firstHit: number | null;
  /** In the order they dropped. */
  pocketed: number[];
}

/** Rolls a shot out to rest. `angle` in radians, `power` 0–1. */
export function simulate(balls: Ball[], angle: number, power: number, frameEvery = 4): ShotResult {
  const b = balls.map((x) => ({ ...x, vx: 0, vy: 0 }));
  const cue = b.find((x) => x.id === 0)!;
  const speed = Math.max(0, Math.min(1, power)) * MAX_SPEED;
  cue.vx = Math.cos(angle) * speed;
  cue.vy = Math.sin(angle) * speed;
  let firstHit: number | null = null;
  const pocketed: number[] = [];
  const frames: Ball[][] = [];
  const snap = () => b.map(({ id, x, y, down }) => ({ id, x, y, down }));

  for (let step = 0; step < 240 * 20; step++) {
    let moving = false;
    for (const p of b) {
      if (p.down) continue;
      const v = Math.hypot(p.vx, p.vy);
      if (v < STOP) { p.vx = 0; p.vy = 0; continue; }
      moving = true;
      const slow = Math.max(0, v - FRICTION * STEP) / v;
      p.vx *= slow; p.vy *= slow;
      p.x += p.vx * STEP; p.y += p.vy * STEP;
      // Into a pocket?
      if (POCKETS.some((k) => Math.hypot(p.x - k.x, p.y - k.y) < POCKET_R)) {
        p.down = true; p.vx = 0; p.vy = 0;
        pocketed.push(p.id);
        continue;
      }
      // Off a cushion (the jaws near a pocket let it through to drop).
      if (p.x < BALL_R) { p.x = BALL_R; p.vx = -p.vx * CUSHION; }
      if (p.x > TABLE_W - BALL_R) { p.x = TABLE_W - BALL_R; p.vx = -p.vx * CUSHION; }
      if (p.y < BALL_R) { p.y = BALL_R; p.vy = -p.vy * CUSHION; }
      if (p.y > TABLE_H - BALL_R) { p.y = TABLE_H - BALL_R; p.vy = -p.vy * CUSHION; }
    }
    // Ball on ball: equal masses, so along the line of centres they swap.
    for (let i = 0; i < b.length; i++) {
      const p = b[i];
      if (p.down) continue;
      for (let j = i + 1; j < b.length; j++) {
        const q = b[j];
        if (q.down) continue;
        const dx = q.x - p.x, dy = q.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= BALL_R * 2 || dist === 0) continue;
        const nx = dx / dist, ny = dy / dist;
        const rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
        // Push them apart either way, so they never sit inside each other.
        const overlap = (BALL_R * 2 - dist) / 2;
        p.x -= nx * overlap; p.y -= ny * overlap;
        q.x += nx * overlap; q.y += ny * overlap;
        if (rel <= 0) continue;
        if (firstHit === null && (p.id === 0 || q.id === 0)) firstHit = p.id === 0 ? q.id : p.id;
        const impulse = rel * BALL_BOUNCE;
        p.vx -= impulse * nx; p.vy -= impulse * ny;
        q.vx += impulse * nx; q.vy += impulse * ny;
        moving = true;
      }
    }
    if (step % frameEvery === 0) frames.push(snap());
    if (!moving) break;
  }
  frames.push(snap());
  return { frames, balls: snap(), firstHit, pocketed };
}

const left = (s: PoolState, g: Group) => s.balls.filter((b) => !b.down && groupOf(b.id) === g).length;

/** What the shooter must hit first: a ball of their group, the 8 once it's cleared, any (but the 8) on an open table. */
export function targetsFor(s: PoolState, player: 0 | 1): number[] {
  const g = s.groups[player];
  const up = s.balls.filter((b) => !b.down && b.id !== 0);
  if (!g) return up.filter((b) => b.id !== 8).map((b) => b.id);
  return left(s, g) > 0 ? up.filter((b) => groupOf(b.id) === g).map((b) => b.id) : [8];
}

/** Where the cue ball comes back to after a scratch, nudged off anything in the way. */
export function respot(balls: Ball[]): { x: number; y: number } {
  for (let dx = 0; dx < 60; dx += BALL_R) {
    const p = { x: HEAD_X - 15 + dx, y: TABLE_H / 2 };
    if (canPlace(balls, p, false)) return p;
  }
  return { x: HEAD_X - 15, y: TABLE_H / 2 };
}

/** Whether the cue ball may be placed here: on the cloth, clear of every ball, behind the head string on a break. */
export function canPlace(balls: Ball[], p: { x: number; y: number }, breaking: boolean): boolean {
  if (p.x < BALL_R || p.x > TABLE_W - BALL_R || p.y < BALL_R || p.y > TABLE_H - BALL_R) return false;
  if (breaking && p.x > HEAD_X) return false;
  return balls.every((b) => b.id === 0 || b.down || Math.hypot(b.x - p.x, b.y - p.y) >= BALL_R * 2 + 0.1);
}

export interface Ruling {
  state: PoolState;
  /** The shot was a foul the shooter may still save (by answering a question). */
  savable: boolean;
}

/**
 * The rules applied to a shot: who's on, who has the ball in hand, whose
 * group is whose, and whether that was the game. `players` is 2, or 1 for
 * solo practice (where fouls cost a shot and the game is clearing the table).
 */
export function rule(before: PoolState, shot: ShotResult, players: 1 | 2): Ruling {
  const me = before.turn;
  const them = (players === 2 ? 1 - me : me) as 0 | 1;
  const s: PoolState = { ...before, balls: shot.balls, groups: [...before.groups] as [Group | null, Group | null], shots: before.shots + 1, inHand: false, breaking: false, foul: null };
  const scratched = shot.pocketed.includes(0);
  const targets = targetsFor(before, me);
  let foul: Foul | null = null;
  if (scratched) foul = 'scratch';
  else if (shot.firstHit === null) foul = 'noHit';
  else if (!before.breaking && !targets.includes(shot.firstHit)) foul = 'wrongFirst';

  if (scratched) {
    const spot = respot(s.balls);
    s.balls = s.balls.map((b) => (b.id === 0 ? { ...b, ...spot, down: false } : b));
  }

  // The 8: in solo it's just the last ball; in a match it ends the game.
  if (shot.pocketed.includes(8)) {
    if (players === 1) {
      if (s.balls.some((b) => !b.down && b.id !== 0 && b.id !== 8)) {
        // Too early: back on the foot spot.
        s.balls = s.balls.map((b) => (b.id === 8 ? { ...b, x: FOOT_X, y: TABLE_H / 2, down: false } : b));
      } else {
        return { state: { ...s, winner: me, foul }, savable: false };
      }
    } else {
      const mine = before.groups[me];
      const cleared = !!mine && left(before, mine) === 0;
      return { state: { ...s, winner: cleared && !foul ? me : them, foul }, savable: false };
    }
  }

  if (players === 1) {
    if (s.balls.every((b) => b.id === 0 || b.down)) return { state: { ...s, winner: me }, savable: false };
    return { state: { ...s, foul, inHand: scratched }, savable: !!foul };
  }

  // Claiming the table: the first legal pot after the break decides.
  const potted = shot.pocketed.filter((id) => id !== 0 && id !== 8);
  if (!foul && !s.groups[me] && !before.breaking && potted.length) {
    const g = groupOf(potted[0]) as Group;
    s.groups[me] = g;
    s.groups[them] = g === 'solids' ? 'stripes' : 'solids';
  }

  if (foul) return { state: { ...s, foul, turn: them, inHand: true }, savable: true };

  const mineAfter = s.groups[me];
  const keepGoing = mineAfter ? potted.some((id) => groupOf(id) === mineAfter) : potted.length > 0;
  return { state: { ...s, turn: keepGoing ? me : them }, savable: false };
}

/**
 * A foul answered right: the shooter keeps the turn — with the ball in hand
 * if they'd scratched — instead of handing the table over.
 */
export function forgive(s: PoolState, shooter: 0 | 1): PoolState {
  return { ...s, turn: shooter, inHand: s.foul === 'scratch', foul: null };
}
