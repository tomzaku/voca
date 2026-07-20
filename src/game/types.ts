// Types that cross the React ↔ Phaser boundary. Keep this file dependency-free
// so game code never imports React and components never import game internals.

/** A collection rendered as a station on the world map. */
export interface WorldStation {
  id: string;
  name: string;
  kind: 'mine' | 'joined' | 'level';
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
export const WORLD_EVENTS = {
  /** Buddy walked within reach of a station (payload: station id or null). */
  near: 'world:near',
  /** Buddy moved, throttled (payload: { x, y, areaIndex }). */
  moved: 'world:moved',
  /** Buddy crossed a gate into another area (payload: { index, area }). */
  area: 'world:area',
} as const;

/** Pseudo-station id for the "build a new collection" spot on the map.
 *  Emitted through WORLD_EVENTS.near like a real station id. */
export const CREATE_STATION_ID = '__create__';
