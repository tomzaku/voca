import { describe, expect, it } from 'vitest';
import { cleanWordLine, splitWordList } from './wordList';

describe('splitWordList', () => {
  it('drops the trailing backslash ChatGPT copies as a Markdown line break', () => {
    expect(splitWordList('family\\\nfamily member\\\nimmediate family\\\nextended family\\\nnuclear family\\\n'))
      .toEqual(['family', 'family member', 'immediate family', 'extended family', 'nuclear family']);
  });

  it('strips bullets, numbering and emphasis', () => {
    expect(splitWordList('- **Sibling**\n* cousin\n1. `aunt`\n2) uncle\n• niece')).toEqual(['sibling', 'cousin', 'aunt', 'uncle', 'niece']);
  });

  it('keeps hyphens and apostrophes inside a word, drops a gloss after a dash or colon', () => {
    expect(cleanWordLine('mother-in-law')).toBe('mother-in-law');
    expect(cleanWordLine('Grandparents’ house.')).toBe("grandparents' house");
    expect(cleanWordLine('stepfather - a mother’s husband')).toBe('stepfather');
    expect(cleanWordLine('twin: one of two children')).toBe('twin');
    expect(cleanWordLine('heir — someone who inherits')).toBe('heir');
  });
});
