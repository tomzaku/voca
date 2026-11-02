// Foosball (bi lắc), you against the computer — the table's physics and the
// computer's play, pure, so the screen and the tests run the same match.
//
// The pitch is 120 × 70 units, goals in the middle of each end. Eight rods
// cross it, alternating sides as on a real table — from the left: your
// goalie, your two defenders, their three attackers, your five midfielders,
// their five, your three attackers, their two defenders, their goalie. You
// defend the left goal.
//
// You don't pick a rod: every one of your rods slides so that its player
// nearest your pointer lines up with it, and a kick swings all your rods at
// once — the one by the ball is the one that strikes. The computer plays the
// same way, its pointer chasing the ball a little late and a little off,
// more so on easy.

export const W = 120;
export const H = 70;
export const GOAL = 26;
export const BALL_R = 1.6;
/** A player's foot: how far it reaches either side of its rod, and up/down from its centre. */
export const FOOT_X = 4;
export const FOOT_Y = 2.6;
export const WIN_SCORE = 5;

const STEP = 1 / 120;
const FRICTION = 0.35;          // fraction of speed lost per second, rolling on the cloth
const WALL = 0.85;
const KICK_MS = 170;
const KICK_SPEED = 150;
const POWER_SPEED = 240;
/** How far a rod can slide per second. */
const ROD_SPEED = 120;

export type Side = 'you' | 'cpu';
export type Level = 'easy' | 'normal' | 'hard';

export interface Rod {
  x: number;
  side: Side;
  /** Each player's place along the rod when it's centred. */
  men: number[];
  /** How far the rod is slid from centre. */
  offset: number;
  /** The rod's travel: men never leave the pitch. */
  min: number;
  max: number;
}

export interface FoosState {
  ball: { x: number; y: number; vx: number; vy: number };
  rods: Rod[];
  score: { you: number; cpu: number };
  /** Kicks in progress: the time (ms of play) each side's swing ends. */
  kickUntil: { you: number; cpu: number };
  /** Ms of play so far — what kicks and the computer's timing count in. */
  t: number;
  /** Set for a moment after a goal; the screen pauses for the kick-off. */
  scored: Side | null;
  /** Who takes the next kick-off (the side that conceded). */
  kickoff: Side;
  /** Your power shots left (earned with right answers); one is spent on a kick while armed. */
  power: number;
  /** A power shot is armed for your next kick. */
  armed: boolean;
  /** How long the ball has hardly moved — a stuck ball is nudged free. */
  still: number;
  /** How far off the computer's aim is just now, and when it next changes its mind. */
  cpuErr: number;
  cpuErrUntil: number;
  winner: Side | null;
}

const LAYOUT: [Side, number][] = [['you', 1], ['you', 2], ['cpu', 3], ['you', 5], ['cpu', 5], ['you', 3], ['cpu', 2], ['cpu', 1]];
const SPACING: Record<number, number> = { 1: 0, 2: 24, 3: 20, 5: 13 };

function makeRod(i: number): Rod {
  const [side, n] = LAYOUT[i];
  const s = SPACING[n];
  const men = Array.from({ length: n }, (_, k) => H / 2 + (k - (n - 1) / 2) * s);
  const edge = FOOT_Y + 1;
  // The goalie keeps to its goal mouth; the others may reach the side walls.
  const reach = n === 1 ? GOAL / 2 + 2 : H / 2 - edge - ((n - 1) / 2) * s;
  return { x: 7 + i * ((W - 14) / 7), side, men, offset: 0, min: -reach, max: reach };
}

export function newMatch(kickoff: Side = 'you'): FoosState {
  return {
    ball: kickoffBall(kickoff),
    rods: LAYOUT.map((_, i) => makeRod(i)),
    score: { you: 0, cpu: 0 },
    kickUntil: { you: 0, cpu: 0 },
    t: 0,
    scored: null,
    kickoff,
    power: 0,
    armed: false,
    still: 0,
    cpuErr: 0,
    cpuErrUntil: 0,
    winner: null,
  };
}

/** The ball dropped in the middle, rolling gently towards the side that kicks off. */
function kickoffBall(side: Side) {
  return { x: W / 2, y: H / 2, vx: side === 'you' ? -28 : 28, vy: 0 };
}

/** Back to the middle after a goal, the side that conceded to kick off. */
export function restart(s: FoosState): FoosState {
  return { ...s, ball: kickoffBall(s.kickoff), scored: null, still: 0, kickUntil: { you: 0, cpu: 0 } };
}

const menOf = (r: Rod) => r.men.map((m) => m + r.offset);

/** Slides a rod so its player nearest `y` heads for `y`, as fast as a rod moves. */
function steer(r: Rod, y: number, dt: number): Rod {
  const men = menOf(r);
  let best = men[0];
  for (const m of men) if (Math.abs(m - y) < Math.abs(best - y)) best = m;
  const want = Math.max(r.min, Math.min(r.max, r.offset + (y - best)));
  const max = ROD_SPEED * dt;
  return { ...r, offset: r.offset + Math.max(-max, Math.min(max, want - r.offset)) };
}

export interface Input {
  /** Where your pointer is, up the pitch (0–H). */
  y: number;
  /** A kick was pressed this step. */
  kick: boolean;
}

/**
 * The computer's play. Its aim is off by an amount that holds for a moment and
 * then changes — like a person a little off, not jitter that averages out to
 * perfect — and its rods are slower than yours.
 */
const CPU: Record<Level, { error: number; hold: number; reach: number; speed: number }> = {
  easy: { error: 10, hold: 700, reach: 4, speed: 0.45 },
  normal: { error: 6, hold: 500, reach: 5, speed: 0.6 },
  hard: { error: 4.5, hold: 400, reach: 6, speed: 0.72 },
};

/**
 * One step of play. `rand` is the computer's dice (its aim error), so a test
 * can play the same match twice.
 */
export function step(s: FoosState, input: Input, level: Level, rand: () => number = Math.random, dt = STEP): FoosState {
  if (s.scored || s.winner) return s;
  const t = s.t + dt * 1000;
  const cfg = CPU[level];
  let { kickUntil, armed, power } = s;
  if (input.kick && t > kickUntil.you) kickUntil = { ...kickUntil, you: t + KICK_MS };

  // The computer: follows the ball, off by its current error, and kicks when
  // the ball is in front of one of its players.
  let { cpuErr, cpuErrUntil } = s;
  if (t >= cpuErrUntil) { cpuErr = (rand() - 0.5) * 2 * cfg.error; cpuErrUntil = t + cfg.hold * (0.6 + rand() * 0.8); }
  const cpuY = Math.max(0, Math.min(H, s.ball.y + cpuErr));
  const cpuNear = s.rods.some((r) => r.side === 'cpu' && s.ball.x < r.x + 1 && s.ball.x > r.x - cfg.reach
    && menOf(r).some((m) => Math.abs(m - s.ball.y) < FOOT_Y + BALL_R + 0.5));
  if (cpuNear && t > kickUntil.cpu + 250) kickUntil = { ...kickUntil, cpu: t + KICK_MS };

  const rods = s.rods.map((r) => (r.side === 'you'
    ? steer(r, input.y, dt)
    : steer(r, cpuY, dt * cfg.speed)));

  // The ball rolls, slowing on the cloth.
  const b = { ...s.ball };
  const slow = Math.max(0, 1 - FRICTION * dt);
  b.vx *= slow; b.vy *= slow;
  b.x += b.vx * dt; b.y += b.vy * dt;

  // Side walls.
  if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy) * WALL; }
  if (b.y > H - BALL_R) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy) * WALL; }

  // Ends: a goal through the mouth, the end wall either side of it.
  const inMouth = Math.abs(b.y - H / 2) < GOAL / 2 - BALL_R * 0.5;
  if (b.x < 0 && inMouth) return goal(s, 'cpu', rods, t, power);
  if (b.x > W && inMouth) return goal(s, 'you', rods, t, power);
  if (b.x < BALL_R && !inMouth) { b.x = BALL_R; b.vx = Math.abs(b.vx) * WALL; }
  if (b.x > W - BALL_R && !inMouth) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx) * WALL; }

  // The players' feet: a swinging foot strikes the ball towards the other
  // goal, angled by where on the foot it caught it; a still one blocks a ball
  // coming at its goal.
  for (const r of rods) {
    if (Math.abs(b.x - r.x) > FOOT_X + BALL_R) continue;
    for (const m of menOf(r)) {
      const dy = b.y - m;
      if (Math.abs(dy) > FOOT_Y + BALL_R) continue;
      const dir = r.side === 'you' ? 1 : -1;
      const kicking = t < kickUntil[r.side];
      if (kicking) {
        const isPower = r.side === 'you' && armed && power > 0;
        const speed = isPower ? POWER_SPEED : KICK_SPEED;
        if (isPower) { power -= 1; armed = false; }
        const angle = (dy / (FOOT_Y + BALL_R)) * 0.8;
        b.vx = dir * speed * Math.cos(angle);
        b.vy = speed * Math.sin(angle);
        b.x = r.x + dir * (FOOT_X + BALL_R + 0.1);
        // One strike per swing.
        kickUntil = { ...kickUntil, [r.side]: t };
      } else {
        // A still foot only blocks a ball heading for its own goal — your
        // players let your own shots through, as you'd lift the rod.
        const towardsOwnGoal = r.side === 'you' ? b.vx < 0 : b.vx > 0;
        if (!towardsOwnGoal) continue;
        // Bounce off the side of the foot it came from.
        const from = b.x < r.x ? -1 : 1;
        b.x = r.x + from * (FOOT_X + BALL_R + 0.05);
        b.vx = from * Math.abs(b.vx) * 0.6;
        b.vy += dy * 0.8;
      }
    }
  }

  // A ball that's stopped where nobody can reach it gets a nudge.
  const speed = Math.hypot(b.vx, b.vy);
  let still = speed < 5 ? s.still + dt : 0;
  if (still > 0.9) {
    // A firm push in a random direction — never a dud.
    const a = rand() * Math.PI * 2;
    b.vx = Math.cos(a) * 18;
    b.vy = Math.sin(a) * 18;
    still = 0;
  }

  return { ...s, t, ball: b, rods, kickUntil, armed, power, still, cpuErr, cpuErrUntil };
}

function goal(s: FoosState, by: Side, rods: Rod[], t: number, power: number): FoosState {
  const score = { ...s.score, [by]: s.score[by] + 1 };
  const winner = score[by] >= WIN_SCORE ? by : null;
  return {
    ...s, t, rods, power, score, scored: by, winner,
    kickoff: by === 'you' ? 'cpu' : 'you',
    ball: { ...s.ball, vx: 0, vy: 0 },
  };
}

/** Arms a power shot for your next kick, if you have one. */
export function arm(s: FoosState): FoosState {
  return s.power > 0 ? { ...s, armed: !s.armed } : s;
}

/** A right answer before kick-off: one more power shot. */
export function earnPower(s: FoosState): FoosState {
  return { ...s, power: s.power + 1 };
}

export { menOf };
