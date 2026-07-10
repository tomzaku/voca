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
export type ThemeId = 'forest' | 'desert';

/** Events the game emits on `game.events` for the React shell. */
export const WORLD_EVENTS = {
  /** Buddy walked within reach of a station (payload: station id or null). */
  near: 'world:near',
} as const;

/** Pseudo-station id for the "build a new collection" spot on the map.
 *  Emitted through WORLD_EVENTS.near like a real station id. */
export const CREATE_STATION_ID = '__create__';
