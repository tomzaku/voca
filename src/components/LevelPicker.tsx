import { FormattedMessage } from 'react-intl';
import { PHASES } from '../lib/levelTest';
import { useLevelTest, type LevelResult } from '../hooks/useLevelTest';

export type { LevelResult };

interface Props {
  /** Called with the recommended Level collection when the test ends. */
  onDone: (result: LevelResult) => void;
  onBack?: () => void;
}

/**
 * The shared "tap the words you know" level test (onboarding + Find my level).
 * Three phases of plain word chips — no data loading, so it's instant. The
 * flow lives in useLevelTest, shared with the world's climb up Ngự Bình.
 */
export function LevelPicker({ onDone, onBack }: Props) {
  const { phase, phaseIdx, words, known, allKnown, lastPhase, advances, toggle, submit, knowAll } = useLevelTest(onDone);

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary mb-3"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <FormattedMessage id="common.back" />
        </button>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-display font-bold text-text-primary"><FormattedMessage id="levelTest.title" /></h2>
        <span className="text-xs font-bold text-text-muted shrink-0">
          <FormattedMessage id="levelTest.round" values={{ current: phaseIdx + 1, total: PHASES.length }} />
        </span>
      </div>
      <p className="text-sm text-text-muted mt-1 mb-1">
        <FormattedMessage id="levelTest.tapKnown" />
      </p>
      <p className="text-xs font-bold text-accent-cyan mb-4">
        <FormattedMessage id={phase.nameId} /> · <span className="font-normal text-text-muted"><FormattedMessage id={phase.descriptionId} /></span>
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {words.map(({ word }) => {
          const sel = known.has(word);
          return (
            <button
              key={word}
              onClick={() => toggle(word)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-all ${
                sel
                  ? 'border-accent-cyan/50 bg-accent-cyan/15 text-accent-cyan'
                  : 'border-border bg-bg-tertiary text-text-primary hover:border-border-light'
              }`}
            >
              {word}
            </button>
          );
        })}
      </div>

      {/* Shortcut — no need to tap every chip when you know the whole set */}
      {!allKnown && (
        <button
          onClick={knowAll}
          className="w-full mb-2 py-2.5 rounded-xl border-2 border-accent-green/40 bg-accent-green/10 text-accent-green text-sm font-bold hover:bg-accent-green/20 transition-all"
        >
          <FormattedMessage id={lastPhase ? 'levelTest.knowAll' : 'levelTest.knowAllNext'} />
        </button>
      )}
      <button onClick={submit} className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-bold">
        <FormattedMessage id={advances ? 'levelTest.nextRound' : 'levelTest.seeLevel'} />
      </button>
    </div>
  );
}
