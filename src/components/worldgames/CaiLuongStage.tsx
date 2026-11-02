import { FormattedMessage } from 'react-intl';
import { RolePlay } from './RolePlay';
import { HudTop, PixelIcon } from './pixel';
import { ActivityChromeProvider } from './pixel/ActivityChrome';

/**
 * Up on the cải lương stage on Phố đi bộ: the troupe plays a scene, in
 * English — the Daily Dialogues from the Speak page, run by the same role-play
 * (RolePlay) as Đông Ba market. Listen to both parts, or take one and say your
 * lines when your turn comes. The đờn tune that plays as you walk up stops
 * once you're on stage, so the voices are clear.
 */
export function CaiLuongStage({ onClose }: { onClose: () => void }) {
  return (
    <div className="px absolute inset-0 z-40" onKeyDown={(e) => e.stopPropagation()}>
      <ActivityChromeProvider chrome={{ back: onClose, modes: [], setMode: () => {} }}>
        <HudTop>
          <p className="px-title !text-[16px] text-[var(--px-gold)] flex items-center gap-2">
            <PixelIcon name="stage" size={2} /> <FormattedMessage id="world.cailuongTitle" />
          </p>
          <p className="text-[12px] opacity-80"><FormattedMessage id="world.cailuongStageHint" /></p>
        </HudTop>
        <RolePlay source="dialogue" />
      </ActivityChromeProvider>
    </div>
  );
}
