import { useMemo, useState } from 'react';
import { playSelect } from '../lib/sfx';
import { PHASES, buildPhase, recommendLevel, type PhaseWord } from '../lib/levelTest';

export interface LevelResult {
  collectionId: string;
  label: string;
}

/**
 * The "tap the words you know" level test, headless: three phases sampled
 * once per run, simple → everyday → advanced. Knowing EVERY word in a phase
 * unlocks the next, harder one; otherwise the test ends and recommends the
 * deepest level the learner mostly knows (lib/levelTest). The onboarding and
 * Find-my-level picker and the world's climb up Ngự Bình both run on this.
 */
export function useLevelTest(onDone: (result: LevelResult) => void) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phases = useMemo(() => PHASES.map(buildPhase), []);
  const [known, setKnown] = useState<Set<string>>(new Set());

  const words = phases[phaseIdx];
  const phase = PHASES[phaseIdx];
  const allKnown = words.every((w) => known.has(w.word));
  const lastPhase = phaseIdx === PHASES.length - 1;
  const advances = allKnown && !lastPhase;

  // Only the phases actually shown count toward the recommendation.
  const finish = (knownNow: Set<string>, through: number) => {
    const shown: PhaseWord[] = phases.slice(0, through + 1).flat();
    onDone(recommendLevel(shown, knownNow));
  };

  const toggle = (word: string) => {
    playSelect();
    setKnown((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  };

  /** Next round if this one is fully known, else the result. */
  const submit = () => {
    if (advances) setPhaseIdx((i) => i + 1);
    else finish(known, phaseIdx);
  };

  /** One-tap shortcut: every word in this phase is known — move on. */
  const knowAll = () => {
    playSelect();
    const next = new Set(known);
    for (const w of words) next.add(w.word);
    setKnown(next);
    if (!lastPhase) setPhaseIdx((i) => i + 1);
    else finish(next, phaseIdx);
  };

  return { phase, phaseIdx, phaseCount: PHASES.length, words, known, allKnown, lastPhase, advances, toggle, submit, knowAll };
}
