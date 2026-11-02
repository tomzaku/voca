import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { playCorrect, playWrong } from '../../lib/sfx';
import { playFireworkPop } from '../../lib/donTune';
import type { DuelQuestion } from '../../lib/wordDuel';
import { duelQuestions } from './duelQuestions';
import { PixelButton, PixelIcon, PixelLoader, type PixelTone } from './pixel';
import { useWorld } from './world';

const ROUND = 10;
/** Right answers in a row before the fireworks get bigger. */
const STREAK_BIG = 3;

/**
 * The Tết launch pad on the south bank: a definition, four words — and a
 * right answer sends a firework up over the Hương that spells the word in
 * sparks. Three in a row and the shells get bigger. The questions are the
 * duels' own (duelQuestions), from your words where there are enough.
 *
 * The window sits low and clear of the sky, so you can watch your word go up.
 */
export function FireworksLaunch({ onClose, onLaunch }: { onClose: () => void; onLaunch: (word: string, big: boolean) => void }) {
  const { wordPool } = useWorld();
  const [qs, setQs] = useState<DuelQuestion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState(0);
  const [streak, setStreak] = useState(0);
  const [launched, setLaunched] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    duelQuestions(wordPool, ROUND).then((q) => alive && setQs(q), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [wordPool]);

  const q = qs?.[at];
  const done = !!qs && at >= qs.length;

  const answer = (option: string) => {
    if (!q || picked) return;
    setPicked(option);
    if (option === q.word) {
      const s = streak + 1;
      setStreak(s);
      setLaunched((n) => n + 1);
      playCorrect();
      onLaunch(q.word, s >= STREAK_BIG);
      window.setTimeout(() => playFireworkPop(s >= STREAK_BIG), 800);
    } else {
      setStreak(0);
      playWrong();
    }
    window.setTimeout(() => { setPicked(null); setAt((i) => i + 1); }, option === q.word ? 1600 : 2000);
  };

  const again = () => {
    setQs(null); setAt(0); setStreak(0); setLaunched(0); setFailed(false);
    duelQuestions(wordPool, ROUND).then(setQs, () => setFailed(true));
  };

  return (
    <div className="px absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 pointer-events-none" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[560px] p-4 pointer-events-auto px-in-up">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2">
              <PixelIcon name="firework" size={2} /> <FormattedMessage id="world.fireworksTitle" />
            </p>
            <p className="text-[12px] opacity-80"><FormattedMessage id="world.fireworksHow" /></p>
          </div>
          <PixelButton tone="paper" onClick={onClose} className="!px-2.5 !py-1 !text-[13px]"><FormattedMessage id="world.close" /></PixelButton>
        </div>

        {failed && <p className="text-[13px]"><FormattedMessage id="world.fireworksNoWords" /></p>}
        {!qs && !failed && <PixelLoader label={<FormattedMessage id="world.fireworksLoading" />} />}

        {q && (
          <>
            <div className="flex items-center justify-between text-[12px] mb-2 opacity-90">
              <span><FormattedMessage id="world.fireworksCount" values={{ n: at + 1, total: qs!.length }} /></span>
              <span className={streak >= STREAK_BIG ? 'text-[var(--px-gold)]' : ''}>
                <FormattedMessage id="world.fireworksStreak" values={{ n: streak }} />
              </span>
            </div>
            <p className="text-[15px] leading-snug mb-3">{q.prompt}</p>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((o) => {
                const tone: PixelTone = !picked ? 'paper' : o === q.word ? 'good' : o === picked ? 'bad' : 'paper';
                return (
                  <PixelButton key={o} tone={tone} block onClick={() => answer(o)} disabled={!!picked}>
                    {o}
                  </PixelButton>
                );
              })}
            </div>
          </>
        )}

        {done && (
          <div className="text-center space-y-3">
            <p className="px-title !text-[16px] text-[var(--px-gold)]">
              <FormattedMessage id="world.fireworksDone" values={{ n: launched, total: qs!.length }} />
            </p>
            <PixelButton tone="gold" onClick={again}><FormattedMessage id="world.fireworksAgain" /></PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
