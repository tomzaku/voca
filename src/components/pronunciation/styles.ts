import type { PhoneStatus } from '../../lib/phonemeScore';

// Colours and verdicts shared by every pronunciation result — a word on its
// card, a sentence in Shadowing or a free answer.

export const TILE: Record<PhoneStatus, string> = {
  good: 'border-accent-green/40 bg-accent-green/10 text-accent-green',
  close: 'border-accent-orange/50 bg-accent-orange/10 text-accent-orange',
  wrong: 'border-accent-red/50 bg-accent-red/10 text-accent-red',
};
export const BAR: Record<PhoneStatus, string> = {
  good: 'bg-accent-green',
  close: 'bg-accent-orange',
  wrong: 'bg-accent-red',
};
export const TEXT: Record<PhoneStatus, string> = {
  good: 'text-accent-green',
  close: 'text-accent-orange',
  wrong: 'text-accent-red',
};
export const VERDICT_ID: Record<PhoneStatus, string> = {
  good: 'pron.verdictGood',
  close: 'pron.verdictClose',
  wrong: 'pron.verdictWrong',
};
/** The word as a whole is judged a little stricter than one sound. */
export const tone = (score: number): PhoneStatus => (score >= 85 ? 'good' : score >= 60 ? 'close' : 'wrong');

