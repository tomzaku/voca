// The fishing game's rules, with no UI attached. Cast, wait for a bite,
// strike in time, then reel: the fish darts up and down the line's bar and
// you keep your catch zone on it — holding lifts the zone, letting go lets it
// sink. While the fish is in the zone the catch fills; while it's out, it
// drains. Fill it and the fish is landed; let it empty and the fish is gone.
// Which fish bites depends on luck and how far you cast.

export interface Fish {
  id: string;
  /** Its name in Vietnamese — the river's own. */
  name: string;
  /** How often it bites, relative to the others. */
  weight: number;
  /** Size range, cm. */
  min: number;
  max: number;
  /** How wildly it darts while you reel (0–1). */
  fight: number;
  /** Rare ones only bite on a long cast. */
  farOnly?: boolean;
  color: string;
}

export const FISH: Fish[] = [
  { id: 'ro', name: 'Cá rô', weight: 30, min: 8, max: 18, fight: 0.25, color: '#7a8a5a' },
  { id: 'diec', name: 'Cá diếc', weight: 26, min: 10, max: 22, fight: 0.3, color: '#b8b0a0' },
  { id: 'tra', name: 'Cá tra', weight: 16, min: 25, max: 60, fight: 0.45, color: '#8a98a8' },
  { id: 'loc', name: 'Cá lóc', weight: 12, min: 30, max: 70, fight: 0.6, color: '#5a6048' },
  { id: 'bong', name: 'Cá bống', weight: 9, min: 6, max: 14, fight: 0.4, color: '#c8a070' },
  { id: 'chep', name: 'Cá chép vàng', weight: 4, min: 30, max: 80, fight: 0.75, farOnly: true, color: '#e8a83a' },
  { id: 'chinh', name: 'Cá chình', weight: 3, min: 50, max: 120, fight: 0.9, farOnly: true, color: '#4a4038' },
];

/** The fish that bites a cast of `power` (0–1): the rare ones only far out. */
export function biteFor(power: number, random = Math.random): { fish: Fish; size: number } {
  const pool = FISH.filter((f) => !f.farOnly || power > 0.7);
  const total = pool.reduce((t, f) => t + f.weight, 0);
  let r = random() * total;
  const fish = pool.find((f) => (r -= f.weight) < 0) ?? pool[pool.length - 1];
  const size = Math.round(fish.min + (fish.max - fish.min) * random() ** 1.6);
  return { fish, size };
}

/** How long (ms) the bobber waits before a bite. */
export const waitFor = (random = Math.random) => 1500 + random() * 4500;
/** How long (ms) a bite lasts before the fish lets go. */
export const BITE_MS = 900;

/** The reeling bar: everything as fractions of its height, 0 bottom to 1 top. */
export interface Reel {
  fish: number;
  fishV: number;
  /** The fish's next target, and when it picks a new one (ms left). */
  target: number;
  next: number;
  zone: number;
  zoneV: number;
  /** How landed the fish is, 0–1. */
  catch: number;
}

export const ZONE = 0.26;

export const startReel = (): Reel => ({ fish: 0.5, fishV: 0, target: 0.5, next: 0, zone: 0.37, zoneV: 0, catch: 0.3 });

/** Move the reel on by `dt` seconds. */
export function stepReel(r: Reel, fish: Fish, holding: boolean, dt: number, random = Math.random): Reel {
  let { target, next } = r;
  next -= dt * 1000;
  if (next <= 0) {
    target = Math.min(0.97, Math.max(0.03, r.fish + (random() - 0.5) * (0.4 + fish.fight)));
    next = 300 + random() * (1400 - fish.fight * 900);
  }
  // The fish springs towards its target, quicker the more it fights.
  const pull = 6 + fish.fight * 14;
  let fishV = (r.fishV + (target - r.fish) * pull * dt) * (1 - 3.5 * dt);
  let f = r.fish + fishV * dt;
  if (f < 0 || f > 1) { f = Math.min(1, Math.max(0, f)); fishV = 0; }
  // The zone: lifted while holding, falling otherwise, bouncing off the ends.
  let zoneV = r.zoneV + (holding ? 2.6 : -2.2) * dt;
  let zone = r.zone + zoneV * dt;
  if (zone < 0) { zone = 0; zoneV = -zoneV * 0.3; }
  if (zone > 1 - ZONE) { zone = 1 - ZONE; zoneV = 0; }
  const inside = f >= zone && f <= zone + ZONE;
  const c = Math.min(1, Math.max(0, r.catch + (inside ? 0.32 : -0.24) * dt));
  return { fish: f, fishV, target, next, zone, zoneV, catch: c };
}

export const landed = (r: Reel) => r.catch >= 1;
export const escaped = (r: Reel) => r.catch <= 0;
