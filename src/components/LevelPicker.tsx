import { useMemo, useState } from 'react';
import { playSelect } from '../lib/sfx';
import {
  PHASES,
  buildPhase,
  recommendLevel,
  type PhaseWord,
} from '../lib/levelTest';

export interface LevelResult {
  collectionId: string;
  label: string;
}

interface Props {
  /** Called with the recommended Level collection when the test ends. */
  onDone: (result: LevelResult) => void;
  onBack?: () => void;
}

/**
 * The shared "tap the words you know" level test (onboarding + Find my level).
 * Three phases of plain word chips — no data loading, so it's instant. Knowing
 * EVERY word in a phase unlocks the next, harder one; otherwise it finishes
 * and recommends the deepest level the user mostly knows.
 */
export function LevelPicker({ onDone, onBack }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  // Words are sampled once per run; phases appear as the user unlocks them.
  const phases = useMemo(() => PHASES.map(buildPhase), []);
  const [known, setKnown] = useState<Set<string>>(new Set());

  const words = phases[phaseIdx];
  const phase = PHASES[phaseIdx];
  const allKnown = words.every((w) => known.has(w.word));
  const lastPhase = phaseIdx === PHASES.length - 1;
  const advances = allKnown && !lastPhase;

  const toggle = (word: string) => {
    playSelect();
    setKnown((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  };

  const submit = () => {
    if (advances) {
      setPhaseIdx((i) => i + 1);
      return;
    }
    // Only the phases actually shown count toward the recommendation.
    const shown: PhaseWord[] = phases.slice(0, phaseIdx + 1).flat();
    onDone(recommendLevel(shown, known));
  };

  // One-tap shortcut: select every chip in this phase and move on immediately
  // (next round, or straight to the result on the last one).
  const knowAll = () => {
    playSelect();
    const next = new Set(known);
    for (const w of words) next.add(w.word);
    setKnown(next);
    if (!lastPhase) {
      setPhaseIdx((i) => i + 1);
    } else {
      const shown: PhaseWord[] = phases.flat();
      onDone(recommendLevel(shown, next));
    }
  };

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
          Back
        </button>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-display font-bold text-text-primary">Find your level</h2>
        <span className="text-xs font-bold text-text-muted shrink-0">
          Round {phaseIdx + 1}/{PHASES.length}
        </span>
      </div>
      <p className="text-sm text-text-muted mt-1 mb-1">
        Tap every word you know.
      </p>
      <p className="text-xs font-bold text-accent-cyan mb-4">
        {phase.name} · <span className="font-normal text-text-muted">{phase.description}</span>
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
          ✓ I know them all{lastPhase ? '' : ' — harder words →'}
        </button>
      )}
      <button onClick={submit} className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-bold">
        {advances ? 'Next round: harder words →' : 'See my level'}
      </button>
    </div>
  );
}
