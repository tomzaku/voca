// The scoring rules for team leaderboards — the pure half of the `teams`
// function, kept here so it can be read (and tested) without a database.
//
// The board ranks on a WINDOWED score, never a lifetime total. A cumulative
// count only ever goes up, so the standings would freeze in favour of whoever
// started first and reward nobody for still turning up. The three terms are
// effort, outcome and consistency:
//
//   1 point   per word answered correctly, counted once per word per day
//   2 points  per word that reached Mastered in the period
//   1 point   per day of the streak run inside the period
//
// The score is DERIVED, not accumulated: every term is recomputed from the
// review log against the period on each read, and `team_members.score` is only
// ever a cache of that. Two things follow, and both are the point:
//
//   * A new term (quizzes, doodles, whatever comes next) applies retroactively
//     the moment it's added here. Nothing has to be backfilled.
//   * Moving the period IS the reset. Nobody's history is rewritten, so
//     clearing the period puts every score back exactly where it was.
//
// The weights and the period go to the client with every board (`scoringFor`),
// so the "how is this worked out?" tooltip can't drift from what's computed
// here.

/** The default period when a team hasn't set one: the last 30 days, rolling. */
export const WINDOW_DAYS = 30;

export const DAY_MS = 86_400_000;

export const POINTS = {
  /** One correct answer of one word on one day. Repeat drills the same day don't stack. */
  correctDay: 1,
  /** Reaching Mastered — the FSRS interval passing ~3 weeks. */
  mastered: 2,
  /** Each day of the streak run inside the period. */
  streakDay: 1,
} as const;

export interface ReviewEvent {
  at: string;
  ok: boolean;
}

/** The two columns that define a team's period. `TeamRow` satisfies this. */
export interface ScoredTeam {
  scored_since: string | null;
  scored_until: string | null;
}

/** UTC day key, the unit every "once per day" rule in here counts in. */
export function dayKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * One pass over a member's review logs, producing both day-shaped terms.
 *
 * `wordDays` is the count of distinct (word, day) pairs answered correctly.
 * Deduping per word per day matches uniqueByWord() on the dashboard calendar,
 * so a day that shows "6 words" there is worth 6 points here. Days are UTC,
 * where the calendar's are local — the only case that differs is the same word
 * drilled either side of local midnight, which is worth a point either way.
 *
 * `days` is the set those pairs fall on, which the streak term walks.
 */
export function scanLogs(
  rows: { review_log: unknown }[],
  since: number,
  until: number,
): { wordDays: number; days: Set<string> } {
  let wordDays = 0;
  const days = new Set<string>();
  for (const row of rows) {
    const log = Array.isArray(row.review_log) ? (row.review_log as ReviewEvent[]) : [];
    const mine = new Set<string>();
    for (const ev of log) {
      if (!ev?.ok || typeof ev.at !== 'string') continue;
      const t = Date.parse(ev.at);
      if (!Number.isFinite(t) || t < since || t > until) continue;
      mine.add(dayKey(t));
    }
    wordDays += mine.size;
    for (const d of mine) days.add(d);
  }
  return { wordDays, days };
}

/**
 * The streak run ending at the period's close, counted from the log rather than
 * read off `user_settings.streak_count`.
 *
 * The stored streak is a LIFETIME-current number, which breaks both of this
 * file's promises. A team resetting to zero would hand someone on a 40-day
 * streak 40 points at the instant everyone is meant to be level; and a finished
 * challenge's final board would keep moving as people's live streaks grew and
 * broke, weeks after it closed. Deriving it inside the period fixes both, and
 * caps the term at the period's length on the way past — a 200-day streak used
 * to be worth 200 points inside a "30-day" score, which quietly made the
 * rolling board a lifetime one after all.
 *
 * `streak` on the board row is still the real stored streak: that's a fact
 * about the learner, and it's displayed rather than scored.
 */
export function streakRun(days: Set<string>, until: number): number {
  let cursor = until;
  // The period's last day may not be over yet — not having studied in it
  // shouldn't read as a broken run, the same grace the app's own streak gives.
  if (!days.has(dayKey(cursor))) cursor -= DAY_MS;
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n++;
    cursor -= DAY_MS;
  }
  return n;
}

/**
 * The span a team's score is counted over.
 *
 * `until` never runs past now — a period ending next Friday is scored up to
 * this moment, and one that ended last Friday stays frozen there. `since` may
 * be later than `until`, which is a challenge that hasn't opened yet: no events
 * can fall inside it, so everyone is honestly on zero.
 */
export interface ScoreWindow {
  since: number;
  until: number;
  /** No fixed start: the default period that slides forward with today. */
  rolling: boolean;
  /** Past its close. Nothing more can be earned and the board is final. */
  closed: boolean;
}

export function windowFor(team: ScoredTeam, now: number): ScoreWindow {
  const ends = team.scored_until ? Date.parse(team.scored_until) : null;
  const starts = team.scored_since ? Date.parse(team.scored_since) : null;
  const closed = ends !== null && ends <= now;
  return {
    since: starts ?? now - WINDOW_DAYS * DAY_MS,
    until: closed ? ends : now,
    rolling: starts === null,
    closed,
  };
}

/**
 * The total, from the terms the caller has already counted. One place, so a new
 * term is added here and to `POINTS` and nowhere else.
 */
export function scoreFrom(
  parts: { wordDays: number; mastered: number; streakDays: number },
): number {
  return parts.wordDays * POINTS.correctDay +
    parts.mastered * POINTS.mastered +
    parts.streakDays * POINTS.streakDay;
}

/** What the client needs to explain the score, from the formula actually used. */
export function scoringFor(w: ScoreWindow, team: ScoredTeam) {
  return {
    windowDays: w.rolling ? WINDOW_DAYS : null,
    since: new Date(w.since).toISOString(),
    // The team's configured end, whether or not it has passed — `state` is what
    // says which. A challenge closing on Friday has to say so on Tuesday.
    until: team.scored_until,
    state: w.closed ? 'closed' : w.since > w.until ? 'upcoming' : w.rolling ? 'rolling' : 'open',
    points: POINTS,
  };
}
