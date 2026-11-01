// The treasure hunt's rules, pinned. The ones that matter most to a class:
//
//   * Two teams never stand at the same card at the start.
//   * A station needs DIFFERENT teammates — one student answering twice
//     doesn't move the team on.
//   * The state is a replay of the log, so a duplicate or out-of-turn event
//     can never wedge a team or skip it ahead.

import { describe, expect, it } from 'vitest';
import {
  buildStations,
  cleanQuestions,
  dealQuestions,
  fromColumns,
  givenText,
  MAX_SET_QUESTIONS,
  MAX_STATION_QUESTIONS,
  questionColumns,
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
  soloOrder,
  soloOutcome,
  soloStandings,
  soloState,
  rosterSlot,
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

describe('cleanQuestions', () => {
  it('keeps the usable ones, in her order', () => {
    const qs = cleanQuestions([q('a'), { type: 'essay', prompt: 'x', answer: 'y' }, q('b'), { type: 'definition', prompt: 'x', options: ['a', 'b'], answer: 'c' }]);
    expect(qs.map((x) => x.answer)).toEqual(['a', 'b']);
  });

  it('caps a set', () => {
    expect(cleanQuestions(Array.from({ length: 200 }, (_, i) => q(`w${i}`)))).toHaveLength(MAX_SET_QUESTIONS);
  });

  it('wants a list', () => {
    expect(() => cleanQuestions('nope')).toThrow(Invalid);
  });
});

describe('dealQuestions', () => {
  it('deals round the stations so none is empty', () => {
    expect(dealQuestions([1, 2, 3, 4, 5], 3)).toEqual([[1, 4], [2, 5], [3]]);
    for (let n = 3; n <= 8; n++) {
      expect(dealQuestions(Array.from({ length: n }, (_, i) => i), n).every((s) => s.length === 1)).toBe(true);
    }
  });

  it('gives every station a mix of kinds, whatever the counts', () => {
    // A generated set: kinds cycle 0..k-1. Dealt straight, 6 kinds over 3
    // stations gave each station only 2 kinds — the bug this guards (found
    // playing a live hunt: every picture question landed on one station).
    for (const kinds of [1, 2, 3, 4, 5, 6, 7]) {
      for (let n = 3; n <= 8; n++) {
        for (const len of [n, n + 1, n + 2, 12, 20, 30, 45, 60]) {
          const qs = Array.from({ length: len }, (_, i) => i % kinds);
          const dealt = dealQuestions(qs, n, String);
          expect(dealt.flat()).toHaveLength(Math.min(len, n * MAX_STATION_QUESTIONS));
          for (const station of dealt) {
            expect(station.length).toBeGreaterThan(0);
            expect(station.length).toBeLessThanOrEqual(MAX_STATION_QUESTIONS);
            expect(new Set(station).size).toBeGreaterThanOrEqual(Math.min(kinds, station.length, 3));
          }
        }
      }
    }
  });

  it('places every question once', () => {
    const dealt = dealQuestions(Array.from({ length: 20 }, (_, i) => i), 6).flat().sort((a, b) => a - b);
    expect(dealt).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it('keeps a station under its cap, and the cap doesn’t drop a kind', () => {
    const dealt = dealQuestions(Array.from({ length: 60 }, (_, i) => i % 3), 3, String);
    expect(Math.max(...dealt.map((s) => s.length))).toBe(MAX_STATION_QUESTIONS);
    for (const station of dealt) expect(new Set(station).size).toBe(3);
  });
});

describe('buildStations', () => {
  const qs = cleanQuestions(['a', 'b', 'c', 'd', 'e'].map(q));

  it('gives each station its letter, card and clue, and a share of the questions', () => {
    const s = buildStations(qs, 'GOLD', 'qr', ['C1', 'C2', 'C3', 'C4'], { clues: [' desk ', 'door'] });
    expect(s.map((x) => x.letter).join('')).toBe('GOLD');
    expect(s.map((x) => x.card)).toEqual(['C1', 'C2', 'C3', 'C4']);
    expect(s.map((x) => x.clue)).toEqual(['desk', 'door', '', '']);
    expect(s.map((x) => x.questions.length)).toEqual([2, 1, 1, 1]);
    expect(s[0].place).toBeNull();
  });

  it('wants a question per station', () => {
    expect(() => buildStations(qs.slice(0, 3), 'GOLD', 'qr', ['A', 'B', 'C', 'D'], {})).toThrow(/at least 4/);
  });

  it('keeps places in world mode, and refuses two stations on one place', () => {
    expect(buildStations(qs, 'GOLD', 'world', ['A', 'B', 'C', 'D'], { places: ['ngoMon', 'thaiHoa', 'kyDai', 'dongBa'] })[2].place).toBe('kyDai');
    expect(() => buildStations(qs, 'GOLD', 'world', ['A', 'B', 'C', 'D'], { places: ['ngoMon', 'ngoMon', 'kyDai', 'dongBa'] })).toThrow(Invalid);
    expect(() => buildStations(qs, 'GOLD', 'world', ['A', 'B', 'C', 'D'], { places: ['ngoMon'] })).toThrow(/Station 2/);
  });
});

describe('rows', () => {
  const all = cleanQuestions([
    q('river'),
    { type: 'custom', prompt: 'Sky?', answer: 'grey', accept: ['gray'] },
    { type: 'listen', prompt: '', say: 'river', options: ['river', 'lake'], answer: 'river', word: 'river' },
    { type: 'unscramble', prompt: 'water', scrambled: 'REVIR', answer: 'river' },
    { type: 'image', prompt: '', imageWord: 'Sun', options: ['sun', 'moon'], answer: 'sun' },
    { type: 'match', prompt: '', slotPrompts: ['purrs', 'barks'], slots: ['cat', 'dog'], options: ['dog', 'cat'] },
  ]);

  it('round-trip every kind through the table’s columns unchanged', () => {
    for (const x of all) expect(fromColumns(questionColumns(x))).toEqual(x);
  });

  it('use NULL, not empty arrays, for what a question doesn’t have', () => {
    expect(questionColumns(all[0])).toMatchObject({ accept: null, say: null, image_word: null, pair_words: null });
  });

  it('keep a stored id, and give it as the picture key', () => {
    const pic = fromColumns({ ...questionColumns(all[4]), id: '11111111-2222-3333-4444-555555555555' });
    expect(publicQuestion(pic).image).toBe('11111111-2222-3333-4444-555555555555');
  });

  it('write what was given as text', () => {
    expect(givenText('river')).toBe('river');
    expect(givenText(['cat', 'dog'])).toBe('cat | dog');
  });
});

describe('a teacher’s own questions', () => {
  const typed: StoredQuestion = { type: 'custom', prompt: 'What colour is the sky?', answer: 'blue', accept: ['light blue'] };

  it('accept the answer or any listed alternative', () => {
    expect(isCorrect(typed, 'Blue')).toBe(true);
    expect(isCorrect(typed, ' light  BLUE ')).toBe(true);
    expect(isCorrect(typed, 'green')).toBe(false);
  });

  it('never send the answer or the alternatives, nor a length that would mislead', () => {
    const p = publicQuestion(typed);
    expect(p).not.toHaveProperty('answer');
    expect(p).not.toHaveProperty('accept');
    expect(JSON.stringify(p)).not.toContain('light blue');
    expect(p.length).toBeNull();
  });

  it('keep their alternatives through validation — tidied, de-duplicated, capped', () => {
    const [c] = cleanQuestions([{ type: 'custom', prompt: 'Sky?', answer: 'blue', accept: [' azure ', 'azure', 'BLUE', '', 'a', 'b', 'c', 'd', 'e'] }]);
    expect(c.accept).toEqual(['azure', 'a', 'b', 'c', 'd']);
  });

  it('drop alternatives on a multiple-choice question', () => {
    const [c] = cleanQuestions([{ type: 'custom', prompt: 'Sky?', answer: 'blue', options: ['blue', 'red'], accept: ['azure'] }]);
    expect(c.accept).toBeUndefined();
    expect(c.options).toEqual(['blue', 'red']);
  });

  it('need some question text', () => {
    expect(cleanQuestions([{ type: 'custom', prompt: '  ', answer: 'blue' }])).toEqual([]);
  });
});

describe('matching questions', () => {
  const match = { type: 'match', prompt: '', slotPrompts: ['a big grey animal', 'a pet that purrs'], slots: ['elephant', 'cat'], options: ['cat', 'dog', 'elephant'] };
  const clean = (m: unknown) => cleanQuestions([m])[0];

  it('are right only when every pair is', () => {
    const m = clean(match);
    expect(isCorrect(m, ['Elephant', ' cat'])).toBe(true);
    expect(isCorrect(m, ['cat', 'elephant'])).toBe(false);
    expect(isCorrect(m, ['elephant'])).toBe(false);
    expect(isCorrect(m, 'elephant')).toBe(false);
  });

  it('send the meanings and the bank, never the pairing', () => {
    const p = publicQuestion(clean(match));
    expect(p.slotPrompts).toEqual(match.slotPrompts);
    expect(p.options).toEqual(match.options);
    expect(p).not.toHaveProperty('slots');
    expect(p).not.toHaveProperty('answer');
  });

  it('need every word in the bank, and as many words as meanings', () => {
    expect(clean({ ...match, options: ['cat', 'dog'] })).toBeUndefined();
    expect(clean({ ...match, slots: ['cat'] })).toBeUndefined();
    expect(clean({ ...match, slotPrompts: ['one'], slots: ['cat'], options: ['cat'] })).toBeUndefined();
  });

  it('a plain answer never satisfies an array question, and vice versa', () => {
    expect(isCorrect({ answer: 'cat' }, ['cat'])).toBe(false);
  });
});

describe('picture questions', () => {
  const pic = { type: 'image', prompt: '', imageWord: 'Sun', options: ['sun', 'moon'], answer: 'sun' };

  it('keep their word, lower-cased — and never send it', () => {
    const [p] = cleanQuestions([pic]);
    expect(p.imageWord).toBe('sun');
    const pub = publicQuestion({ ...p, id: 'q1' });
    expect(pub.image).toBe('q1');
    expect(pub).not.toHaveProperty('imageWord');
  });

  it('show no picture until stored (no id to fetch it by)', () => {
    expect(publicQuestion(cleanQuestions([pic])[0]).image).toBeNull();
  });

  it('need a word that could be one, and choices', () => {
    expect(cleanQuestions([{ ...pic, imageWord: '../etc' }])).toEqual([]);
    expect(cleanQuestions([{ ...pic, imageWord: '' }])).toEqual([]);
    expect(cleanQuestions([{ ...pic, options: undefined }])).toEqual([]);
  });
});

describe('solo play', () => {
  const stations = stationsFor('CAT');
  const class3: Player[] = [
    { id: 'ann', name: 'Ann', team: 0, joined_at: at(0) },
    { id: 'bao', name: 'Bao', team: 0, joined_at: at(1) },
    { id: 'cam', name: 'Cam', team: 0, joined_at: at(2) },
  ];
  /** A player clearing a station on their own: found, then one right answer. */
  const clear = (p: string, s: number, sec = 0): HuntEvent[] => [ev(0, s, 'found', p, sec), ev(0, s, 'solve', p, sec)];

  it('spreads the class across the stations: each starts somewhere else', () => {
    expect([0, 1, 2].map((slot) => soloOrder(slot, 3)[0])).toEqual([0, 1, 2]);
    for (let n = 3; n <= 8; n++) {
      for (let slot = 0; slot < 12; slot++) {
        expect([...soloOrder(slot, n)].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      }
    }
  });

  it('places players by joining order', () => {
    expect(class3.map((p) => rosterSlot(class3, p.id))).toEqual([0, 1, 2]);
    expect(rosterSlot([...class3].reverse(), 'cam')).toBe(2);
  });

  it('counts only a player’s own finds and answers — a classmate can’t clear a station for them', () => {
    const events = [...clear('bao', 0), ...clear('cam', 0)];
    expect(soloState(stations, class3[0], class3, events)).toMatchObject({ phase: 'find', position: 0, station: 0 });
    // Ann starts at station 0; Bao at 1 — so Bao's clear of station 0 isn't his first either.
    expect(soloState(stations, class3[1], class3, events)).toMatchObject({ phase: 'find', position: 0, station: 1 });
  });

  it('needs one right answer per station, and walks on to the treasure', () => {
    const events = [...clear('ann', 0), ...clear('ann', 1), ...clear('ann', 2)];
    const s = soloState(stations, class3[0], class3, events);
    expect([s.phase, s.need, s.letters]).toEqual(['final', 1, ['C', 'A', 'T']]);
    expect(soloState(stations, class3[0], class3, [...events, ev(0, FINAL, 'finish', 'ann', 50)])).toMatchObject({ phase: 'done', finishedAt: at(50) });
  });

  it('ranks finishers by when they finished, then the rest by how far they got', () => {
    const events = [
      ...clear('ann', 0), ...clear('ann', 1),
      ...clear('bao', 1), ...clear('bao', 2), ...clear('bao', 0), ev(0, FINAL, 'finish', 'bao', 90),
      ...clear('cam', 2),
    ];
    const st = soloStandings(stations, class3, events);
    expect(st.map((x) => [x.name, x.rank])).toEqual([['Bao', 1], ['Ann', 2], ['Cam', 3]]);
  });

  it('gives level players the same rank', () => {
    const st = soloStandings(stations, class3, [...clear('ann', 0), ...clear('bao', 1)]);
    expect(st.map((x) => x.rank)).toEqual([1, 1, 3]);
  });

  it('crowns the first to open the treasure, while the race stays open for the rest', () => {
    const events = [...clear('ann', 0), ...clear('ann', 1), ...clear('ann', 2), ev(0, FINAL, 'finish', 'ann', 60)];
    const r = soloOutcome(soloStandings(stations, class3, events), { status: 'live', ends_at: at(600) }, T0 + 100_000);
    expect(r).toEqual({ over: false, champion: { id: 'ann', name: 'Ann' } });
  });

  it('is over when everyone is done', () => {
    const events = class3.flatMap((p, i) => [...[0, 1, 2].flatMap((s) => clear(p.id, s)), ev(0, FINAL, 'finish', p.id, 60 + i)]);
    expect(soloOutcome(soloStandings(stations, class3, events), { status: 'live', ends_at: at(600) }, T0).over).toBe(true);
  });

  it('when time runs out: whoever got furthest — or nobody, if level or nobody started', () => {
    const live = { status: 'live', ends_at: at(60) };
    const later = T0 + 61_000;
    expect(soloOutcome(soloStandings(stations, class3, [...clear('ann', 0), ...clear('ann', 1), ...clear('bao', 1)]), live, later))
      .toEqual({ over: true, champion: { id: 'ann', name: 'Ann' } });
    expect(soloOutcome(soloStandings(stations, class3, [...clear('ann', 0), ...clear('bao', 1)]), live, later).champion).toBeNull();
    expect(soloOutcome(soloStandings(stations, class3, []), live, later).champion).toBeNull();
  });

  it('is undecided in the lobby and with nobody there', () => {
    expect(soloOutcome([], { status: 'lobby', ends_at: null }, T0)).toEqual({ over: false, champion: null });
  });
});
