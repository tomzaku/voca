import { FormattedMessage } from 'react-intl';
import { useLearnRound } from '../../hooks/useLearnRound';
import { useGameScore } from '../../hooks/useGameScore';
import { HudCenter, HudTop, PixelIcon } from './pixel';
import { LearnRoundHud } from './LearnRoundHud';
import { PLAYABLE_GAMES, useGameLabel } from './learnGames';

// The Learn building — the archivist's desk in Tàng Thư Lâu. The same rounds as the
// flash card: new and struggling words picked by pickNextWords (or one sent
// over from the library), played and graded by LearnRoundHud. The stall's
// top bar is your score: the game, the streak and the points.

export function DongBaStall() {
  const round = useLearnRound(PLAYABLE_GAMES);
  const { streak, points, lastGain, winId } = useGameScore();
  const gameLabel = useGameLabel(round.game);

  const top = (
    <HudTop>
      <div className="flex items-center gap-4">
        <span className="px-title text-[var(--px-accent)] flex-1 truncate">{gameLabel}</span>
        <span className={`flex items-center gap-1 px-num text-[20px] ${streak >= 2 ? 'text-[var(--px-gold)]' : 'text-[var(--px-muted)]'}`}>
          <PixelIcon name="flame" size={2} />×{streak}
        </span>
        <span className="relative flex items-center gap-1.5 px-num text-[26px] leading-none text-[var(--px-gold)]">
          <PixelIcon name="star" size={3} />{points}
          {round.phase === 'solved' && <span key={winId} className="absolute -bottom-6 right-0 px-num text-[20px] text-[var(--px-good)] px-rise">+{lastGain}</span>}
        </span>
      </div>
    </HudTop>
  );

  return (
    <LearnRoundHud
      round={round}
      top={top}
      empty={<HudCenter><p className="text-center"><FormattedMessage id="world.learnEmpty" /></p></HudCenter>}
    />
  );
}
