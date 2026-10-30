import type { KeeperDef } from './keeper';

// Every keeper, from its own file in ./keepers/, by skill.

const files = import.meta.glob<{ default: KeeperDef }>('./keepers/*.ts', { eager: true });

export const KEEPERS: Record<string, KeeperDef> = Object.fromEntries(
  Object.values(files).map((m) => [m.default.skill, m.default]),
);
