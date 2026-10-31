// Types that cross the React ↔ Phaser boundary. Keep this file dependency-free
// so game code never imports React and components never import game internals.

/** A collection or level, as the world lists it (the collections' keeper,
 *  the travel drawer). */
export interface WorldStation {
  id: string;
  name: string;
  kind: 'mine' | 'joined' | 'level' | 'topic';
  words: string[];
  /** Percent of the words the viewer has finished. */
  pct: number;
  /** Currently the active (studying) collection. */
  active: boolean;
  /** How many users study this collection (shown when > 0). */
  learners?: number;
}

export type StationKind = WorldStation['kind'];

/** Biome looks a map template can use for its areas. */
export type ThemeId = 'forest' | 'desert' | 'snow';

/** One of the map's areas — the strips between the doors, named by its label. */
export interface WorldArea {
  name: string;
  theme: ThemeId;
  /** World-pixel bounds (top inclusive, bottom exclusive). */
  top: number;
  bottom: number;
}

/** Everything the minimap needs; rebuilt whenever the world is. */
export interface WorldSnapshot {
  worldW: number;
  worldH: number;
  areas: WorldArea[];
  nodes: { id: string; x: number; y: number; kind: StationKind | 'feature' | 'create' }[];
}

/** Events the game emits on `game.events` for the React shell. */
/** A bus journey under way: riding to the stop at `place` (its story id). */
export interface BusRide { state: 'riding'; place: string }

export const WORLD_EVENTS = {
  /** Buddy walked within reach of a station (payload: station id or null). */
  near: 'world:near',
  /** Buddy moved, throttled (payload: { x, y, areaIndex }). */
  moved: 'world:moved',
  /** Buddy crossed a gate into another area (payload: { index, area }). */
  area: 'world:area',
  /** Camera zoom changed (payload: the new user zoom factor). */
  zoom: 'world:zoom',
  /** Buddy came within reach of a named place on the map (payload: its
   *  `places` id, or null on leaving). */
  landmark: 'world:landmark',
  /** The buddy boarded a bus, or got off it (payload: BusRide, or null). */
  bus: 'world:bus',
  /** The buddy came to one of the playground's games, or left it (payload:
   *  its id — 'piano', 'race' — or null). */
  play: 'world:play',
  /** The buddy came to the Focus Zone on Ngự Bình, or left it (payload: boolean). */
  focus: 'world:focus',
  /** The buddy came to a bus stop's shelter, or left it (payload: the stop's
   *  index, or -1). */
  busStop: 'world:busStop',
  /** Local development only: where the buddy and the pointer are, in the map
   *  generator's tiles (payload: { buddy: [x, y], cursor: [x, y] | null }). */
  debug: 'world:debug',
} as const;

