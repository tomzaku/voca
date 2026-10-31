import { SKILLS, type WorldSkill } from '../../game/features';
import type { ActivityDef } from './activity';

// Every activity, from its own file in ./activities/ — nothing lists them by
// hand, so two people adding two activities never touch the same line. Each
// skill's menu is its activities in their `order`.

const files = import.meta.glob<{ default: ActivityDef }>('./activities/*.ts', { eager: true });

export const ACTIVITIES: ActivityDef[] = Object.values(files)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order);

/** The skills with their activities, in the order menus list them. */
export const WORLD_SKILLS: (Omit<WorldSkill, 'activities'> & { activities: ActivityDef[] })[] = SKILLS.map((s) => ({
  ...s,
  activities: ACTIVITIES.filter((a) => a.skill === s.id),
}));

/** The skill an activity belongs to, and the activity itself — found by its
 *  own id or one of its modes' (then `mode` says which). */
export function findActivity(id: string): { skill: WorldSkill; activity: ActivityDef; mode?: string } | null {
  const activity = ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES.find((a) => a.modes?.some((m) => m.id === id));
  const skill = activity && WORLD_SKILLS.find((s) => s.id === activity.skill);
  if (!activity || !skill) return null;
  return activity.id === id ? { skill, activity } : { skill, activity, mode: id };
}

/** The screen an activity shows in `mode` (its first mode, or its one screen). */
export function modeOf(activity: ActivityDef, mode?: string) {
  return activity.modes?.find((m) => m.id === mode) ?? activity.modes?.[0] ?? null;
}
