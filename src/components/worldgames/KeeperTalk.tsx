import type { ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Recap } from '../../lib/keeperAdvice';
import type { WorldActivity, WorldSkill } from '../../game/features';
import type { VillagerLook } from '../../game/textures';
import { KEEPER_DRESS } from '../../game/keeperLooks';
import type { KeeperDef } from './keeper';
import { KeeperDialog } from './KeeperDialog';
import { SkillMenu } from './SkillMenu';

// A skill's keeper, talking (their advice in a message box) or, once you've
// heard them, their menu with your standing on its cards. Rendered keyed by
// skill, so each keeper's hooks only ever run for their own skill.

export function KeeperTalk({ keeper, look, recap, onAction, onOther }: {
  keeper: KeeperDef;
  look: VillagerLook;
  recap?: Recap;
  onAction: (activityId: string) => void;
  onOther: () => void;
}) {
  const intl = useIntl();
  const advice = keeper.useAdvice(recap);
  const line = [
    advice.recapId && intl.formatMessage({ id: advice.recapId }, advice.values),
    intl.formatMessage({ id: advice.lineId }, advice.values),
  ].filter(Boolean).join(' ');
  return (
    <KeeperDialog
      look={look}
      dress={KEEPER_DRESS[keeper.skill]}
      name={<FormattedMessage id={keeper.nameId} />}
      line={line}
      primary={<FormattedMessage id={advice.actionId} />}
      onPrimary={() => onAction(advice.action)}
      secondary={<FormattedMessage id="world.kvOther" />}
      onSecondary={onOther}
    />
  );
}

/** The skill's menu, with the keeper's notes on its cards — and any the
 *  world adds (the collection you're studying). */
export function KeeperMenu({ keeper, skill, onPick, extraBadges = {} }: {
  keeper: KeeperDef;
  skill: WorldSkill;
  onPick: (a: WorldActivity) => void;
  extraBadges?: Record<string, ReactNode>;
}) {
  const badges = keeper.useBadges();
  return <SkillMenu skill={skill} badges={{ ...badges, ...extraBadges }} onPick={onPick} />;
}
