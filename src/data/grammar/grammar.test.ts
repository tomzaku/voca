import { describe, expect, it } from 'vitest';
import { bareWord, drillAnswer, GRAMMAR_LESSONS, GRAMMAR_TOPICS, lessonMatches } from '.';

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
    expect(lesson.icon).toMatch(/^lucide:[a-z0-9-]+$/);
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

  it('puts every lesson under a topic the page lists', () => {
    const topics = new Set(GRAMMAR_TOPICS.map((t) => t.topic));
    for (const l of GRAMMAR_LESSONS) expect(topics.has(l.topic), l.id).toBe(true);
    for (const t of topics) expect(GRAMMAR_LESSONS.some((l) => l.topic === t), t).toBe(true);
  });

  it('searches in either language, with or without accents', () => {
    const find = (q: string) => GRAMMAR_LESSONS.filter((l) => lessonMatches(l, q)).map((l) => l.id);
    expect(find('present perfect')).toContain('present-perfect-experience');
    expect(find('cau dieu kien')).toEqual(expect.arrayContaining(['first-conditional', 'second-conditional', 'third-conditional']));
    expect(find('Câu bị động')).toContain('passive');
    expect(find('')).toHaveLength(GRAMMAR_LESSONS.length);
    expect(find('zzzz')).toEqual([]);
  });

  it('fills a "no word" gap without leaving a dash behind', () => {
    expect(drillAnswer({ kind: 'choice', prompt: 'I love ___ music.', options: ['the', '—'], answer: 1 })).toBe('I love music.');
    expect(drillAnswer({ kind: 'choice', prompt: '___ dogs bark.', options: ['The', '—'], answer: 1 })).toBe('Dogs bark.');
  });
});
