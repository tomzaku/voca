// The built-in collections' practice tests (made by `npm run export:tests`):
// every built-in collection has three to five, each a fair test — the right
// answer among the choices, a scramble that is the word's own letters, and
// nothing from outside the collection asked.
import { describe, expect, it } from 'vitest';
import tests from '../../supabase/functions/_shared/builtinTests.json';
import { getCollections } from './collections';

type Q = { id: string; type: string; prompt: string; answer: string; options?: string[]; say?: string; scrambled?: string };
const all = tests as Record<string, { name: string; tests: { id: string; questions: Q[] }[] }>;
const sorted = (s: string) => [...s.toLowerCase()].sort().join('');

describe('builtinTests.json', () => {
  it('gives every built-in collection three to five tests — run `npm run export:tests` if not', () => {
    for (const c of getCollections().filter((c) => c.system)) {
      expect(all[c.id]?.tests.length, c.id).toBeGreaterThanOrEqual(3);
      expect(all[c.id].tests.length, c.id).toBeLessThanOrEqual(5);
    }
  });

  it('names each test by its collection and number, the ids the server routes on', () => {
    for (const [id, c] of Object.entries(all)) {
      c.tests.forEach((t, i) => expect(t.id).toBe(`${id}-t${i + 1}`));
    }
  });

  it('asks only fair questions about the collection’s own words', () => {
    const words = new Map(getCollections().map((c) => [c.id, new Set(c.words.map((w) => w.word))]));
    for (const [id, c] of Object.entries(all)) {
      for (const t of c.tests) {
        expect(t.questions).toHaveLength(10);
        expect(new Set(t.questions.map((q) => q.id)).size).toBe(10);
        for (const q of t.questions) {
          expect(words.get(id)!.has(q.answer), `${t.id}: ${q.answer}`).toBe(true);
          if (q.type === 'definition') {
            expect(q.options).toHaveLength(4);
            expect(q.options).toContain(q.answer);
            expect(q.prompt.length).toBeGreaterThan(12);
          } else if (q.type === 'unscramble') {
            expect(sorted(q.scrambled!)).toBe(sorted(q.answer));
            expect(q.scrambled).not.toBe(q.answer.toLowerCase());
          } else {
            expect(q.type).toBe('listen');
            expect(q.say).toBe(q.answer);
          }
        }
      }
    }
  });
});
