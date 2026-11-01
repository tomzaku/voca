// A question set as the editor builds it — generated, edited, saved — and,
// the part that matters most, that what the create page sends is what the
// server keeps: validated, stored as rows, read back, and dealt round a
// hunt's stations unchanged. A builder and a validator written apart drift;
// this runs the one through the other.

import { describe, expect, it } from 'vitest';
import {
  blankCustom,
  blankQuestion,
  clock,
  fromForm,
  generateQuestions,
  HUNT_PLACES,
  HUNT_TYPES,
  importQuestions,
  isPlainWord,
  makeQuestion,
  MAX_GENERATE,
  MAX_QUESTIONS,
  MAX_WORDS,
  newKey,
  parseWords,
  pickPlaces,
  problemOf,
  questionKey,
  sameQuestion,
  scramble,
  secondsUntil,
  questionsToSave,
  retype,
  toForm,
  TREASURE_IDEAS,
  type Ctx,
  type EditableQuestion,
} from './hunt';
import type { MiniWordData } from './quizShare';
import {
  buildStations,
  cleanQuestions,
  cleanTreasure,
  fromColumns,
  isCorrect,
  publicQuestion,
  questionColumns,
} from '../../supabase/functions/_shared/hunts';

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
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

/** A repeatable rand, so a failing case can be re-run. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const ctx = (extra: Partial<Ctx> = {}): Ctx => ({
  data: DATA,
  wrongPool: [...WORDS, 'castle', 'garden', 'school'],
  pictures: { river: PNG, lotus: PNG },
  rand: seeded(),
  ...extra,
});

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

describe('newKey', () => {
  it('fits the server’s picture-key shape', () => {
    for (let i = 0; i < 20; i++) expect(newKey(seeded(i + 1))).toMatch(/^[a-z0-9]{12}$/);
  });
});

describe('makeQuestion', () => {
  it('makes a meaning question with the word among four options', () => {
    const q = makeQuestion('definition', 'river', ctx())!.question;
    expect(q).toMatchObject({ type: 'definition', prompt: DATA.river.definition, answer: 'river', word: 'river' });
    expect(q.options).toHaveLength(4);
    expect(q.options!.filter((o) => o === 'river')).toHaveLength(1);
  });

  it('blanks the word out of a sentence, or gives up when there is none', () => {
    expect(makeQuestion('sentence', 'river', ctx())!.question.prompt).toBe('The _____ runs through Huế.');
    expect(makeQuestion('sentence', 'bridge', ctx())).toBeNull();
  });

  it('keeps a listening question’s word out of its prompt', () => {
    const q = makeQuestion('listen', 'river', ctx())!.question;
    expect([q.prompt, q.say]).toEqual(['', 'river']);
  });

  it('only unscrambles and spells single plain words', () => {
    expect(makeQuestion('unscramble', 'ice cream', ctx())).toBeNull();
    expect(makeQuestion('spell', 'ice cream', ctx())).toBeNull();
    expect(makeQuestion('unscramble', 'river', ctx())!.question.scrambled).toHaveLength(5);
  });

  it('makes a picture question only for a word with a picture, naming the word', () => {
    expect(makeQuestion('image', 'bridge', ctx())).toBeNull();
    const built = makeQuestion('image', 'river', ctx())!;
    expect(built.question.imageWord).toBe('river');
    expect(built.picture).toEqual({ word: 'river', data: PNG });
    expect(built.question.prompt).toBe('');
  });

  it('makes a matching board of the word and three others, each with its meaning', () => {
    const q = makeQuestion('match', 'river', ctx())!.question;
    expect(q.slots).toHaveLength(4);
    expect(q.slots).toContain('river');
    q.slots!.forEach((w, i) => expect(q.slotPrompts![i]).toBe(DATA[w].definition));
    expect([...q.options!].sort()).toEqual([...q.slots!].sort());
  });

  it('is null for a word it has no data for', () => {
    expect(makeQuestion('definition', 'nothing', ctx())).toBeNull();
  });
});

describe('generateQuestions', () => {
  it('makes as many as asked, cycling the kinds', () => {
    const qs = generateQuestions({ ...ctx(), words: WORDS, types: ['definition', 'listen'], count: 6 });
    expect(qs.map((b) => b.question.type)).toEqual(['definition', 'listen', 'definition', 'listen', 'definition', 'listen']);
  });

  it('gives a word a different kind when it comes round again', () => {
    const qs = generateQuestions({ ...ctx(), words: ['river', 'market'], types: ['definition', 'listen'], count: 4 });
    const kinds = (w: string) => qs.filter((b) => b.question.word === w).map((b) => b.question.type).sort();
    expect(kinds('river')).toEqual(['definition', 'listen']);
    expect(kinds('market')).toEqual(['definition', 'listen']);
  });

  it('falls back to the meaning when a kind can’t use a word', () => {
    const qs = generateQuestions({ ...ctx(), words: ['ice cream'], types: ['spell'], count: 1 });
    expect(qs[0].question.type).toBe('definition');
  });

  it('never makes more than the cap', () => {
    expect(generateQuestions({ ...ctx(), words: WORDS, types: HUNT_TYPES, count: 99 })).toHaveLength(MAX_GENERATE);
  });

  it('makes nothing from no words or no kinds', () => {
    expect(generateQuestions({ ...ctx(), words: [], types: HUNT_TYPES, count: 5 })).toEqual([]);
    expect(generateQuestions({ ...ctx(), words: WORDS, types: [], count: 5 })).toEqual([]);
  });
});

describe('editing', () => {
  const def = makeQuestion('definition', 'river', ctx())!.question;

  it('round-trips a question through the form unchanged in meaning', () => {
    const back = fromForm(def, toForm(def), seeded(3));
    expect(back).toMatchObject({ id: def.id, type: 'definition', prompt: def.prompt, answer: 'river' });
    expect([...back.options!].sort()).toEqual([...def.options!].sort());
  });

  it('takes a new prompt and answers, dropping blanks and repeats', () => {
    const f = { ...toForm(def), prompt: ' A stream ', answer: 'creek', wrong: ['pond', 'CREEK', '', 'Pond', 'lake'] };
    const q = fromForm(def, f, seeded());
    expect(q.prompt).toBe('A stream');
    expect([...q.options!].sort()).toEqual(['creek', 'lake', 'pond']);
  });

  it('re-scrambles an unscramble question for its new answer', () => {
    const u = makeQuestion('unscramble', 'river', ctx())!.question;
    const q = fromForm(u, { ...toForm(u), answer: 'lotus' }, seeded());
    expect([...q.scrambled!].sort().join('')).toBe('LOSTU');
  });

  it('keeps a picture question’s picture, and follows a new answer word', () => {
    const p = makeQuestion('image', 'river', ctx())!.question;
    expect(fromForm(p, toForm(p)).imageWord).toBe('river');
    expect(fromForm(p, { ...toForm(p), answer: 'Lotus' }).imageWord).toBe('lotus');
  });

  it('edits a matching board pair by pair, dropping half-filled ones', () => {
    const m = makeQuestion('match', 'river', ctx())!.question;
    const f = toForm(m);
    expect(f.pairs).toHaveLength(4);
    const q = fromForm(m, { ...f, pairs: [{ prompt: 'hot', word: 'fire' }, { prompt: 'cold', word: 'ice' }, { prompt: 'x', word: '' }] });
    expect(q.slots).toEqual(['fire', 'ice']);
    expect(q.slotPrompts).toEqual(['hot', 'cold']);
  });

  it('makes her own question typed when it has no wrong answers, with its alternatives', () => {
    const q = fromForm(blankCustom(), { prompt: 'Sky?', answer: 'blue', wrong: ['', ''], accept: ['azure', ' Blue ', ''], pairs: [] });
    expect(q.options).toBeUndefined();
    expect(q.accept).toEqual(['azure']);
    const c = fromForm(blankCustom(), { prompt: 'Sky?', answer: 'blue', wrong: ['red'], accept: ['azure'], pairs: [] });
    expect(c.options).toHaveLength(2);
    expect(c.accept).toBeUndefined();
  });
});

describe('problemOf', () => {
  it('flags what the server would refuse', () => {
    expect(problemOf(blankCustom())).toBe('noAnswer');
    expect(problemOf({ ...blankCustom(), answer: 'x' })).toBe('noPrompt');
    expect(problemOf({ type: 'definition', prompt: 'p', answer: 'x', options: ['x'] })).toBe('noWrong');
    expect(problemOf({ type: 'match', prompt: '', answer: '', slots: ['a'], slotPrompts: ['b'] })).toBe('fewPairs');
    expect(problemOf({ type: 'match', prompt: '', answer: '', slots: ['a', 'A'], slotPrompts: ['b', 'c'] })).toBe('dupWords');
  });

  it('passes every generated question', () => {
    for (const b of generateQuestions({ ...ctx(), words: WORDS, types: HUNT_TYPES, count: 30 })) {
      expect(problemOf(b.question)).toBeNull();
    }
  });
});

describe('questionsToSave', () => {
  it('sends the askable questions in order, without the editor’s made-up ids', () => {
    const qs = generateQuestions({ ...ctx(), words: WORDS, types: ['definition'], count: 3 }).map((b) => b.question);
    const sent = questionsToSave([qs[0], blankCustom(), qs[1], qs[2]]);
    expect(sent.map((q) => q.answer)).toEqual(qs.map((q) => q.answer));
    for (const q of sent) expect(q).not.toHaveProperty('id');
  });
});

describe('what the editor saves, the server keeps', () => {
  for (const treasure of TREASURE_IDEAS) {
    for (const mode of ['qr', 'world'] as const) {
      it(`${treasure} (${mode})`, () => {
        const t = cleanTreasure(treasure);
        const built = generateQuestions({ ...ctx({ rand: seeded(t.length) }), words: WORDS, types: HUNT_TYPES, count: 30 });
        const own: EditableQuestion = fromForm(blankCustom(), { prompt: 'Sky?', answer: 'grey', wrong: [], accept: ['gray'], pairs: [] });
        const sent = questionsToSave([...built.map((b) => b.question), own]);

        // Validated as the request arrives — nothing dropped…
        const clean = cleanQuestions(JSON.parse(JSON.stringify(sent)));
        expect(clean).toHaveLength(sent.length);
        // …stored as rows and read back unchanged…
        const stored = clean.map((q, i) => fromColumns({ ...questionColumns(q), id: `q${i}` }));
        stored.forEach((q, i) => expect({ ...q, id: undefined }).toEqual({ ...clean[i], id: undefined }));
        // …and dealt round the stations, every question placed.
        const stations = buildStations(stored, t, mode, Array.from({ length: t.length }, (_, i) => `C${i}`), {
          places: mode === 'world' ? pickPlaces(t.length, seeded()) : undefined,
        });
        expect(stations.flatMap((s) => s.questions)).toHaveLength(Math.min(stored.length, t.length * 12));

        // Each one answerable — by the right answer, not by a wrong one — and
        // never carrying its answer to the student.
        for (const q of stored) {
          expect(isCorrect(q, q.slots ?? q.answer)).toBe(true);
          if (q.options && !q.slots) for (const o of q.options.filter((x) => x !== q.answer)) expect(isCorrect(q, o)).toBe(false);
          const pub = publicQuestion(q);
          expect(pub).not.toHaveProperty('answer');
          expect(pub).not.toHaveProperty('slots');
          expect(pub).not.toHaveProperty('imageWord');
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
    expect(questionKey({ ...q, image: 'a' })).not.toBe(questionKey({ ...q, image: 'b' }));
    expect(questionKey({ ...q, slotPrompts: ['x'] })).not.toBe(questionKey({ ...q, slotPrompts: ['y'] }));
  });
});

describe('a question she writes herself, of any kind', () => {
  const write = (type: Parameters<typeof blankQuestion>[0], f: Partial<ReturnType<typeof toForm>>) =>
    fromForm(blankQuestion(type), { ...toForm(blankQuestion(type)), ...f }, seeded());

  it('starts blank and flagged until filled in', () => {
    for (const t of [...HUNT_TYPES, 'custom'] as const) expect(problemOf(blankQuestion(t))).not.toBeNull();
  });

  it('becomes a real question of that kind, which the server keeps', () => {
    const qs = [
      write('definition', { prompt: 'A baby cat', answer: 'kitten', wrong: ['puppy', 'calf'] }),
      write('sentence', { prompt: 'The ___ is sleeping.', answer: 'cat', wrong: ['run'] }),
      write('listen', { answer: 'umbrella', wrong: ['umpire'] }),
      write('unscramble', { prompt: 'You hold it in the rain', answer: 'umbrella' }),
      write('spell', { answer: 'necessary' }),
      write('image', { answer: 'River', wrong: ['lake'] }),
      write('match', { pairs: [{ prompt: 'hot', word: 'fire' }, { prompt: 'cold', word: 'ice' }] }),
      write('custom', { prompt: 'Capital of Vietnam?', answer: 'Hanoi', accept: ['Ha Noi'] }),
    ];
    for (const q of qs) expect(problemOf(q), q.type).toBeNull();
    expect(qs[2].say).toBe('umbrella');
    expect(qs[3].scrambled).toHaveLength(8);
    expect(qs[4].say).toBe('necessary');
    expect(qs[5].imageWord).toBe('river');
    const kept = cleanQuestions(JSON.parse(JSON.stringify(questionsToSave(qs))));
    expect(kept.map((q) => q.type)).toEqual(qs.map((q) => q.type));
    for (const q of kept) expect(isCorrect(q, q.slots ?? q.answer)).toBe(true);
  });

  it('needs its wrong answers where students pick', () => {
    expect(problemOf(write('definition', { prompt: 'A baby cat', answer: 'kitten' }))).toBe('noWrong');
    expect(problemOf(write('listen', { answer: 'umbrella' }))).toBe('noWrong');
  });
});

describe('importing questions from other sets', () => {
  const q = (id: string, answer: string, prompt = `Means ${answer}?`): EditableQuestion => ({ id, type: 'custom', prompt, answer });

  it('adds fresh copies after hers, skipping ones she already has', () => {
    const mine = [q('a', 'cat')];
    const out = importQuestions(mine, [q('x', 'CAT', ' means cat? '), q('y', 'dog'), q('z', 'dog')]);
    expect(out.map((x) => x.answer)).toEqual(['cat', 'dog']);
    expect(out[0]).toBe(mine[0]);
    expect(out[1].id).not.toBe('y');
  });

  it('stops at what a set holds', () => {
    const full = Array.from({ length: MAX_QUESTIONS - 1 }, (_, i) => q(`m${i}`, `w${i}`));
    expect(importQuestions(full, [q('x', 'new1'), q('y', 'new2')])).toHaveLength(MAX_QUESTIONS);
  });

  it('tells a different question apart by any part of it', () => {
    expect(sameQuestion(q('a', 'cat'), q('b', 'cat'))).toBe(true);
    expect(sameQuestion(q('a', 'cat'), q('b', 'cat', 'Purrs?'))).toBe(false);
    expect(sameQuestion({ ...q('a', 'cat'), type: 'spell' }, q('b', 'cat'))).toBe(false);
  });
});

describe('changing a question’s kind', () => {
  const def: EditableQuestion = { id: 'q1', word: 'cat', type: 'definition', prompt: 'A small pet that purrs', answer: 'cat', options: ['dog', 'cat', 'cow'] };

  it('keeps the answer, the prompt and the wrong answers where the new kind has them', () => {
    const custom = retype(def, 'custom');
    expect([custom.type, custom.id, custom.word, custom.prompt, custom.answer]).toEqual(['custom', 'q1', 'cat', 'A small pet that purrs', 'cat']);
    expect([...(custom.options ?? [])].sort()).toEqual(['cat', 'cow', 'dog']);
    expect(problemOf(custom)).toBeNull();
  });

  it('drops what the new kind has no place for', () => {
    const spell = retype(def, 'spell');
    expect([spell.prompt, spell.say, spell.options]).toEqual(['', 'cat', undefined]);
    expect(problemOf(spell)).toBeNull();
    expect(retype(def, 'unscramble').scrambled).toHaveLength(3);
  });

  it('turns into a matching board of one pair, and back', () => {
    const match = retype(def, 'match');
    expect([match.slots, match.slotPrompts]).toEqual([['cat'], ['A small pet that purrs']]);
    expect(problemOf(match)).toBe('fewPairs');
    const back = retype(match, 'definition');
    expect([back.prompt, back.answer]).toEqual(['A small pet that purrs', 'cat']);
    expect(problemOf(back)).toBe('noWrong');
  });

  it('is the same question when the kind doesn’t change', () => {
    expect(retype(def, 'definition')).toBe(def);
  });
});
