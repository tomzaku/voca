import { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { RolePlay } from './RolePlay';
import { PixelButton, PixelIcon } from './pixel';

/**
 * Up on the cải lương stage on Phố đi bộ: the troupe plays a scene, in
 * English — the Daily Dialogues from the Speak page, run by the same role-play
 * (RolePlay) as Đông Ba market. Listen to both parts, or take one and say your
 * lines when your turn comes. The đờn tune that plays as you walk up stops
 * once you're on stage, so the voices are clear.
 *
 * The title and Close sit inside the role-play's own panel (like the fortune
 * sticks), not in a separate bar above it — two floating boxes read as two
 * things, and the way out got lost between them. Escape closes too.
 */
export function CaiLuongStage({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const header = (
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="min-w-0">
        <p className="px-title !text-[16px] text-[var(--px-gold)] flex items-center gap-2">
          <PixelIcon name="stage" size={2} /> <FormattedMessage id="world.cailuongTitle" />
        </p>
        <p className="text-[12px] opacity-80"><FormattedMessage id="world.cailuongStageHint" /></p>
      </div>
      <PixelButton tone="paper" onClick={onClose} className="!px-2.5 !py-1 !text-[13px] shrink-0">
        <PixelIcon name="close" size={2} /> <FormattedMessage id="world.close" />
      </PixelButton>
    </div>
  );

  return (
    <div className="px absolute inset-0 z-40" onKeyDown={(e) => e.stopPropagation()}>
      <RolePlay source="dialogue" header={header} />
    </div>
  );
}
