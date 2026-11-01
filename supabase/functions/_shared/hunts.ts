// The rules of a treasure hunt — the pure half of the `hunts` function, kept
// here so they can be read (and tested, in hunts.test.ts) without a database.
//
// A hunt is N stations and a treasure word of N letters. Each team walks the
// same stations in its own order (so the two teams aren't standing at the same
// card copying each other), and at each one:
//
//   find   — scan the station's card (classroom) or reach its landmark (world)
//   solve  — `need` DIFFERENT teammates each answer a question correctly, so
//            one strong student can't carry the team
//   →        the station gives up one letter of the treasure
//
// With every letter in hand the team is at the `final`: unscramble them into
// the treasure word. The first team to type it wins.
//
// Nothing about the race is stored. The state is replayed from the event log
// on every read (`teamState`), which is what lets two teammates answer at the
// same moment without a lock: both append, and the replay counts both.
//
// No imports, on purpose: the edge function and vitest both load this file.

export type QuestionType = 'definition' | 'sentence' | 'listen' | 'unscramble' | 'spell';
export const QUESTION_TYPES: QuestionType[] = ['definition', 'sentence', 'listen', 'unscramble', 'spell'];

/** One question, answer included. Stored on the hunt; never sent as-is. */
export interface StoredQuestion {
  type: QuestionType;
  /** What the student reads: a definition, or a sentence with a blank. */
  prompt: string;
  /** Multiple choice. Absent means the answer is typed. */
  options?: string[];
  /** Text to read aloud (listen, spell). */
  say?: string;
  /** The answer's letters, shuffled (unscramble). */
  scrambled?: string;
  answer: string;
}

export interface Station {
  /** What's printed under the QR code, and what the QR link carries. Server-made. */
  card: string;
  /** World mode: the landmark (a `places` id) that opens this station. */
  place: string | null;
  /** Where to look for this station — the teacher's own words. Shown on arrival
   *  at the previous station, so reading it is part of the challenge. */
  clue: string;
  /** The treasure letter this station gives up. Server-assigned. */
  letter: string;
  questions: StoredQuestion[];
}

export type Team = 0 | 1;
export const TEAMS: Team[] = [0, 1];

export type EventKind = 'found' | 'solve' | 'miss' | 'finish';

export interface HuntEvent {
  team: number;
  /** Index into the stations; FINAL for the treasure. */
  station: number;
  player_id: string | null;
  kind: EventKind;
  at: string;
}

export interface Player {
  id: string;
  name: string;
  team: number;
  joined_at: string;
}

/** The station index used for the treasure itself. */
export const FINAL = -1;

/** How long a wrong answer locks that student out of answering again. */
export const COOLDOWN_MS = 10_000;

export const MIN_STATIONS = 3;
export const MAX_STATIONS = 8;
export const MAX_QUESTIONS = 12;
export const MAX_PLAYERS = 80;
export const MAX_NAME = 30;
export const MAX_TITLE = 80;
export const MAX_CLUE = 160;
export const MAX_PROMPT = 400;
export const MAX_OPTIONS = 6;
export const MAX_ANSWER = 40;

// Codes are read off a projector or a card and typed in, so the alphabet drops
// the characters that get confused for each other (0/O, 1/I/L).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length: number, bytes: Uint8Array): string {
  return [...bytes.slice(0, length)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/**
 * The order a team visits the stations in. Team 0 walks them as listed; team
 * 1 starts halfway round. Both visit every station once, but never the same
 * one at the same time, unless one team is far ahead.
 */
export function stationOrder(team: number, n: number): number[] {
  const shift = team === 0 ? 0 : Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i) => (i + shift) % n);
}

/** Correct answers a station needs, from a team of `size`. Never more than the team has. */
export function needFor(need: number, size: number): number {
  return Math.max(1, Math.min(need, size));
}

/**
 * How answers are compared: case, outer spaces, runs of spaces, and curly
 * apostrophes (a phone keyboard's default) don't count.
 */
export function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
}

export function isCorrect(q: { answer: string }, given: string): boolean {
  return normalize(given) === normalize(q.answer);
}

/**
 * The letters a team has collected, as they're shown at the final: in
 * alphabetical order, so they're an anagram to solve whichever order the team
 * walked in. (Team 0 collects the letters in the word's own order otherwise.)
 */
export function shownLetters(letters: string[]): string[] {
  return [...letters].sort();
}

export type Phase = 'find' | 'solve' | 'final' | 'done';

export interface TeamState {
  team: number;
  phase: Phase;
  /** Stations completed. */
  position: number;
  /** The station being found or solved; null at the final and after. */
  station: number | null;
  /** Players who've answered the current station correctly. */
  solvedBy: string[];
  /** How many correct answers the current station needs. */
  need: number;
  /** Letters collected, in the order the team collected them. */
  letters: string[];
  finishedAt: string | null;
}

/**
 * A team's place in the race, replayed from the log.
 *
 * Events are trusted to be in the order they happened (the log's id order).
 * Ones that don't fit the replay — a second `found` for the same station, a
 * solve by someone already counted — are ignored rather than rejected, so a
 * race between two requests can never wedge a team.
 */
export function teamState(
  stations: Station[],
  team: number,
  needSetting: number,
  players: Player[],
  events: HuntEvent[],
): TeamState {
  const size = players.filter((p) => p.team === team).length;
  const need = needFor(needSetting, size);
  const mine = events.filter((e) => e.team === team);
  const order = stationOrder(team, stations.length);
  const letters: string[] = [];

  for (let position = 0; position < order.length; position++) {
    const s = order[position];
    const here = mine.filter((e) => e.station === s);
    if (!here.some((e) => e.kind === 'found')) {
      return { team, phase: 'find', position, station: s, solvedBy: [], need, letters, finishedAt: null };
    }
    const solvedBy = [...new Set(here.filter((e) => e.kind === 'solve' && e.player_id).map((e) => e.player_id!))];
    if (solvedBy.length < need) {
      return { team, phase: 'solve', position, station: s, solvedBy, need, letters, finishedAt: null };
    }
    letters.push(stations[s].letter);
  }

  const finish = mine.find((e) => e.kind === 'finish');
  return {
    team,
    phase: finish ? 'done' : 'final',
    position: order.length,
    station: null,
    solvedBy: [],
    need,
    letters,
    finishedAt: finish?.at ?? null,
  };
}

/** When `player` may answer at `station` again, or null if they may now. */
export function cooldownUntil(events: HuntEvent[], player: string, station: number, now: number): string | null {
  let last = -Infinity;
  for (const e of events) {
    if (e.kind === 'miss' && e.player_id === player && e.station === station) {
      last = Math.max(last, Date.parse(e.at));
    }
  }
  const until = last + COOLDOWN_MS;
  return until > now ? new Date(until).toISOString() : null;
}

/**
 * Which of a station's questions a player is asked. Teammates get different
 * ones (by their place in the team's roster), and each miss moves the player on
 * to the next, so guessing through the options of one question doesn't work.
 */
export function questionIndex(
  station: number,
  pool: number,
  players: Player[],
  player: Player,
  events: HuntEvent[],
): number {
  const team = players
    .filter((p) => p.team === player.team)
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at) || a.id.localeCompare(b.id));
  const slot = Math.max(0, team.findIndex((p) => p.id === player.id));
  const misses = events.filter((e) => e.kind === 'miss' && e.player_id === player.id && e.station === station).length;
  // The station's own index spreads teams' first questions apart too.
  return (slot + misses + station) % Math.max(1, pool);
}

/** What a student's screen gets: everything but the answer. */
export interface PublicQuestion {
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  say: string | null;
  scrambled: string | null;
  /** Letters in the answer, for typed answers — the boxes to fill. */
  length: number | null;
}

export function publicQuestion(q: StoredQuestion): PublicQuestion {
  return {
    type: q.type,
    prompt: q.prompt,
    options: q.options ?? null,
    say: q.say ?? null,
    scrambled: q.scrambled ?? null,
    length: q.options ? null : q.answer.length,
  };
}

/** Which team a new player joins: the smaller one, team 0 on a tie. */
export function teamForNewPlayer(players: Player[]): Team {
  const red = players.filter((p) => p.team === 0).length;
  const blue = players.filter((p) => p.team === 1).length;
  return blue < red ? 1 : 0;
}

export interface Outcome {
  /** No more answers are taken. */
  over: boolean;
  /** The winning team, or null for a draw / not decided yet. */
  winner: number | null;
}

/**
 * Who won. The first team to open the treasure; if the time runs out before
 * either does, the one further along; level is a draw. The race stays open
 * after a winner so the other team can still finish.
 */
export function outcome(
  states: TeamState[],
  hunt: { status: string; ends_at: string | null },
  now: number,
): Outcome {
  const finished = states
    .filter((s) => s.finishedAt)
    .sort((a, b) => a.finishedAt!.localeCompare(b.finishedAt!));
  const timeUp = hunt.ends_at !== null && Date.parse(hunt.ends_at) <= now;
  const over = hunt.status === 'ended' || (hunt.status === 'live' && timeUp) || finished.length === states.length;
  if (finished.length) return { over, winner: finished[0].team };
  if (!over || hunt.status === 'lobby') return { over, winner: null };
  const [a, b] = states;
  if (!a || !b || a.position === b.position) return { over, winner: null };
  return { over, winner: a.position > b.position ? a.team : b.team };
}

/** Whether the hunt is taking answers right now. */
export function isLive(hunt: { status: string; ends_at: string | null }, now: number): boolean {
  return hunt.status === 'live' && (hunt.ends_at === null || Date.parse(hunt.ends_at) > now);
}

// ── Validating what a teacher sends ─────────────────────────────────────────

export class Invalid extends Error {}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** A–Z only, 3–8 letters, upper-cased: one letter per station. */
export function cleanTreasure(v: unknown): string {
  const t = str(v, 20).toUpperCase();
  if (!/^[A-Z]+$/.test(t)) throw new Invalid('The treasure word must be letters only.');
  if (t.length < MIN_STATIONS || t.length > MAX_STATIONS) {
    throw new Invalid(`The treasure word must be ${MIN_STATIONS}–${MAX_STATIONS} letters.`);
  }
  return t;
}

function cleanQuestion(v: unknown): StoredQuestion | null {
  if (!v || typeof v !== 'object') return null;
  const q = v as Record<string, unknown>;
  const type = QUESTION_TYPES.find((t) => t === q.type);
  const answer = str(q.answer, MAX_ANSWER);
  if (!type || !answer) return null;
  const out: StoredQuestion = { type, prompt: str(q.prompt, MAX_PROMPT), answer };
  if (Array.isArray(q.options)) {
    const options = [...new Set(q.options.map((o) => str(o, MAX_ANSWER)).filter(Boolean))].slice(0, MAX_OPTIONS);
    // A choice question whose answer isn't among its options can't be won.
    if (options.length < 2 || !options.some((o) => normalize(o) === normalize(answer))) return null;
    out.options = options;
  }
  const say = str(q.say, MAX_ANSWER * 4);
  if (say) out.say = say;
  const scrambled = str(q.scrambled, MAX_ANSWER);
  if (scrambled) out.scrambled = scrambled;
  // Nothing to read and nothing to hear is a question with no question in it.
  if (!out.prompt && !out.say && !out.scrambled) return null;
  return out;
}

/**
 * The stations a teacher sent, trusted for nothing: cut to size, every
 * question checked. The card codes and letters are the server's to assign —
 * `cards` are fresh random codes, one per station.
 */
export function cleanStations(
  raw: unknown,
  treasure: string,
  mode: 'qr' | 'world',
  cards: string[],
): Station[] {
  if (!Array.isArray(raw)) throw new Invalid('"stations" must be a list.');
  if (raw.length !== treasure.length) {
    throw new Invalid('There must be one station per letter of the treasure word.');
  }
  const places = new Set<string>();
  return raw.map((v, i) => {
    const s = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const questions = (Array.isArray(s.questions) ? s.questions : [])
      .slice(0, MAX_QUESTIONS)
      .map(cleanQuestion)
      .filter((q): q is StoredQuestion => q !== null);
    if (!questions.length) throw new Invalid(`Station ${i + 1} has no usable questions.`);
    let place: string | null = null;
    if (mode === 'world') {
      place = str(s.place, 40);
      if (!/^[a-zA-Z]+$/.test(place)) throw new Invalid(`Station ${i + 1} needs a place on the map.`);
      if (places.has(place)) throw new Invalid('Two stations can’t share one place.');
      places.add(place);
    }
    return { card: cards[i], place, clue: str(s.clue, MAX_CLUE), letter: treasure[i], questions };
  });
}

export function cleanTeamNames(v: unknown): [string, string] {
  const names = Array.isArray(v) ? v.map((n) => str(n, 24)) : [];
  return [names[0] || 'Red', names[1] || 'Blue'];
}

export function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
}
