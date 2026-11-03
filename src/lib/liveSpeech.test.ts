import { describe, expect, it } from 'vitest';
import { FATAL_ERRORS, joinResults } from './liveSpeech';

const results = (...ts: [string, boolean][]) => Object.assign(
  ts.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })),
  {},
) as unknown as Parameters<typeof joinResults>[0];

describe('liveSpeech', () => {
  it('joins what was said and what is still being said', () => {
    expect(joinResults(results([' I like ', true], ['to drink chè', false]))).toBe('I like to drink chè');
    expect(joinResults(results(['', false]))).toBe('');
  });

  it('gives up only when the browser refuses for good; silence and a dropped connection just end a session', () => {
    expect(FATAL_ERRORS.has('not-allowed')).toBe(true);
    expect(FATAL_ERRORS.has('no-speech')).toBe(false);
    expect(FATAL_ERRORS.has('network')).toBe(false);
  });
});
