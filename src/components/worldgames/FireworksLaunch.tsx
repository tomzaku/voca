import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { playFireworkPop } from '../../lib/donTune';
import { fetchQuestions, type WordQuestion } from '../../lib/questionsApi';
import { PixelButton, PixelIcon, PixelLoader } from './pixel';
import { WordQuestionCard } from './WordQuestion';

const ROUND = 10;
/** Right answers in a row before the fireworks get bigger. */
const STREAK_BIG = 3;

/**
 * The Tết launch pad on the south bank: a definition, four words — and a
 * right answer sends a firework up over the Hương that spells the word in
 * sparks. Three in a row and the shells get bigger. The questions come from
 * the server (lib/questionsApi), from the collection you're studying, the
 * answer sealed until you choose — so the word that goes up is the one the
 * server confirms.
 *
 * The window sits low and clear of the sky, so you can watch your word go up.
 */
export function FireworksLaunch({ onClose, onLaunch }: { onClose: () => void; onLaunch: (word: string, big: boolean) => void }) {
  const [qs, setQs] = useState<WordQuestion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState(0);
  const [streak, setStreak] = useState(0);
  const [launched, setLaunched] = useState(0);
  const [round, setRound] = useState(0);
  const [switching, setSwitching] = useState(false);

  // A fresh round each time: from whatever you're studying now.
  useEffect(() => {
    let alive = true;
    fetchQuestions(ROUND).then((q) => {
      if (!alive) return;
      if (q.length) setQs(q); else setFailed(true);
    });
    return () => { alive = false; };
  }, [round]);

  const q = qs?.[at];
  const done = !!qs && at >= qs.length;

  const answered = (correct: boolean, answer: string) => {
    if (correct) {
      const s = streak + 1;
      setStreak(s);
      setLaunched((n) => n + 1);
      onLaunch(answer, s >= STREAK_BIG);
      window.setTimeout(() => playFireworkPop(s >= STREAK_BIG), 800);
    } else {
      setStreak(0);
    }
    window.setTimeout(() => setAt((i) => i + 1), correct ? 500 : 900);
  };

  // A switch from the question: the rest of the round comes from the new list.
  const switched = () => {
    const left = Math.max(1, (qs?.length ?? ROUND) - at);
    setSwitching(true);
    fetchQuestions(left).then((more) => {
      setSwitching(false);
      // Nothing from the new list yet: the round carries on as it was.
      if (more.length) setQs((cur) => [...(cur ?? []).slice(0, at), ...more]);
    });
  };

  const again = () => { setQs(null); setAt(0); setStreak(0); setLaunched(0); setFailed(false); setRound((r) => r + 1); };

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

        {switching && <PixelLoader label={<FormattedMessage id="world.questionSwitching" />} />}
        {q && !switching && (
          <>
            <div className="flex items-center justify-between text-[12px] mb-2 opacity-90">
              <span><FormattedMessage id="world.fireworksCount" values={{ n: at + 1, total: qs!.length }} /></span>
              <span className={streak >= STREAK_BIG ? 'text-[var(--px-gold)]' : ''}>
                <FormattedMessage id="world.fireworksStreak" values={{ n: streak }} />
              </span>
            </div>
            <WordQuestionCard key={at} q={q} onAnswered={answered} onCollectionChanged={switched} />
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
