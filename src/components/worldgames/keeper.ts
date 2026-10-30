import type { Advice, Recap } from '../../lib/keeperAdvice';

// What a skill's keeper declares about themselves — one file each, in
// ./keepers/, picked up by the registry the way activities are. A keeper says
// one thing when you walk in (and after each activity, with how it went), and
// can mark the skill's menu cards with where you stand. Both are hooks, so a
// keeper reads its own skill's progress; the rules themselves live in
// lib/keeperAdvice.

export interface KeeperDef {
  /** The skill whose keeper this is (SKILLS in src/game/features.ts). */
  skill: string;
  /** Their name and trade, shown in their message box. */
  nameId: string;
  useAdvice: (recap?: Recap) => Advice;
  /** Activity id → a short note for its menu card ("266 due"). */
  useBadges: () => Record<string, string | undefined>;
}

const noBadges = () => ({});

/** A keeper; one with nothing to note on the menu says so by leaving out useBadges. */
export const defineKeeper = (d: Omit<KeeperDef, 'useBadges'> & Partial<Pick<KeeperDef, 'useBadges'>>): KeeperDef =>
  ({ useBadges: noBadges, ...d });
