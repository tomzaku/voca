// What just happened in a round — a right answer, a wrong one, a run of
// right ones, a round finished — announced for whoever wants to react. The
// world's rooms listen (RoomScene: the buddy hops, the keeper nods); nothing
// in the app does, and nothing needs to.
//
// Announced from the answer sounds in lib/sfx, which every round in the app
// and the world already plays at exactly these moments — so every activity
// is covered without each one wiring it up. Announced even when sound is off.

export type AnswerEvent =
  | { kind: 'correct' }
  | { kind: 'wrong' }
  /** A run of right answers reached one of COMBO_STEPS. */
  | { kind: 'combo'; count: number }
  /** A round, a quiz or a climb finished. */
  | { kind: 'done' };

/** Runs worth a cheer of their own. */
export const COMBO_STEPS = [3, 5, 10, 15, 20];

const listeners = new Set<(e: AnswerEvent) => void>();
let run = 0;

function emit(e: AnswerEvent) {
  for (const l of listeners) l(e);
}

export function announceCorrect() {
  run += 1;
  emit({ kind: 'correct' });
  if (COMBO_STEPS.includes(run)) emit({ kind: 'combo', count: run });
}

export function announceWrong() {
  run = 0;
  emit({ kind: 'wrong' });
}

export function announceDone() {
  run = 0;
  emit({ kind: 'done' });
}

/** Listen; returns the unsubscribe. */
export function onAnswerEvent(fn: (e: AnswerEvent) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
