// A teacher playing her own hunt through as a student, before class. The
// real game is played against the server; this is the same walk on her
// device — Team Red's route, the same questions, graded by the same rules
// (imported from the server's own module, so they can't drift) — and it
// joins nobody and records nothing.
//
// What differs, on purpose: there's no 10-second wait after a wrong answer
// (she's checking the questions, not racing), and one right answer clears a
// station (in class it takes `need` different students, which one person
// can't show).

import {
  isCorrect,
  publicQuestion,
  shownLetters,
  stationOrder,
  type PublicQuestion,
  type StoredQuestion,
} from '../../supabase/functions/_shared/hunts';
import type { HuntMode } from './huntsApi';

export interface RehearsalStation {
  index: number;
  place: string | null;
  clue: string;
  letter: string;
  questions: StoredQuestion[];
}

export interface Rehearsal {
  title: string;
  mode: HuntMode;
  treasure: string;
  need: number;
  teamNames: [string, string];
  stations: RehearsalStation[];
}

export type RehearsalPhase = 'find' | 'solve' | 'final' | 'done';

export interface RehearsalState {
  /** Stations cleared so far, along Team Red's route. */
  position: number;
  phase: RehearsalPhase;
  /** Wrong answers at the current station — which question comes next. */
  misses: number;
  letters: string[];
  /** The last answer's verdict, for the screen to show. */
  last: 'right' | 'wrong' | null;
}

export function startRehearsal(): RehearsalState {
  return { position: 0, phase: 'find', misses: 0, letters: [], last: null };
}

/** The station Team Red is at, or null at the final and after. */
export function currentStation(r: Rehearsal, s: RehearsalState): RehearsalStation | null {
  if (s.phase !== 'find' && s.phase !== 'solve') return null;
  const order = stationOrder(0, r.stations.length);
  return r.stations[order[s.position]] ?? null;
}

/** The question a student would see now — the next one in the pool after each miss. */
export function currentQuestion(r: Rehearsal, s: RehearsalState): PublicQuestion | null {
  const station = currentStation(r, s);
  if (s.phase !== 'solve' || !station?.questions.length) return null;
  return publicQuestion(station.questions[s.misses % station.questions.length]);
}

/** The card is found, or the landmark reached: on to the question. */
export function found(s: RehearsalState): RehearsalState {
  return s.phase === 'find' ? { ...s, phase: 'solve', misses: 0, last: null } : s;
}

/**
 * An answer, graded as the server grades it. Right at a station: its letter,
 * and on to the next one (or the final). Right at the final: done. Wrong:
 * the next question in the pool, or another try at the word.
 */
export function answer(r: Rehearsal, s: RehearsalState, given: string | string[]): RehearsalState {
  if (s.phase === 'final') {
    return typeof given === 'string' && isCorrect({ answer: r.treasure }, given)
      ? { ...s, phase: 'done', last: 'right' }
      : { ...s, last: 'wrong' };
  }
  const station = currentStation(r, s);
  if (s.phase !== 'solve' || !station?.questions.length) return s;
  const q = station.questions[s.misses % station.questions.length];
  if (!isCorrect(q, given)) return { ...s, misses: s.misses + 1, last: 'wrong' };
  const position = s.position + 1;
  return {
    position,
    phase: position < r.stations.length ? 'find' : 'final',
    misses: 0,
    letters: [...s.letters, station.letter],
    last: 'right',
  };
}

/** The letters as the final shows them — alphabetical, as in class. */
export function rehearsalLetters(s: RehearsalState): string[] {
  return shownLetters(s.letters);
}

/** The right answer to what's on screen, for the "show me" button. */
export function currentAnswer(r: Rehearsal, s: RehearsalState): string | null {
  if (s.phase === 'final') return r.treasure;
  const station = currentStation(r, s);
  if (s.phase !== 'solve' || !station?.questions.length) return null;
  const q = station.questions[s.misses % station.questions.length];
  return q.slots ? q.slots.join(' · ') : q.answer;
}
