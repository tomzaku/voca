import type { ComponentType } from 'react';
import type { ActivityKind, WorldActivity } from '../../game/features';

// What an activity declares about itself — one file each, in ./activities/,
// picked up by the registry. Adding an activity is adding a file: it names
// its skill and its place in that skill's menu, and the screen that plays it.
// Anything the screen needs from the world it takes from useWorld().

/** One of an activity's modes — learn the sounds, or practise them — each
 *  its own screen, switched from the skill bar. The first is where it opens. */
export interface ActivityMode {
  /** Unique among activities and modes: opening it by id lands in this mode. */
  id: string;
  nameId: string;
  Screen: ComponentType;
}

export interface ActivityDef extends WorldActivity {
  /** The skill it belongs to (SKILLS in src/game/features.ts). */
  skill: string;
  /** Its place in the skill's menu, lowest first — leave gaps (10, 20…). */
  order: number;
  Screen: ComponentType;
  /** Several screens under one menu entry, as the app groups them in tabs. */
  modes?: ActivityMode[];
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
  /** One screen — or `modes`, which open on the first. */
  Screen?: ComponentType;
  modes?: ActivityMode[];
}): ActivityDef {
  const { key, Screen, modes, ...rest } = d;
  const screen = Screen ?? modes?.[0]?.Screen;
  if (!screen) throw new Error(`activity ${d.id} has no screen`);
  return { ...rest, Screen: screen, modes, nameId: `world.act${key}`, blurbId: `world.act${key}Blurb` };
}
