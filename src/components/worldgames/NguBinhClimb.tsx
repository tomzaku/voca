import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCollections } from '../../hooks/useCollections';
import { useLevelTest, type LevelResult } from '../../hooks/useLevelTest';
import { playWin } from '../../lib/sfx';
import { HudBanner, HudCenter, HudDock, HudTop, PixelBar, PixelButton, PixelChip, PixelIcon } from './pixel';

// The Level test building — the climb up Ngự Bình. The same "tap the words
// you know" test as onboarding and Find my level (useLevelTest: the same
// phases, the same unlock rule, the same recommendation), played as a climb:
// each round is a stretch of the hill, and the summit names your level.
// "Study" makes that level the active collection and sends you to Tàng Thư Lâu.

/** Where on the hill each round is. */
const STAGES = ['world.climbFoot', 'world.climbSlope', 'world.climbSummit'];
/** Hotkeys for the word chips, in order. */
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function NguBinhClimb({ onStudy }: { onStudy: () => void }) {
  const [result, setResult] = useState<LevelResult | null>(null);
  // Remounts the climb for a fresh word sample on a retake.
  const [runId, setRunId] = useState(0);

  if (result) {
    return <Summit result={result} onStudy={onStudy} onRetake={() => { setResult(null); setRunId((n) => n + 1); }} />;
  }
  return <Climb key={runId} onDone={(r) => { playWin(); setResult(r); }} />;
}

function Climb({ onDone }: { onDone: (r: LevelResult) => void }) {
  const intl = useIntl();
  const test = useLevelTest(onDone);
  const { phase, phaseIdx, phaseCount, words, known, allKnown, lastPhase, advances } = test;

  // 1–9 and 0 toggle the chips; Enter goes on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = KEYS.indexOf(e.key);
      if (i !== -1 && words[i]) { e.preventDefault(); test.toggle(words[i].word); }
      else if (e.key === 'Enter') { e.preventDefault(); test.submit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <HudTop>
        <div className="flex items-center gap-4">
          <span className="px-title text-[var(--px-accent)] shrink-0"><FormattedMessage id="levelTest.title" /></span>
          <div className="flex-1 min-w-0">
            <PixelBar
              pct={((phaseIdx + 1) / phaseCount) * 100}
              color="var(--px-jade)"
              label={intl.formatMessage({ id: STAGES[phaseIdx] ?? STAGES[0] })}
            />
          </div>
          <span className="px-title text-[var(--px-muted)] shrink-0">
            <FormattedMessage id="levelTest.round" values={{ current: phaseIdx + 1, total: phaseCount }} />
          </span>
        </div>
      </HudTop>

      <HudBanner key={phaseIdx} label={<FormattedMessage id={phase.nameId} />} aside={<FormattedMessage id={phase.descriptionId} />}>
        <FormattedMessage id="levelTest.tapKnown" />
      </HudBanner>

      <HudDock>
        <div className="flex flex-wrap justify-center gap-2">
          {words.map(({ word }, i) => (
            <PixelChip key={word} on={known.has(word)} onClick={() => test.toggle(word)}>
              <span className="text-[var(--px-gold)] mr-1.5 text-[12px]">{KEYS[i]}</span>
              <span className="text-[17px]">{word}</span>
            </PixelChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {!allKnown && (
            <PixelButton tone="jade" className="flex-1" onClick={test.knowAll}>
              <FormattedMessage id={lastPhase ? 'levelTest.knowAll' : 'levelTest.knowAllNext'} />
            </PixelButton>
          )}
          <PixelButton tone="red" className="flex-1" onClick={test.submit}>
            <FormattedMessage id={advances ? 'levelTest.nextRound' : 'levelTest.seeLevel'} /> ↵
          </PixelButton>
        </div>
      </HudDock>
    </>
  );
}

function Summit({ result, onStudy, onRetake }: { result: LevelResult; onStudy: () => void; onRetake: () => void }) {
  const intl = useIntl();
  const setActive = useCollections((s) => s.setActive);
  const study = () => {
    setActive(result.collectionId);
    toast.success(intl.formatMessage({ id: 'levelTest.studyingToast' }, { level: result.label }));
    onStudy();
  };
  return (
    <HudCenter>
      <div className="text-center">
        <PixelIcon name="star" size={6} className="text-[var(--px-gold)]" />
        <p className="px-title text-[var(--px-muted)] mt-3"><FormattedMessage id="world.climbSummit" /></p>
        <p className="px-num text-[34px] leading-tight text-[var(--px-gold)] mt-1">
          <FormattedMessage id="levelTest.yourLevel" values={{ level: result.label }} />
        </p>
        <p className="mt-2 text-[15px] text-[var(--px-muted)] leading-snug"><FormattedMessage id="levelTest.startThere" /></p>
        <div className="flex gap-2 mt-5">
          <PixelButton tone="red" className="flex-1" onClick={study}>
            <PixelIcon name="sword" size={2} /> <FormattedMessage id="levelTest.study" values={{ level: result.label }} />
          </PixelButton>
          <PixelButton tone="paper" onClick={onRetake}>
            <PixelIcon name="retry" size={2} /> <FormattedMessage id="levelTest.retake" />
          </PixelButton>
        </div>
      </div>
    </HudCenter>
  );
}
