import { describe, expect, it } from 'vitest';
import { gradeDictation, scoreAnswers, splitSentences, assignVoices } from './listeningRules';

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

  it('matches numbers said as words against digits, either way round', () => {
    expect(gradeDictation('I have three cats', 'I have 3 cats').accuracy).toBe(100);
    expect(gradeDictation('It costs 25 dollars', 'it costs twenty five dollars').accuracy).toBe(100);
    expect(gradeDictation('It costs twenty-five dollars', 'it costs 25 dollars').accuracy).toBe(100);
    expect(gradeDictation('The 3rd floor at 3:30', 'the third floor at three thirty').accuracy).toBe(100);
    expect(gradeDictation('About 1,200 people, 50%', 'about one thousand two hundred people fifty percent').accuracy).toBe(100);
    expect(gradeDictation('OK, see you', 'okay see you').accuracy).toBe(100);
  });

  it('shows the sentence as written and marks a number wrong only if it was misheard', () => {
    const g = gradeDictation('Wait 25 minutes', 'wait twenty minutes');
    expect(g.words).toEqual([{ word: 'wait', ok: true }, { word: '25', ok: false }, { word: 'minutes', ok: true }]);
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

describe('splitSentences', () => {
  it('splits on sentence ends and paragraph breaks', () => {
    expect(splitSentences('Hi there. How are you?\n\nFine! Thanks')).toEqual(['Hi there.', 'How are you?', 'Fine!', 'Thanks']);
  });
  it('keeps a closing quote with its sentence', () => {
    expect(splitSentences('He said "stop." Then left.')).toEqual(['He said "stop."', 'Then left.']);
  });
  it('returns nothing for blank text', () => {
    expect(splitSentences(' \n ')).toEqual([]);
  });
});

describe('assignVoices', () => {
  it('gives each speaker one voice in order of first appearance, cycling the pool', () => {
    expect(assignVoices(['Staff', 'Customer', 'Staff', 'Manager'], ['a', 'b'])).toEqual({ Staff: 'a', Customer: 'b', Manager: 'a' });
  });
});
