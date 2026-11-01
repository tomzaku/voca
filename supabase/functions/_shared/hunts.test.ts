// The treasure hunt's rules, pinned. The ones that matter most to a class:
//
//   * Two teams never stand at the same card at the start.
//   * A station needs DIFFERENT teammates — one student answering twice
//     doesn't move the team on.
//   * The state is a replay of the log, so a duplicate or out-of-turn event
//     can never wedge a team or skip it ahead.

import { describe, expect, it } from 'vitest';
import {
  cleanStations,
  cleanTeamNames,
  cleanTreasure,
  clampInt,
  cooldownUntil,
  COOLDOWN_MS,
  FINAL,
  Invalid,
  isCorrect,
  isLive,
  needFor,
  normalize,
  outcome,
  publicQuestion,
  questionIndex,
  randomCode,
  shownLetters,
  stationOrder,
  teamForNewPlayer,
  teamState,
  type HuntEvent,
  type Player,
  type Station,
  type StoredQuestion,
} from './hunts';

const T0 = Date.parse('2026-11-01T09:00:00Z');
const at = (sec: number) => new Date(T0 + sec * 1000).toISOString();

const q = (answer: string): StoredQuestion => ({ type: 'definition', prompt: `means ${answer}`, options: [answer, 'other'], answer });

/** Stations spelling `word`, two questions each. */
function stationsFor(word: string): Station[] {
  return [...word].map((letter, i) => ({
    card: `CARD${i}`,
    place: null,
    clue: `clue ${i}`,
    letter,
    questions: [q(`a${i}`), q(`b${i}`)],
  }));
}

const players: Player[] = [
  { id: 'ann', name: 'Ann', team: 0, joined_at: at(0) },
  { id: 'bao', name: 'Bao', team: 0, joined_at: at(1) },
  { id: 'cam', name: 'Cam', team: 1, joined_at: at(2) },
  { id: 'dan', name: 'Dan', team: 1, joined_at: at(3) },
];

const ev = (team: number, station: number, kind: HuntEvent['kind'], player: string | null, sec = 0): HuntEvent =>
  ({ team, station, kind, player_id: player, at: at(sec) });

describe('stationOrder', () => {
  it('visits every station once, for both teams', () => {
    for (let n = 3; n <= 8; n++) {
      for (const team of [0, 1]) {
        expect([...stationOrder(team, n)].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      }
    }
  });

  it('starts the two teams at different stations', () => {
    for (let n = 3; n <= 8; n++) expect(stationOrder(0, n)[0]).not.toBe(stationOrder(1, n)[0]);
  });

  it('never puts the teams at the same station at the same step', () => {
    for (let n = 3; n <= 8; n++) {
      const a = stationOrder(0, n);
      const b = stationOrder(1, n);
      a.forEach((s, i) => expect(b[i]).not.toBe(s));
    }
  });
});

describe('needFor', () => {
  it('is the setting, capped by the team', () => {
    expect(needFor(2, 10)).toBe(2);
    expect(needFor(3, 2)).toBe(2);
    expect(needFor(2, 1)).toBe(1);
  });

  it('is at least one, even for an empty team', () => {
    expect(needFor(2, 0)).toBe(1);
  });
});

describe('answers', () => {
  it('ignore case, outer spaces and repeated spaces', () => {
    expect(isCorrect({ answer: 'ice cream' }, '  Ice   CREAM ')).toBe(true);
    expect(normalize('Hello')).toBe('hello');
  });

  it('treat a curly apostrophe as a straight one', () => {
    expect(isCorrect({ answer: "don't" }, 'don’t')).toBe(true);
  });

  it('are still wrong when wrong', () => {
    expect(isCorrect({ answer: 'apple' }, 'aple')).toBe(false);
  });
});

describe('teamState', () => {
  const stations = stationsFor('GOLD'); // 4 stations
  const order0 = stationOrder(0, 4); // 0,1,2,3
  const order1 = stationOrder(1, 4); // 2,3,0,1

  it('starts every team looking for its first card', () => {
    const s = teamState(stations, 1, 2, players, []);
    expect(s).toMatchObject({ phase: 'find', position: 0, station: order1[0], letters: [], need: 2 });
  });

  it('asks for answers once the card is found', () => {
    const s = teamState(stations, 0, 2, players, [ev(0, order0[0], 'found', 'ann')]);
    expect(s).toMatchObject({ phase: 'solve', station: order0[0], solvedBy: [] });
  });

  it('needs different teammates: one student solving twice is still one', () => {
    const events = [
      ev(0, 0, 'found', 'ann'),
      ev(0, 0, 'solve', 'ann'),
      ev(0, 0, 'solve', 'ann'),
    ];
    const s = teamState(stations, 0, 2, players, events);
    expect(s).toMatchObject({ phase: 'solve', station: 0, solvedBy: ['ann'] });
  });

  it('moves on and collects the letter when enough teammates have solved', () => {
    const events = [ev(0, 0, 'found', 'ann'), ev(0, 0, 'solve', 'ann'), ev(0, 0, 'solve', 'bao')];
    const s = teamState(stations, 0, 2, players, events);
    expect(s).toMatchObject({ phase: 'find', position: 1, station: 1, letters: ['G'] });
  });

  it("doesn't count the other team's events", () => {
    const events = [ev(1, 0, 'found', 'cam'), ev(1, 0, 'solve', 'cam'), ev(1, 0, 'solve', 'dan')];
    expect(teamState(stations, 0, 2, players, events)).toMatchObject({ phase: 'find', position: 0 });
  });

  it('ignores a solve for a station the team hasn’t reached', () => {
    const events = [ev(0, 3, 'found', 'ann'), ev(0, 3, 'solve', 'ann'), ev(0, 3, 'solve', 'bao')];
    expect(teamState(stations, 0, 2, players, events)).toMatchObject({ phase: 'find', position: 0, station: 0 });
  });

  it('reaches the final with every letter, then is done when the treasure is opened', () => {
    const events: HuntEvent[] = [];
    for (const s of order1) {
      events.push(ev(1, s, 'found', 'cam'), ev(1, s, 'solve', 'cam'), ev(1, s, 'solve', 'dan'));
    }
    const atFinal = teamState(stations, 1, 2, players, events);
    expect(atFinal).toMatchObject({ phase: 'final', position: 4, station: null });
    // Team 1 walks 2,3,0,1 so it collects L, D, G, O.
    expect(atFinal.letters).toEqual(['L', 'D', 'G', 'O']);
    expect(shownLetters(atFinal.letters)).toEqual(['D', 'G', 'L', 'O']);

    const done = teamState(stations, 1, 2, players, [...events, ev(1, FINAL, 'finish', 'dan', 99)]);
    expect(done).toMatchObject({ phase: 'done', finishedAt: at(99) });
  });

  it('lets a team of one play, needing just one answer', () => {
    const solo: Player[] = [{ id: 'eve', name: 'Eve', team: 0, joined_at: at(0) }];
    const s = teamState(stations, 0, 3, solo, [ev(0, 0, 'found', 'eve'), ev(0, 0, 'solve', 'eve')]);
    expect(s).toMatchObject({ phase: 'find', position: 1, need: 1 });
  });
});

describe('cooldownUntil', () => {
  const now = T0 + 5000;
  it('locks a student out for a while after a miss', () => {
    const until = cooldownUntil([ev(0, 2, 'miss', 'ann', 0)], 'ann', 2, now);
    expect(until).toBe(new Date(T0 + COOLDOWN_MS).toISOString());
  });

  it('is over once the time has passed', () => {
    expect(cooldownUntil([ev(0, 2, 'miss', 'ann', 0)], 'ann', 2, T0 + COOLDOWN_MS + 1)).toBeNull();
  });

  it('only applies to that student at that station', () => {
    expect(cooldownUntil([ev(0, 2, 'miss', 'ann', 0)], 'bao', 2, now)).toBeNull();
    expect(cooldownUntil([ev(0, 2, 'miss', 'ann', 0)], 'ann', 3, now)).toBeNull();
  });
});

describe('questionIndex', () => {
  it('gives teammates different questions', () => {
    const a = questionIndex(0, 4, players, players[0], []);
    const b = questionIndex(0, 4, players, players[1], []);
    expect(a).not.toBe(b);
  });

  it('moves a student to another question after a miss', () => {
    const before = questionIndex(1, 4, players, players[0], []);
    const after = questionIndex(1, 4, players, players[0], [ev(0, 1, 'miss', 'ann')]);
    expect(after).not.toBe(before);
  });

  it('stays inside the pool', () => {
    const misses = Array.from({ length: 9 }, () => ev(0, 1, 'miss', 'ann'));
    const i = questionIndex(1, 3, players, players[0], misses);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(3);
  });
});

describe('publicQuestion', () => {
  it('never carries the answer', () => {
    const p = publicQuestion({ type: 'definition', prompt: 'a fruit', options: ['apple', 'chair'], answer: 'apple' });
    expect(p).not.toHaveProperty('answer');
    expect(p).toMatchObject({ options: ['apple', 'chair'], length: null });
  });

  it('gives a typed question its length instead', () => {
    const p = publicQuestion({ type: 'unscramble', prompt: 'a fruit', scrambled: 'PPLAE', answer: 'apple' });
    expect(p).toMatchObject({ options: null, scrambled: 'PPLAE', length: 5 });
  });
});

describe('teamForNewPlayer', () => {
  it('fills the smaller team, red first', () => {
    expect(teamForNewPlayer([])).toBe(0);
    expect(teamForNewPlayer(players.slice(0, 1))).toBe(1);
    expect(teamForNewPlayer(players)).toBe(0);
    expect(teamForNewPlayer([players[2]])).toBe(0);
  });
});

describe('outcome', () => {
  const base = { team: 0, phase: 'find' as const, station: 0, solvedBy: [], need: 2, letters: [], finishedAt: null };
  const live = { status: 'live', ends_at: at(600) };

  it('is the first team to open the treasure', () => {
    const r = outcome([
      { ...base, team: 0, phase: 'done', position: 4, finishedAt: at(300) },
      { ...base, team: 1, phase: 'done', position: 4, finishedAt: at(200) },
    ], live, T0 + 400_000);
    expect(r).toEqual({ over: true, winner: 1 });
  });

  it('keeps the race open for the second team after a winner', () => {
    const r = outcome([
      { ...base, team: 0, phase: 'done', position: 4, finishedAt: at(300) },
      { ...base, team: 1, position: 2 },
    ], live, T0 + 310_000);
    expect(r).toEqual({ over: false, winner: 0 });
  });

  it('is the team further along when time runs out', () => {
    const r = outcome([{ ...base, team: 0, position: 1 }, { ...base, team: 1, position: 3 }], live, T0 + 601_000);
    expect(r).toEqual({ over: true, winner: 1 });
  });

  it('is a draw when level at the end', () => {
    const r = outcome([{ ...base, team: 0, position: 2 }, { ...base, team: 1, position: 2 }], { status: 'ended', ends_at: null }, T0);
    expect(r).toEqual({ over: true, winner: null });
  });

  it('is undecided while the race is on', () => {
    const r = outcome([{ ...base, team: 0, position: 1 }, { ...base, team: 1, position: 3 }], live, T0);
    expect(r).toEqual({ over: false, winner: null });
  });

  it('is undecided in the lobby', () => {
    const r = outcome([{ ...base, team: 0, position: 0 }, { ...base, team: 1, position: 0 }], { status: 'lobby', ends_at: null }, T0);
    expect(r.winner).toBeNull();
  });
});

describe('isLive', () => {
  it('is only while started and before the end', () => {
    expect(isLive({ status: 'live', ends_at: at(60) }, T0)).toBe(true);
    expect(isLive({ status: 'live', ends_at: at(60) }, T0 + 61_000)).toBe(false);
    expect(isLive({ status: 'lobby', ends_at: null }, T0)).toBe(false);
    expect(isLive({ status: 'ended', ends_at: at(60) }, T0)).toBe(false);
  });
});

describe('validation', () => {
  it('upper-cases a treasure word and bounds its length', () => {
    expect(cleanTreasure(' gold ')).toBe('GOLD');
    expect(() => cleanTreasure('go')).toThrow(Invalid);
    expect(() => cleanTreasure('treasures')).toThrow(Invalid);
    expect(() => cleanTreasure('go ld')).toThrow(Invalid);
    expect(() => cleanTreasure(42)).toThrow(Invalid);
  });

  const raw = (n: number) => Array.from({ length: n }, (_, i) => ({ clue: `under desk ${i}`, place: ['ngoMon', 'thaiHoa', 'kyDai', 'dongBa'][i], questions: [q(`w${i}`)] }));

  it('assigns the letters and cards itself', () => {
    const s = cleanStations(raw(4), 'GOLD', 'qr', ['AAAA', 'BBBB', 'CCCC', 'DDDD']);
    expect(s.map((x) => x.letter).join('')).toBe('GOLD');
    expect(s.map((x) => x.card)).toEqual(['AAAA', 'BBBB', 'CCCC', 'DDDD']);
    expect(s[0].place).toBeNull();
  });

  it('wants one station per letter', () => {
    expect(() => cleanStations(raw(3), 'GOLD', 'qr', ['A', 'B', 'C', 'D'])).toThrow(Invalid);
  });

  it('keeps places in world mode, and refuses two stations on one place', () => {
    expect(cleanStations(raw(4), 'GOLD', 'world', ['A', 'B', 'C', 'D'])[2].place).toBe('kyDai');
    const dup = raw(4).map((s) => ({ ...s, place: 'ngoMon' }));
    expect(() => cleanStations(dup, 'GOLD', 'world', ['A', 'B', 'C', 'D'])).toThrow(Invalid);
  });

  it('drops a choice question whose answer isn’t an option, and a station left with none', () => {
    const bad = raw(4);
    bad[1].questions = [{ type: 'definition', prompt: 'x', options: ['a', 'b'], answer: 'c' }];
    expect(() => cleanStations(bad, 'GOLD', 'qr', ['A', 'B', 'C', 'D'])).toThrow(/Station 2/);
  });

  it('drops a question of an unknown type', () => {
    const odd = raw(4);
    odd[0].questions = [q('ok'), { type: 'essay', prompt: 'x', answer: 'y' } as unknown as StoredQuestion];
    expect(cleanStations(odd, 'GOLD', 'qr', ['A', 'B', 'C', 'D'])[0].questions).toHaveLength(1);
  });

  it('caps the questions per station', () => {
    const many = raw(4);
    many[0].questions = Array.from({ length: 50 }, (_, i) => q(`x${i}`));
    expect(cleanStations(many, 'GOLD', 'qr', ['A', 'B', 'C', 'D'])[0].questions.length).toBeLessThanOrEqual(12);
  });

  it('defaults team names', () => {
    expect(cleanTeamNames(undefined)).toEqual(['Red', 'Blue']);
    expect(cleanTeamNames(['Pirates', ''])).toEqual(['Pirates', 'Blue']);
  });

  it('clamps numbers', () => {
    expect(clampInt(99, 1, 5, 2)).toBe(5);
    expect(clampInt('x', 1, 5, 2)).toBe(2);
    expect(clampInt(0, 1, 5, 2)).toBe(1);
  });

  it('makes codes from the unambiguous alphabet only', () => {
    const code = randomCode(6, new Uint8Array([0, 30, 31, 62, 255, 7]));
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]+$/);
  });
});
