import type { ComponentType } from 'react';
import type { ActivityKind, WorldActivity } from '../../game/features';

// What an activity declares about itself — one file each, in ./activities/,
// picked up by the registry. Adding an activity is adding a file: it names
// its skill and its place in that skill's menu, and the screen that plays it.
// Anything the screen needs from the world it takes from useWorld().

export interface ActivityDef extends WorldActivity {
  /** The skill it belongs to (SKILLS in src/game/features.ts). */
  skill: string;
  /** Its place in the skill's menu, lowest first — leave gaps (10, 20…). */
  order: number;
  Screen: ComponentType;
}

/** An activity, its message ids derived from `key`: world.act<key> and
 *  world.act<key>Blurb. */
export function defineActivity(d: {
  id: string;
  skill: string;
  kind: ActivityKind;
  key: string;
  emoji: string;
  place: string;
  order: number;
  Screen: ComponentType;
}): ActivityDef {
  const { key, ...rest } = d;
  return { ...rest, nameId: `world.act${key}`, blurbId: `world.act${key}Blurb` };
}
