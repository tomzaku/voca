import { useMemo } from 'react';

// A per-question decorative accent for game-y screens — cycles by question
// index so each question reads as visually distinct. Green and red are
// reserved for correct/incorrect feedback everywhere else in the app (see
// QuizArena's answer highlighting), so neither is in this rotation: cycling
// into them would make "this question is green" look like "you got the last
// one right".
//
// Chip classes are spelled out, not built from a colour name — Tailwind only
// keeps the classes it can find as complete strings in the source (same
// reasoning as the MODES table in PracticeButton.tsx).
export interface QuestionAccent {
  text: string;
  dot: string;
  hoverBgSoft: string;
  border: string;
}

const ROTATION: QuestionAccent[] = [
  { text: 'text-accent-cyan', dot: 'bg-accent-cyan', hoverBgSoft: 'hover:bg-accent-cyan/15', border: 'border-accent-cyan' },
  { text: 'text-accent-purple', dot: 'bg-accent-purple', hoverBgSoft: 'hover:bg-accent-purple/15', border: 'border-accent-purple' },
  { text: 'text-accent-orange', dot: 'bg-accent-orange', hoverBgSoft: 'hover:bg-accent-orange/15', border: 'border-accent-orange' },
  { text: 'text-accent-yellow', dot: 'bg-accent-yellow', hoverBgSoft: 'hover:bg-accent-yellow/15', border: 'border-accent-yellow' },
  { text: 'text-accent-pink', dot: 'bg-accent-pink', hoverBgSoft: 'hover:bg-accent-pink/15', border: 'border-accent-pink' },
];

/** The rotation's entry for a given question index — same index, same accent, every time. */
export function useQuestionAccent(index: number): QuestionAccent {
  return useMemo(() => {
    const i = ((index % ROTATION.length) + ROTATION.length) % ROTATION.length;
    return ROTATION[i];
  }, [index]);
}
