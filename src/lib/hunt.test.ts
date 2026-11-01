// Building a hunt's stations — and, the part that matters most, that what the
// create page builds is what the server accepts. A builder and a validator
// written apart drift; this runs the one through the other.

import { describe, expect, it } from 'vitest';
import {
  buildQuestion,
  buildStations,
  HUNT_PLACES,
  HUNT_TYPES,
  isPlainWord,
  MIN_WORDS,
  pickPlaces,
  QUESTIONS_PER_STATION,
  scramble,
  TREASURE_IDEAS,
  clock,
  MAX_WORDS,
  parseWords,
  questionKey,
  secondsUntil,
  customToDraft,
  dealQuestions,
  emptyCustom,
  isComplete,
  MAX_STATION_QUESTIONS,
  type CustomQuestion,
} from './hunt';
import type { MiniWordData } from './quizShare';
import { cleanStations, cleanTreasure, isCorrect, publicQuestion } from '../../supabase/functions/_shared/hunts';

const data = (definition: string, examples: string[] = []): MiniWordData => ({ definition, examples });

const DATA: Record<string, MiniWordData> = {
  river: data('a large natural stream of water', ['The river runs through Huế.']),
  bridge: data('a structure that crosses water'),
  market: data('a place where people buy and sell', ['We met at the market.']),
  temple: data('a building for worship'),
  'ice cream': data('a frozen sweet food', ['I love ice cream.']),
  lotus: data('a water flower'),
};
const WORDS = Object.keys(DATA);

/** A repeatable rand, so a failing case can be re-run. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('scramble', () => {
  it('keeps the letters and never returns the word itself', () => {
    for (let seed = 1; seed < 50; seed++) {
      const s = scramble('river', seeded(seed));
      expect(s).not.toBe('RIVER');
      expect([...s].sort().join('')).toBe('EIRRV');
    }
  });

  it('gives up gracefully on a word of one repeated letter', () => {
    expect(scramble('aaa')).toBe('AAA');
  });

  it('still differs with a rand that always returns the same', () => {
    expect(scramble('ab', () => 0.99)).toBe('BA');
  });
});

describe('isPlainWord', () => {
  it('is letters only, three or more', () => {
    expect(isPlainWord('river')).toBe(true);
    expect(isPlainWord('ice cream')).toBe(false);
    expect(isPlainWord("don't")).toBe(false);
    expect(isPlainWord('go')).toBe(false);
  });
});

describe('buildQuestion', () => {
  const wrong = ['bridge', 'market', 'temple', 'lotus'];

  it('makes a definition question with the word among four options', () => {
    const q = buildQuestion('definition', 'river', DATA.river, wrong, seeded())!;
    expect(q.prompt).toBe(DATA.river.definition);
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain('river');
    expect(q.answer).toBe('river');
  });

  it('never offers the answer twice', () => {
    const q = buildQuestion('definition', 'river', DATA.river, ['river', ...wrong], seeded())!;
    expect(q.options!.filter((o) => o === 'river')).toHaveLength(1);
  });

  it('blanks the word out of a sentence, or gives up when there is none', () => {
    expect(buildQuestion('sentence', 'river', DATA.river, wrong)!.prompt).toBe('The _____ runs through Huế.');
    expect(buildQuestion('sentence', 'bridge', DATA.bridge, wrong)).toBeNull();
  });

  it('keeps a listening question’s word out of its prompt', () => {
    const q = buildQuestion('listen', 'river', DATA.river, wrong)!;
    expect(q.prompt).toBe('');
    expect(q.say).toBe('river');
  });

  it('only unscrambles and spells single plain words', () => {
    expect(buildQuestion('unscramble', 'ice cream', DATA['ice cream'], wrong)).toBeNull();
    expect(buildQuestion('spell', 'ice cream', DATA['ice cream'], wrong)).toBeNull();
    const u = buildQuestion('unscramble', 'river', DATA.river, wrong, seeded())!;
    expect(u.options).toBeUndefined();
    expect(u.scrambled).toHaveLength(5);
  });
});

describe('buildStations', () => {
  it('makes one station per letter, cycling through the kinds', () => {
    const s = buildStations({ words: WORDS, data: DATA, count: 6, rand: seeded() });
    expect(s).toHaveLength(6);
    expect(s.map((x) => x.type)).toEqual([...HUNT_TYPES, HUNT_TYPES[0]]);
  });

  it('fills every station with a question per word, up to the cap', () => {
    const s = buildStations({ words: WORDS, data: DATA, count: 5, rand: seeded() });
    for (const st of s) expect(st.questions).toHaveLength(Math.min(WORDS.length, QUESTIONS_PER_STATION));
  });

  it('falls back to a definition when a kind can’t use a word', () => {
    const s = buildStations({ words: WORDS, data: DATA, count: 2, types: ['spell'], rand: seeded() });
    const phrase = s[0].questions.find((q) => q.answer === 'ice cream')!;
    expect(phrase.type).toBe('definition');
  });

  it('skips words with no data, and refuses a list that’s too short', () => {
    expect(() => buildStations({ words: ['river', 'nothing', 'none', 'nada'], data: DATA, count: 3 })).toThrow();
    const ok = buildStations({ words: [...WORDS, 'missing'], data: DATA, count: 3 });
    expect(ok[0].questions.every((q) => q.answer !== 'missing')).toBe(true);
  });

  it('carries the clues and places it was given', () => {
    const s = buildStations({ words: WORDS, data: DATA, count: 3, clues: [' under the desk ', 'by the door'], places: ['ngoMon', 'kyDai', 'dongBa'] });
    expect(s.map((x) => x.clue)).toEqual(['under the desk', 'by the door', '']);
    expect(s.map((x) => x.place)).toEqual(['ngoMon', 'kyDai', 'dongBa']);
  });

  it('needs at least MIN_WORDS words', () => {
    const three = Object.fromEntries(WORDS.slice(0, MIN_WORDS - 1).map((w) => [w, DATA[w]]));
    expect(() => buildStations({ words: Object.keys(three), data: three, count: 3 })).toThrow();
  });
});

describe('what the builder makes, the server accepts', () => {
  for (const treasure of TREASURE_IDEAS) {
    for (const mode of ['qr', 'world'] as const) {
      it(`${treasure} (${mode})`, () => {
        const t = cleanTreasure(treasure);
        const stations = buildStations({
          words: WORDS,
          data: DATA,
          count: t.length,
          places: mode === 'world' ? pickPlaces(t.length, seeded(t.length)) : undefined,
          extraWrong: ['castle', 'garden', 'school'],
          rand: seeded(t.length),
        });
        // A JSON round trip, as the request makes.
        const sent = JSON.parse(JSON.stringify(stations));
        const cards = Array.from({ length: t.length }, (_, i) => `C${i}`);
        const clean = cleanStations(sent, t, mode, cards);
        // No question lost on the way in.
        clean.forEach((s, i) => expect(s.questions).toHaveLength(stations[i].questions.length));
        // And each one answerable — by the right answer, not by a wrong one.
        for (const s of clean) {
          for (const q of s.questions) {
            expect(isCorrect(q, q.answer)).toBe(true);
            if (q.options) for (const o of q.options.filter((x) => x !== q.answer)) expect(isCorrect(q, o)).toBe(false);
            expect(publicQuestion(q)).not.toHaveProperty('answer');
          }
        }
      });
    }
  }
});

describe('pickPlaces', () => {
  it('picks different known landmarks', () => {
    const p = pickPlaces(8, seeded());
    expect(new Set(p).size).toBe(8);
    for (const id of p) expect(HUNT_PLACES).toContain(id);
  });

  it('has enough landmarks for the longest treasure', () => {
    expect(HUNT_PLACES.length).toBeGreaterThanOrEqual(Math.max(...TREASURE_IDEAS.map((t) => t.length)));
  });
});

describe('secondsUntil', () => {
  const now = Date.parse('2026-11-01T09:00:00Z');
  it('counts down on the server’s clock, not the phone’s', () => {
    const ends = '2026-11-01T09:01:00Z';
    expect(secondsUntil(ends, 0, now)).toBe(60);
    // The server is 10s ahead of this phone: 10s less to go.
    expect(secondsUntil(ends, 10_000, now)).toBe(50);
  });

  it('rounds up, so “0” only shows once the time is really up', () => {
    expect(secondsUntil('2026-11-01T09:00:00.200Z', 0, now)).toBe(1);
  });

  it('is zero for the past, no time, or nonsense', () => {
    expect(secondsUntil('2026-11-01T08:00:00Z', 0, now)).toBe(0);
    expect(secondsUntil(null, 0, now)).toBe(0);
    expect(secondsUntil('soon', 0, now)).toBe(0);
  });
});

describe('clock', () => {
  it('reads as minutes and padded seconds', () => {
    expect(clock(245)).toBe('4:05');
    expect(clock(9)).toBe('0:09');
    expect(clock(-3)).toBe('0:00');
  });
});

describe('parseWords', () => {
  it('splits on lines, commas and semicolons, and tidies', () => {
    expect(parseWords(' River\nbridge, Market;;\n\n ice cream ')).toEqual(['river', 'bridge', 'market', 'ice cream']);
  });

  it('drops repeats and caps the list', () => {
    expect(parseWords('a, A, a')).toEqual(['a']);
    expect(parseWords(Array.from({ length: 50 }, (_, i) => `w${i}`).join(','))).toHaveLength(MAX_WORDS);
  });
});

describe('questionKey', () => {
  const q = { type: 'listen', prompt: '', say: 'river', scrambled: null };
  it('is the same for the same question, different for another', () => {
    expect(questionKey(q)).toBe(questionKey({ ...q }));
    expect(questionKey(q)).not.toBe(questionKey({ ...q, say: 'bridge' }));
    expect(questionKey(q)).not.toBe(questionKey({ ...q, type: 'spell' }));
  });
});

const mine = (prompt: string, answer: string, wrong: string[] = [], accept: string[] = []): CustomQuestion => ({ prompt, answer, wrong, accept });

describe('customToDraft', () => {
  it('is multiple choice when wrong answers are given', () => {
    const d = customToDraft(mine(' Capital of France? ', ' Paris ', ['London', ' ', 'Rome']), seeded());
    expect(d).toMatchObject({ type: 'custom', prompt: 'Capital of France?', answer: 'Paris' });
    expect([...d.options!].sort()).toEqual(['London', 'Paris', 'Rome']);
    expect(d.accept).toBeUndefined();
  });

  it('drops a wrong answer that repeats the right one, or another wrong one', () => {
    const d = customToDraft(mine('Q', 'cat', ['CAT', 'dog', 'Dog ']), seeded());
    expect([...d.options!].sort()).toEqual(['cat', 'dog']);
  });

  it('is typed when there are none, with its alternatives', () => {
    const d = customToDraft(mine('Sky colour?', 'blue', [], [' azure ', 'Blue', '']));
    expect(d.options).toBeUndefined();
    expect(d.accept).toEqual(['azure']);
  });
});

describe('isComplete', () => {
  it('needs a question and an answer', () => {
    expect(isComplete(emptyCustom())).toBe(false);
    expect(isComplete(mine('Q', ' '))).toBe(false);
    expect(isComplete(mine('Q', 'a'))).toBe(true);
  });
});

describe('dealQuestions', () => {
  it('deals round the stations so none is empty', () => {
    expect(dealQuestions([1, 2, 3, 4, 5], 3)).toEqual([[1, 4], [2, 5], [3]]);
    expect(dealQuestions([], 2)).toEqual([[], []]);
  });
});

describe('buildStations with the teacher’s own questions', () => {
  const six = Array.from({ length: 6 }, (_, i) => mine(`Question ${i}?`, `a${i}`, i % 2 ? [`x${i}`, `y${i}`] : []));

  it('uses only hers, no word list needed', () => {
    const s = buildStations({ source: 'mine', words: [], data: {}, custom: six, count: 3, rand: seeded() });
    expect(s.map((x) => x.type)).toEqual(['custom', 'custom', 'custom']);
    expect(s.flatMap((x) => x.questions)).toHaveLength(6);
    for (const st of s) expect(st.questions).toHaveLength(2);
  });

  it('wants at least one per station, and skips unfinished ones', () => {
    expect(() => buildStations({ source: 'mine', words: [], data: {}, custom: [six[0], six[1], emptyCustom()], count: 3 })).toThrow(/3 questions/);
  });

  it('mixes hers in first, then fills from the words', () => {
    const s = buildStations({ source: 'both', words: WORDS, data: DATA, custom: six.slice(0, 2), count: 4, rand: seeded() });
    expect(s[0].questions[0].type).toBe('custom');
    expect(s[2].questions.every((q) => q.type !== 'custom')).toBe(true);
    expect(s[0].questions.length).toBe(1 + WORDS.length);
  });

  it('ignores them when the source is the words', () => {
    const s = buildStations({ source: 'words', words: WORDS, data: DATA, custom: six, count: 3, rand: seeded() });
    expect(s.flatMap((x) => x.questions).some((q) => q.type === 'custom')).toBe(false);
  });

  it('keeps up to the server’s cap of hers on one station', () => {
    const many = Array.from({ length: 40 }, (_, i) => mine(`Q${i}`, `a${i}`));
    const s = buildStations({ source: 'mine', words: [], data: {}, custom: many, count: 3 });
    expect(Math.max(...s.map((x) => x.questions.length))).toBe(MAX_STATION_QUESTIONS);
  });

  it('survive the server’s validation, and grade as she meant', () => {
    const qs = [...six, mine('Sky colour?', 'blue', [], ['azure'])];
    const stations = buildStations({ source: 'both', words: WORDS, data: DATA, custom: qs, count: 4, rand: seeded() });
    const clean = cleanStations(JSON.parse(JSON.stringify(stations)), 'GOLD', 'qr', ['A', 'B', 'C', 'D']);
    clean.forEach((s, i) => expect(s.questions).toHaveLength(stations[i].questions.length));
    const sky = clean.flatMap((s) => s.questions).find((q) => q.prompt === 'Sky colour?')!;
    expect(isCorrect(sky, 'Azure')).toBe(true);
    expect(isCorrect(sky, 'red')).toBe(false);
    expect(JSON.stringify(publicQuestion(sky))).not.toContain('azure');
  });
});
