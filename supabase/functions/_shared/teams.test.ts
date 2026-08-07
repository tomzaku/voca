// The scoring rules, pinned. Two of them are load-bearing for features that
// look like they're about dates rather than about arithmetic:
//
//   * A reset has to put everyone on ZERO. It only does if every term is
//     bounded by the period — which is why the streak term is counted from the
//     log here rather than read off the lifetime `streak_count`.
//   * A finished challenge has to STAY finished. It only does if the score
//     depends on nothing that keeps moving after the period closed.
//
// If either of those breaks, this file is where it shows up first.

import { describe, expect, it } from 'vitest';
import { scanLogs, scoreFrom, scoringFor, streakRun, windowFor, WINDOW_DAYS } from './teams';

/** Noon UTC on 7 August 2026, so day boundaries are never ambiguous. */
const at = (day: number, hour = 12) => new Date(Date.UTC(2026, 7, day, hour)).toISOString();
const ms = (day: number, hour = 12) => Date.UTC(2026, 7, day, hour);

/** One word's progress row, from the days it was answered on. */
const word = (...events: [day: number, ok: boolean][]) => ({
  review_log: events.map(([day, ok]) => ({ at: at(day), ok })),
});

/** The day-set streakRun walks, from day numbers in August 2026. */
const days = (...ns: number[]) => new Set(ns.map((n) => at(n).slice(0, 10)));

describe('scanLogs', () => {
  const since = ms(1, 0);
  const until = ms(7, 23);

  it('counts one point per word per day, however often it was drilled', () => {
    const { wordDays } = scanLogs(
      [word([3, true], [3, true], [3, true], [4, true]), word([4, true])],
      since,
      until,
    );
    expect(wordDays).toBe(3);
  });

  it('ignores wrong answers', () => {
    expect(scanLogs([word([3, false], [4, true])], since, until).wordDays).toBe(1);
  });

  it('drops events at both ends of the period', () => {
    const log = [word([1, true], [4, true], [9, true])];
    expect(scanLogs(log, ms(2), until).wordDays).toBe(1); // the 1st is before
    expect(scanLogs(log, since, ms(5)).wordDays).toBe(2); // the 9th is after
  });

  it('survives a missing or malformed log', () => {
    const junk = [{ review_log: null }, { review_log: [{ at: 'nonsense', ok: true }] }];
    expect(scanLogs(junk, since, until).wordDays).toBe(0);
  });

  it('reports the days the points fell on, deduped across words', () => {
    const { days: d } = scanLogs([word([3, true]), word([3, true], [5, true])], since, until);
    expect([...d].sort()).toEqual(['2026-08-03', '2026-08-05']);
  });
});

describe('streakRun', () => {
  it('counts consecutive days back from the end of the period', () => {
    expect(streakRun(days(5, 6, 7), ms(7))).toBe(3);
  });

  it("doesn't break the run over a last day that isn't over yet", () => {
    expect(streakRun(days(5, 6), ms(7))).toBe(2);
  });

  it('stops at the first gap', () => {
    expect(streakRun(days(1, 2, 6, 7), ms(7))).toBe(2);
  });

  it('is zero when nothing was studied', () => {
    expect(streakRun(days(), ms(7))).toBe(0);
  });

  it('is capped by the period, because the day-set is', () => {
    // The whole point: a 200-day lifetime streak cannot be worth 200 points
    // inside a period only a week long.
    expect(streakRun(days(1, 2, 3, 4, 5, 6, 7), ms(7))).toBe(7);
  });
});

describe('windowFor', () => {
  const now = ms(7);

  it('defaults to the rolling window', () => {
    const w = windowFor({ scored_since: null, scored_until: null }, now);
    expect(w.rolling).toBe(true);
    expect(w.closed).toBe(false);
    expect(w.since).toBe(now - WINDOW_DAYS * 86_400_000);
    expect(w.until).toBe(now);
  });

  it('counts from a reset', () => {
    const w = windowFor({ scored_since: at(5), scored_until: null }, now);
    expect(w).toMatchObject({ since: ms(5), until: now, rolling: false, closed: false });
  });

  it('scores an open challenge up to this moment, not its end date', () => {
    const w = windowFor({ scored_since: at(5), scored_until: at(9) }, now);
    expect(w.closed).toBe(false);
    expect(w.until).toBe(now);
  });

  it('freezes at the end date once it has passed', () => {
    const w = windowFor({ scored_since: at(1), scored_until: at(5) }, now);
    expect(w.closed).toBe(true);
    expect(w.until).toBe(ms(5));
  });
});

describe('a reset puts everyone on zero', () => {
  // The failure this guards against: the streak term used to come from
  // `user_settings.streak_count`, so a learner on a 40-day run would have
  // scored 40 points at the instant a team reset to "everyone level".
  it('scores nothing for practice before the reset, however long the streak', () => {
    const veteran = [word(...Array.from({ length: 7 }, (_, i) => [i + 1, true] as [number, boolean]))];
    const w = windowFor({ scored_since: at(7, 0), scored_until: null }, ms(7, 1));

    const { wordDays, days: d } = scanLogs(veteran, w.since, w.until);
    expect(scoreFrom({ wordDays, mastered: 0, streakDays: streakRun(d, w.until) })).toBe(0);
  });
});

describe('a closed challenge stays closed', () => {
  it('gives the same score however long after the end it is recomputed', () => {
    const team = { scored_since: at(1, 0), scored_until: at(5, 0) };
    const log = [word([2, true], [3, true]), word([3, true])];
    // The learner kept studying after it ended — none of it may count.
    const after = [...log, word([6, true], [7, true], [8, true])];

    const score = (now: number, rows: typeof log) => {
      const w = windowFor(team, now);
      const { wordDays, days: d } = scanLogs(rows, w.since, w.until);
      return scoreFrom({ wordDays, mastered: 0, streakDays: streakRun(d, w.until) });
    };

    const atClose = score(ms(5, 1), log);
    expect(atClose).toBeGreaterThan(0);
    expect(score(ms(9), after)).toBe(atClose);
    expect(score(ms(40), after)).toBe(atClose);
  });
});

describe('scoringFor', () => {
  const now = ms(7);

  it('tells the client the period it can explain the score with', () => {
    const team = { scored_since: at(5), scored_until: at(9) };
    const s = scoringFor(windowFor(team, now), team);
    expect(s).toMatchObject({ windowDays: null, since: at(5), until: at(9), state: 'open' });
  });

  it('reports the end date before it arrives, so a board can count down', () => {
    const team = { scored_since: at(5), scored_until: at(9) };
    expect(scoringFor(windowFor(team, now), team).until).toBe(at(9));
  });

  it('names each state', () => {
    const state = (t: { scored_since: string | null; scored_until: string | null }) =>
      scoringFor(windowFor(t, now), t).state;

    expect(state({ scored_since: null, scored_until: null })).toBe('rolling');
    expect(state({ scored_since: at(5), scored_until: null })).toBe('open');
    expect(state({ scored_since: at(9), scored_until: null })).toBe('upcoming');
    expect(state({ scored_since: at(1), scored_until: at(5) })).toBe('closed');
  });
});
