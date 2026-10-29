import { useCallback, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLearnRound } from '../../hooks/useLearnRound';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { dueWords, nextDueAt } from '../../lib/spacedRepetition';
import { HudCenter, HudTop, PixelBar, PixelButton, PixelIcon } from './pixel';
import { LearnRoundHud } from './LearnRoundHud';
import { PLAYABLE_GAMES, useGameLabel } from './learnGames';

// The Review building — Thiên Mụ pagoda. A sitting that works through the
// words due right now, most overdue first: the same due list as the History
// review panel (dueWords), each word played as a Learn round (LearnRoundHud)
// and graded into the same FSRS schedule. The queue is fixed when you walk
// in, so a word you miss — due again in ten minutes — waits for the next
// sitting rather than looping this one.

/** Words per sitting. A backlog can run to hundreds; a sitting is the most
 *  overdue few, so it ends — the next one picks up the rest. */
const SITTING = 20;

export function ThienMuReview({ onLearnMore }: { onLearnMore: () => void }) {
  const [{ queue, backlog }] = useState(() => {
    const due = dueWords(useVocabularyStore.getState().progress).map((p) => p.word);
    return { queue: due.slice(0, SITTING), backlog: due.length };
  });
  // The queue position lives in a ref (the round reads it mid-load) and is
  // mirrored into state for the progress bar.
  const taken = useRef(0);
  const [picked, setPicked] = useState(0);
  const [kept, setKept] = useState(0);
  const pickWord = useCallback(() => {
    const word = queue[taken.current] ?? null;
    if (word) setPicked(++taken.current);
    return word;
  }, [queue]);
  const round = useLearnRound(PLAYABLE_GAMES, pickWord);
  const gameLabel = useGameLabel(round.game);

  const total = queue.length;
  const playing = round.phase === 'loading' || round.phase === 'guessing';
  const answered = Math.min(total, Math.max(0, picked - (playing ? 1 : 0)));
  // Count what was remembered as it happens, then grade as usual.
  const tracked = { ...round, solve: () => { setKept((k) => k + 1); round.solve(); } };

  const top = (
    <HudTop>
      <div className="flex items-center gap-4">
        <span className="px-title text-[var(--px-accent)] shrink-0">{total > 0 ? gameLabel : <FormattedMessage id="world.featureReview" />}</span>
        <div className="flex-1 min-w-0">
          <PixelBar pct={total ? (answered / total) * 100 : 100} color="var(--px-jade)" label={`${Math.min(picked, total)} / ${total}`} />
        </div>
        <span className="px-title text-[var(--px-muted)] shrink-0 hidden sm:inline">
          <FormattedMessage id="world.reviewBacklog" values={{ count: backlog }} />
        </span>
        <span className="flex items-center gap-1.5 px-num text-[22px] leading-none text-[var(--px-good)]">
          <PixelIcon name="check" size={2} />{kept}
        </span>
      </div>
    </HudTop>
  );

  return (
    <LearnRoundHud
      round={tracked}
      top={top}
      empty={<Done total={total} kept={kept} left={backlog - answered} onLearnMore={onLearnMore} />}
    />
  );
}

/** The end of a sitting — or the pagoda with nothing due yet. */
function Done({ total, kept, left, onLearnMore }: { total: number; kept: number; left: number; onLearnMore: () => void }) {
  const intl = useIntl();
  const next = nextDueAt(useVocabularyStore.getState().progress);
  const when = next === null ? null : relative(intl, next - Date.now());
  return (
    <HudCenter>
      <div className="text-center">
        <PixelIcon name={total ? 'check' : 'hourglass'} size={5} className={total ? 'text-[var(--px-good)]' : 'text-[var(--px-gold)]'} />
        <p className="px-title !text-[18px] text-[var(--px-gold)] mt-3">
          {total
            ? <FormattedMessage id="world.reviewAllDone" values={{ kept, total }} />
            : <FormattedMessage id="world.reviewNothingDue" />}
        </p>
        <p className="mt-2 text-[var(--px-muted)]">
          {left > 0
            ? <FormattedMessage id="world.reviewMoreDue" values={{ count: left }} />
            : when
            ? <FormattedMessage id="world.reviewNextDue" values={{ when }} />
            : <FormattedMessage id="world.reviewNoneScheduled" />}
        </p>
        <PixelButton tone="red" block className="mt-5" onClick={onLearnMore}>
          <PixelIcon name="sword" size={2} /> <FormattedMessage id="world.reviewLearnMore" />
        </PixelButton>
      </div>
    </HudCenter>
  );
}

/** "in 10 minutes", "in 3 hours", "tomorrow" — whichever unit reads best. */
function relative(intl: ReturnType<typeof useIntl>, ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return intl.formatRelativeTime(min, 'minute');
  const hours = Math.round(min / 60);
  if (hours < 24) return intl.formatRelativeTime(hours, 'hour');
  return intl.formatRelativeTime(Math.round(hours / 24), 'day', { numeric: 'auto' });
}
