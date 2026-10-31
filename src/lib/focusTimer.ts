// The Focus Zone's timer, with no UI attached: a pomodoro that runs work and
// breaks in turn — every third break the long one, as happy-record's focus
// zone does it — or a plain stopwatch for free focus. Time is kept as
// timestamps, not ticks, so a timer left running while its screen is closed
// (or the tab sleeps) is still right when you look again.

export type FocusMode = 'pomodoro' | 'free';
export type PhaseKind = 'work' | 'short' | 'long';

/** A pomodoro's lengths, in minutes. */
export interface Durations { work: number; short: number; long: number }

export const PRESETS: Durations[] = [
  { work: 25, short: 5, long: 15 },
  { work: 50, short: 10, long: 20 },
  { work: 15, short: 3, long: 10 },
];

/** Every third break is the long one. */
const LONG_EVERY = 3;

/** Which phase comes at `index` (0-based) of an endless pomodoro:
 *  work, break, work, break, … the third break long. */
export function phaseAt(index: number): PhaseKind {
  if (index % 2 === 0) return 'work';
  return ((index + 1) / 2) % LONG_EVERY === 0 ? 'long' : 'short';
}

export const phaseSeconds = (kind: PhaseKind, d: Durations) => d[kind] * 60;

export interface FocusState {
  mode: FocusMode;
  preset: number;
  /** Pomodoro: which phase of the endless cycle. */
  phase: number;
  running: boolean;
  /** Pomodoro, running: when the phase ends (ms since epoch). */
  endsAt: number | null;
  /** Pomodoro, paused: seconds left in the phase. */
  left: number;
  /** Free focus, running: when this stretch began. */
  since: number | null;
  /** Free focus: seconds counted before this stretch. */
  counted: number;
  /** Minutes of focus today: the day (YYYY-MM-DD) and its seconds. */
  today: { day: string; seconds: number };
  /** What you're focusing on. */
  note: string;
}

const dayOf = (now: number) => new Date(now).toLocaleDateString('en-CA');

export function initialFocus(now: number): FocusState {
  return {
    mode: 'pomodoro', preset: 0, phase: 0, running: false, endsAt: null,
    left: phaseSeconds('work', PRESETS[0]), since: null, counted: 0,
    today: { day: dayOf(now), seconds: 0 }, note: '',
  };
}

const durations = (s: FocusState) => PRESETS[s.preset] ?? PRESETS[0];

/** Seconds left in the pomodoro's phase. */
export function secondsLeft(s: FocusState, now: number): number {
  if (s.running && s.endsAt) return Math.max(0, Math.ceil((s.endsAt - now) / 1000));
  return s.left;
}

/** Seconds of free focus so far. */
export function secondsCounted(s: FocusState, now: number): number {
  return s.counted + (s.running && s.since ? Math.floor((now - s.since) / 1000) : 0);
}

/** Add focused seconds to today's total (starting a new day if it's turned). */
function credit(s: FocusState, seconds: number, now: number): FocusState['today'] {
  const day = dayOf(now);
  const base = s.today.day === day ? s.today.seconds : 0;
  return { day, seconds: base + Math.max(0, Math.round(seconds)) };
}

export function start(s: FocusState, now: number): FocusState {
  if (s.running) return s;
  if (s.mode === 'pomodoro') return { ...s, running: true, endsAt: now + s.left * 1000 };
  return { ...s, running: true, since: now };
}

export function pause(s: FocusState, now: number): FocusState {
  if (!s.running) return s;
  if (s.mode === 'pomodoro') {
    const left = secondsLeft(s, now);
    // Time spent working counts as focus when you pause, too.
    const today = phaseAt(s.phase) === 'work' ? credit(s, s.left - left, now) : s.today;
    return { ...s, running: false, endsAt: null, left, today };
  }
  const run = secondsCounted(s, now) - s.counted;
  return { ...s, running: false, since: null, counted: s.counted + run, today: credit(s, run, now) };
}

/** Back to the start of a work phase (pomodoro) or zero (free). */
export function reset(s: FocusState, now: number): FocusState {
  const paused = pause(s, now);
  return { ...paused, phase: 0, left: phaseSeconds('work', durations(s)), counted: 0 };
}

/** On to the next phase, running if it was. */
export function skip(s: FocusState, now: number): FocusState {
  const paused = pause(s, now);
  const phase = s.phase + 1;
  const next = { ...paused, phase, left: phaseSeconds(phaseAt(phase), durations(s)) };
  return s.running ? start(next, now) : next;
}

export function setMode(s: FocusState, mode: FocusMode, now: number): FocusState {
  if (s.mode === mode) return s;
  return { ...reset(s, now), mode };
}

export function setPreset(s: FocusState, preset: number, now: number): FocusState {
  return { ...reset(s, now), preset };
}

/** Move a running pomodoro on if its phase has ended. Returns the new state
 *  and the phase that just finished, if one did (for the chime). The next
 *  phase starts straight away, from when the last one ended. */
export function tick(s: FocusState, now: number): { state: FocusState; finished: PhaseKind | null } {
  if (s.mode !== 'pomodoro' || !s.running || !s.endsAt || now < s.endsAt) return { state: s, finished: null };
  const kind = phaseAt(s.phase);
  const today = kind === 'work' ? credit(s, s.left, s.endsAt) : s.today;
  const phase = s.phase + 1;
  const len = phaseSeconds(phaseAt(phase), durations(s));
  return {
    state: { ...s, phase, today, left: len, endsAt: s.endsAt + len * 1000 },
    finished: kind,
  };
}

/** Today's focus, as minutes, counting a stretch still running. */
export function minutesToday(s: FocusState, now: number): number {
  const base = s.today.day === dayOf(now) ? s.today.seconds : 0;
  let live = 0;
  if (s.running && s.mode === 'free' && s.since) live = (now - s.since) / 1000;
  if (s.running && s.mode === 'pomodoro' && phaseAt(s.phase) === 'work') live = s.left - secondsLeft(s, now);
  return Math.floor((base + live) / 60);
}

/** mm:ss, or h:mm:ss past the hour. */
export function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), sec = seconds % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
