import { describe, expect, it } from 'vitest';
import { bareWord, drillAnswer, GRAMMAR_LESSONS } from './grammar';

// Lesson content is hand-written, so these catch the slips that would break a
// drill on screen: a gap with no blank, an answer index off the end, a
// "wrong word" the player can't tap because it isn't there (or is there twice).
describe('Grammar lessons', () => {
  it('have unique ids the server accepts', () => {
    const ids = GRAMMAR_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,60}$/);
  });

  it.each(GRAMMAR_LESSONS.map((l) => [l.id, l] as const))('%s has well-formed drills', (_, lesson) => {
    expect(lesson.drills.length).toBeGreaterThanOrEqual(5);
    expect(lesson.examples.length).toBeGreaterThan(0);
    for (const d of lesson.drills) {
      if (d.kind === 'choice') {
        expect(d.prompt.split('___').length, d.prompt).toBe(2);
        expect(d.options[d.answer], d.prompt).toBeDefined();
        expect(new Set(d.options).size, d.prompt).toBe(d.options.length);
      } else if (d.kind === 'error') {
        const hits = d.sentence.split(' ').filter((t) => bareWord(t) === d.wrong);
        expect(hits.length, d.sentence).toBe(1);
        expect(d.correct, d.sentence).not.toBe(d.sentence);
      } else {
        expect(d.chunks.length, d.chunks.join(' ')).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('fills a "no word" gap without leaving a dash behind', () => {
    expect(drillAnswer({ kind: 'choice', prompt: 'I love ___ music.', options: ['the', '—'], answer: 1 })).toBe('I love music.');
    expect(drillAnswer({ kind: 'choice', prompt: '___ dogs bark.', options: ['The', '—'], answer: 1 })).toBe('Dogs bark.');
  });
});
