import { describe, expect, it } from 'vitest';
import { IPA_SOUNDS } from './ipa';

// The detail page's word list *is* the spelling groups, so a word missing
// from them vanishes from the page, and one filed twice shows twice.
describe('IPA spelling groups', () => {
  it.each(IPA_SOUNDS.map((s) => [s.symbol, s] as const))('/%s/ lists each word once, chart words included', (_, sound) => {
    const words = sound.spellings.flatMap(([, ws]) => ws);
    expect(new Set(words).size).toBe(words.length);
    for (const w of sound.examples) expect(words).toContain(w);
    for (const [letters, ws] of sound.spellings) expect(ws.length, letters).toBeGreaterThan(0);
  });
});
