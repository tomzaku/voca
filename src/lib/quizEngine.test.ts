import { describe, expect, it, vi } from 'vitest';
import { makeQuizConfig } from './quizConfig';
import {
  blankSentence, buildQuiz, gradeMatch, gradeMcq, recordResults,
  type MatchQuestion, type McqQuestion,
} from './quizEngine';
import type { MiniWordData } from './quizShare';

const data = (definition: string, examples: string[] = []): MiniWordData => ({ definition, examples });

const DATA: Record<string, MiniWordData> = {
  river: data('a large natural stream of water', ['The river runs through Huế.']),
  bridge: data('a structure that crosses water'),
  market: data('a place where people buy and sell', ['We met at the market.']),
  temple: data('a building for worship'),
  lotus: data('a water flower'),
};
const WORDS = Object.keys(DATA);

describe('blankSentence', () => {
  it('blanks the whole word, case-insensitively', () => {
    expect(blankSentence('The River is wide.', 'river')).toBe('The _____ is wide.');
  });
  it('ignores the word inside another word', () => {
    expect(blankSentence('Riverside walks.', 'river')).toBeNull();
  });
});

describe('buildQuiz', () => {
  it('asks every loaded word exactly once', () => {
    const config = makeQuizConfig(WORDS, ['definition', 'match', 'sentence', 'listen'], 'each', 0);
    for (let run = 0; run < 20; run++) {
      const asked = buildQuiz(config, WORDS, DATA).flatMap((q) => (q.kind === 'mcq' ? [q.word] : q.pairs.map((p) => p.word)));
      expect(asked.sort()).toEqual([...WORDS].sort());
    }
  });

  it('falls back to the definition when a word has no example to blank', () => {
    const config = makeQuizConfig(['bridge'], ['sentence'], 'each', 0);
    const [q] = buildQuiz(config, ['bridge'], DATA) as McqQuestion[];
    expect(q.type).toBe('definition');
    expect(q.prompt).toBe(DATA.bridge.definition);
  });

  it('always offers the answer among four options', () => {
    const config = makeQuizConfig(WORDS, ['definition'], 'each', 0);
    for (const q of buildQuiz(config, WORDS, DATA) as McqQuestion[]) {
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.word);
    }
  });
});

describe('grading', () => {
  it('logs each question type under the answer label progress expects', () => {
    const q = (type: McqQuestion['type']): McqQuestion => ({ kind: 'mcq', type, word: 'river', prompt: '', options: [] });
    expect(gradeMcq(q('definition'), 'river')).toEqual({ word: 'river', ok: true, via: 'choice' });
    expect(gradeMcq(q('sentence'), 'lotus')).toEqual({ word: 'river', ok: false, via: 'gap' });
    expect(gradeMcq(q('listen'), 'river').via).toBe('listen');
  });

  it('grades a match board pair by pair', () => {
    const q: MatchQuestion = { kind: 'match', pairs: WORDS.slice(0, 3).map((w) => ({ word: w, definition: DATA[w].definition })) };
    const results = gradeMatch(q, { river: 'river', bridge: 'market', market: 'bridge' });
    expect(results).toEqual([
      { word: 'river', ok: true, via: 'meaning' },
      { word: 'bridge', ok: false, via: 'meaning' },
      { word: 'market', ok: false, via: 'meaning' },
    ]);
  });

  it('records right answers as known and wrong ones as skipped', () => {
    const markWord = vi.fn();
    recordResults(markWord, [{ word: 'river', ok: true, via: 'choice' }, { word: 'lotus', ok: false, via: 'gap' }], 'u1');
    expect(markWord.mock.calls).toEqual([
      ['river', 'known', 'u1', 0, 'choice'],
      ['lotus', 'skipped', 'u1', 0, 'gap'],
    ]);
  });
});
