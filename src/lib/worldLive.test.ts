import { describe, expect, it } from 'vitest';
import { cleanChat } from './worldLive';

describe('cleanChat', () => {
  it('trims, squeezes spaces and keeps chat short', () => {
    expect(cleanChat('  hi   there  ')).toBe('hi there');
    expect(cleanChat('x'.repeat(300))).toHaveLength(120);
  });

  it('stars out bad words, whole words only, in English and Vietnamese', () => {
    expect(cleanChat('what the fuck')).toBe('what the ****');
    expect(cleanChat('Shit!')).toBe('****!');
    expect(cleanChat('đéo biết')).toBe('*** biết');
    expect(cleanChat('scunthorpe and dickens')).toBe('scunthorpe and dickens');
  });
});
