import { describe, expect, it } from 'vitest';
import { gradeDictation, scoreAnswers } from './listeningRules';

describe('gradeDictation', () => {
  it('ignores case and punctuation', () => {
    const g = gradeDictation('Could you pass me the salt, please?', 'could you pass me the salt please');
    expect(g.accuracy).toBe(100);
    expect(g.passed).toBe(true);
  });

  it('costs one missed word only that word, not everything after it', () => {
    const g = gradeDictation('She takes the bus to work every day.', 'She takes bus to work every day');
    expect(g.words.filter((w) => !w.ok).map((w) => w.word)).toEqual(['the']);
    expect(g.accuracy).toBe(88);
    expect(g.passed).toBe(false);
  });

  it('counts extra words against the score', () => {
    expect(gradeDictation('I like tea', 'I really really like tea').accuracy).toBe(60);
  });

  it('scores nothing typed as zero', () => {
    expect(gradeDictation('I like tea', '').accuracy).toBe(0);
  });
});

describe('scoreAnswers', () => {
  it('counts right answers and treats unanswered as wrong', () => {
    const qs = [{ correctIndex: 1 }, { correctIndex: 0 }, { correctIndex: 2 }];
    expect(scoreAnswers(qs, [1, 0, null])).toBe(2);
  });
});
