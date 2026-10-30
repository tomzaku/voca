import { describe, expect, it } from 'vitest';
import { announceCorrect, announceDone, announceWrong, onAnswerEvent, type AnswerEvent } from './answerEvents';

describe('answerEvents', () => {
  it('cheers a run at its steps, and a wrong answer or a finish starts it over', () => {
    const seen: AnswerEvent[] = [];
    const off = onAnswerEvent((e) => seen.push(e));
    announceDone();
    seen.length = 0;
    for (let i = 0; i < 3; i++) announceCorrect();
    expect(seen.filter((e) => e.kind === 'combo')).toEqual([{ kind: 'combo', count: 3 }]);
    announceWrong();
    announceCorrect();
    announceCorrect();
    expect(seen.filter((e) => e.kind === 'combo')).toHaveLength(1);
    off();
    announceCorrect();
    expect(seen[seen.length - 1]).toEqual({ kind: 'correct' });
  });
});
