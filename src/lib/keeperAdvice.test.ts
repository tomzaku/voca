import { describe, expect, it } from 'vitest';
import { vocabularyAdvice } from './keeperAdvice';

const list = { name: 'Level 2', pct: 1 };

describe('vocabularyAdvice', () => {
  it('asks a newcomer to pick a list before anything else', () => {
    expect(vocabularyAdvice({ chosen: false, due: 40, collection: list }).action).toBe('collections');
  });
  it('sends you to clear due words first, a sitting at a time', () => {
    const a = vocabularyAdvice({ chosen: true, due: 265, collection: list });
    expect(a.action).toBe('review');
    expect(a.values).toMatchObject({ due: 265, n: 20 });
  });
  it('suggests new words from your list when nothing is due', () => {
    const a = vocabularyAdvice({ chosen: true, due: 0, collection: list });
    expect(a.action).toBe('learn');
    expect(a.values.name).toBe('Level 2');
  });
  it('suggests another list once yours is finished', () => {
    expect(vocabularyAdvice({ chosen: true, due: 0, collection: { name: 'A', pct: 100 } }).action).toBe('collections');
  });
  it('opens with how the last activity went, and cheers a perfect one', () => {
    expect(vocabularyAdvice({ chosen: true, due: 0, collection: list, recap: { right: 8, total: 10 } }).recapId).toBe('world.kvRecap');
    expect(vocabularyAdvice({ chosen: true, due: 0, collection: list, recap: { right: 5, total: 5 } }).recapId).toBe('world.kvRecapPerfect');
    expect(vocabularyAdvice({ chosen: true, due: 0, collection: list, recap: { right: 0, total: 0 } }).recapId).toBeUndefined();
  });
});
