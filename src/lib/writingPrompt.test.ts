import { describe, expect, it } from 'vitest';
import { pickWritingWord, sentenceUsesWord } from './writingPrompt';
import type { WordProgress } from '../types';

const p = (word: string, extra: Partial<WordProgress> = {}): WordProgress => ({ word, seenAt: '2026-01-01T00:00:00Z', ...extra });

describe('pickWritingWord', () => {
  it('asks for a word in rotation or giving trouble first', () => {
    const progress = {
      fresh: p('fresh'),
      due: p('due', { dueAt: '2026-01-02T00:00:00Z', correct: 2 }),
      done: p('done', { dueAt: '2026-01-02T00:00:00Z', mastered: true }),
    };
    expect(pickWritingWord(progress)).toBe('due');
  });
  it('falls back to any word met, skips the ones just asked and dismissed ones', () => {
    const progress = { a: p('a'), b: p('b'), gone: p('gone', { status: 'dismissed' }) };
    expect(pickWritingWord(progress, new Set(['a']))).toBe('b');
    expect(pickWritingWord({ gone: progress.gone })).toBeNull();
  });
});

describe('sentenceUsesWord', () => {
  it('accepts inflections', () => {
    expect(sentenceUsesWord('She decided to stay.', 'decide')).toBe(true);
    expect(sentenceUsesWord('Deciding is hard', 'decide')).toBe(true);
    expect(sentenceUsesWord('Two bridges crossed it', 'bridge')).toBe(true);
  });
  it('accepts a family form, and a phrase only whole', () => {
    expect(sentenceUsesWord('It was a hard decision.', 'decide', ['decision'])).toBe(true);
    expect(sentenceUsesWord('I gave up smoking', 'give up', ['gave up'])).toBe(true);
    expect(sentenceUsesWord('I gave it up', 'give up')).toBe(false);
  });
  it('rejects a sentence without it', () => {
    expect(sentenceUsesWord('The river is wide.', 'bridge')).toBe(false);
    expect(sentenceUsesWord('A cat sat.', 'cat')).toBe(true);
    expect(sentenceUsesWord('A category.', 'cat')).toBe(false);
  });
});
