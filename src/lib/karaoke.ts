// Video karaoke's rules, with no UI: which lines get sung, how long a turn
// may run, and how a run is scored. VideoShadowTab plays the song a line at a
// time and records each turn; this decides what the takes add up to.
//
// It's sing-back, not sing-along: the line plays, the video pauses, and you
// sing it with the music stopped — so the mic hears only you. The score is
// how many of the line's words came through (the dictation grade), not
// pitch: speech recognition can tell words in singing, and the song's own
// melody isn't something we have.

import type { CaptionLine } from './captions';

/** A line sung at least this well is "on target" — gentler than dictation's
 *  90, since sung words come out stretched and run together. */
export const KARAOKE_HIT = 75;

export interface KaraokeTake {
  /** The line's index in the song. */
  index: number;
  /** Words that came through, 0–100. */
  accuracy: number;
}

export interface KaraokeSummary {
  /** Mean accuracy over the lines sung, 0–100. */
  score: number;
  stars: 0 | 1 | 2 | 3;
  sung: number;
  hits: number;
  /** The weakest lines below target, worst first — worth another go. */
  hardest: KaraokeTake[];
}

const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** A line worth a turn: "Oh" or "Yeah" is played and passed over. */
export function singable(line: CaptionLine): boolean {
  return words(line.text) >= 2;
}

/** The lines a whole-song run sings, in order. */
export function karaokeQueue(lines: CaptionLine[]): number[] {
  return lines.flatMap((l, i) => (singable(l) ? [i] : []));
}

/**
 * The longest a turn may record: twice the line's own length (played slower,
 * longer still) plus time to start, within sensible bounds. The silence stop
 * usually ends it well before.
 */
export function turnLimitMs(line: CaptionLine, rate = 1): number {
  const ms = ((line.end - line.start) * 2 * 1000) / Math.max(0.25, rate) + 4000;
  return Math.round(Math.min(30_000, Math.max(6000, ms)));
}

export function starsFor(score: number): KaraokeSummary['stars'] {
  return score >= 90 ? 3 : score >= 75 ? 2 : score >= 55 ? 1 : 0;
}

/** The last take of each line counts — a line sung again replaces its score. */
export function summarize(takes: KaraokeTake[]): KaraokeSummary {
  const byLine = new Map<number, KaraokeTake>();
  for (const t of takes) byLine.set(t.index, t);
  const final = [...byLine.values()];
  const score = final.length ? Math.round(final.reduce((s, t) => s + t.accuracy, 0) / final.length) : 0;
  return {
    score,
    stars: final.length ? starsFor(score) : 0,
    sung: final.length,
    hits: final.filter((t) => t.accuracy >= KARAOKE_HIT).length,
    hardest: final
      .filter((t) => t.accuracy < KARAOKE_HIT)
      .sort((a, b) => a.accuracy - b.accuracy || a.index - b.index)
      .slice(0, 5),
  };
}
