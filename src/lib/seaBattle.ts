// Sea Battle's rules, with no UI attached — the pencil-and-paper ship game.
// Each player hides a fleet on their own 8×8 sea, ships straight across or
// down and never touching (not even at a corner). Then you take turns firing
// at a square of the other's sea; they say miss, hit, or sunk (and which
// ship). A hit earns another shot — the turn only passes on a miss. Whoever
// loses every ship first loses.
//
// A fleet never leaves its owner's device: the other side only ever learns
// what a shot tells them, and the whole fleet once the game is over.

export const SEA = 8;
/** The fleet, longest first: a battleship, two cruisers, two boats. */
export const FLEET = [4, 3, 3, 2, 2] as const;

export interface Ship {
  size: number;
  /** The square of its bow — its top or left end. */
  at: number;
  down: boolean;
}

/** What a shot found. `sunk` is the whole ship's squares when it went down. */
export interface ShotResult { cell: number; hit: boolean; sunk: number[] | null; lost: boolean }

const rowOf = (i: number) => Math.floor(i / SEA);
const colOf = (i: number) => i % SEA;

/** A ship's squares, or null when it runs off the sea. */
export function shipCells(s: Ship): number[] | null {
  const r = rowOf(s.at), c = colOf(s.at);
  if (s.at < 0 || s.at >= SEA * SEA || (s.down ? r + s.size > SEA : c + s.size > SEA)) return null;
  return Array.from({ length: s.size }, (_, k) => (s.down ? s.at + k * SEA : s.at + k));
}

/** The squares touching `i`, corners too. */
function around(i: number): number[] {
  const r = rowOf(i), c = colOf(i), out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < SEA && cc >= 0 && cc < SEA) out.push(rr * SEA + cc);
  }
  return out;
}

/** Whether `ship` fits on the sea without touching any of `others`. */
export function canPlace(ship: Ship, others: Ship[]): boolean {
  const cells = shipCells(ship);
  if (!cells) return false;
  const taken = new Set(others.flatMap((o) => shipCells(o) ?? []));
  return cells.every((i) => around(i).every((j) => !taken.has(j)));
}

/** Where `ship` fits nearest to where it is now, without touching `others`
 *  — at most `reach` squares away (rows plus columns), or null if nowhere.
 *  So a turn or a drop that's blocked slides over instead of failing. */
export function nearestFit(ship: Ship, others: Ship[], reach = SEA * 2): Ship | null {
  const r0 = rowOf(ship.at), c0 = colOf(ship.at);
  let best: Ship | null = null, bestD = Infinity;
  for (let at = 0; at < SEA * SEA; at++) {
    const d = Math.abs(rowOf(at) - r0) + Math.abs(colOf(at) - c0);
    if (d > reach || d >= bestD) continue;
    const s = { ...ship, at };
    if (canPlace(s, others)) { best = s; bestD = d; }
  }
  return best;
}

/** A ship moved so its square `grab` (0 = bow) sits on `cell`, kept on the sea. */
export function dragTo(ship: Ship, grab: number, cell: number): Ship {
  const r = Math.min(Math.max(rowOf(cell) - (ship.down ? grab : 0), 0), SEA - (ship.down ? ship.size : 1));
  const c = Math.min(Math.max(colOf(cell) - (ship.down ? 0 : grab), 0), SEA - (ship.down ? 1 : ship.size));
  return { ...ship, at: r * SEA + c };
}

/** A whole fleet, placed at random. */
export function randomFleet(rand: () => number = Math.random): Ship[] {
  // Retrying from scratch is rare on an 8×8 sea, and always ends.
  for (;;) {
    const fleet: Ship[] = [];
    for (const size of FLEET) {
      let placed = false;
      for (let t = 0; t < 200 && !placed; t++) {
        const ship = { size, at: Math.floor(rand() * SEA * SEA), down: rand() < 0.5 };
        if (canPlace(ship, fleet)) { fleet.push(ship); placed = true; }
      }
      if (!placed) break;
    }
    if (fleet.length === FLEET.length) return fleet;
  }
}

/** Whether a fleet is the full set, all on the sea, none touching. */
export function fleetReady(fleet: Ship[]): boolean {
  const sizes = fleet.map((s) => s.size).sort((a, b) => b - a);
  if (sizes.join() !== [...FLEET].join()) return false;
  return fleet.every((s, k) => canPlace(s, fleet.filter((_, j) => j !== k)));
}

/** A shot at my fleet, given every square shot at before it. */
export function takeShot(fleet: Ship[], shotAt: Set<number>, cell: number): ShotResult {
  const hitShip = fleet.find((s) => shipCells(s)?.includes(cell));
  if (!hitShip) return { cell, hit: false, sunk: null, lost: false };
  const after = new Set(shotAt).add(cell);
  const cells = shipCells(hitShip) ?? [];
  const sunk = cells.every((i) => after.has(i)) ? cells : null;
  const lost = fleet.every((s) => (shipCells(s) ?? []).every((i) => after.has(i)));
  return { cell, hit: true, sunk, lost };
}

/** Who fires next, given the shots so far in order: the first player to
 *  start, then whoever fired last again after a hit, the other after a miss. */
export function firesNext<T>(shots: { by: T; hit: boolean }[], first: T, second: T): T {
  const last = shots[shots.length - 1];
  if (!last) return first;
  return last.hit ? last.by : last.by === first ? second : first;
}

/** A fleet as it arrives from the other player, or null if it isn't one. */
export function parseFleet(raw: unknown): Ship[] | null {
  if (!Array.isArray(raw)) return null;
  const fleet = raw.map((s) => (s && typeof s === 'object' ? s as Record<string, unknown> : {}))
    .map((s) => ({ size: Number(s.size), at: Number(s.at), down: s.down === true }));
  return fleet.every((s) => Number.isInteger(s.size) && Number.isInteger(s.at)) && fleetReady(fleet) ? fleet : null;
}

/** A shot's answer as it arrives, or null if it isn't one. */
export function parseResult(raw: Record<string, unknown>): ShotResult | null {
  const cell = Number(raw.cell);
  if (!Number.isInteger(cell) || cell < 0 || cell >= SEA * SEA) return null;
  const sunk = Array.isArray(raw.sunk) && raw.sunk.every((i) => Number.isInteger(i)) ? raw.sunk as number[] : null;
  return { cell, hit: raw.hit === true, sunk, lost: raw.lost === true };
}
