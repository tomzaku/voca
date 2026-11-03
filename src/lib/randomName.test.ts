import { describe, expect, it } from 'vitest';
import { randomName } from './randomName';

describe('randomName', () => {
  it('fits the buddy name and differs from the one it replaces', () => {
    for (const locale of ['en', 'vi']) {
      for (let i = 0; i < 200; i++) {
        const prev = randomName(locale);
        const next = randomName(locale, prev);
        expect(prev.length).toBeLessThanOrEqual(24);
        expect(prev.split(' ').length).toBeGreaterThanOrEqual(2);
        expect(next).not.toBe(prev);
      }
    }
  });
});
