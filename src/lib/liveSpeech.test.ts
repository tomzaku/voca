import { describe, expect, it } from 'vitest';
import { HARMLESS_ERRORS, joinResults } from './liveSpeech';

const results = (...ts: [string, boolean][]) => Object.assign(
  ts.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })),
  {},
) as unknown as Parameters<typeof joinResults>[0];

describe('liveSpeech', () => {
  it('joins what was said and what is still being said', () => {
    expect(joinResults(results([' I like ', true], ['to drink chè', false]))).toBe('I like to drink chè');
    expect(joinResults(results(['', false]))).toBe('');
  });

  it('treats silence as nothing heard, and a broken service as a failure', () => {
    expect(HARMLESS_ERRORS.has('no-speech')).toBe(true);
    expect(HARMLESS_ERRORS.has('network')).toBe(false);
    expect(HARMLESS_ERRORS.has('not-allowed')).toBe(false);
  });
});
