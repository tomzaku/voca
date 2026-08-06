// The word reaches the image model: it is the strongest hint the model has
// about what to draw. Keeping it out of the drawing is the sheet prompt's job.

import { describe, expect, it } from 'vitest';
import { cellSubject } from './prompt.ts';

describe('cellSubject', () => {
  it('sends the word together with its meaning', () => {
    expect(cellSubject('bulimia', 'An eating disorder involving binges.'))
      .toBe('the word "bulimia" — An eating disorder involving binges.');
  });

  it('keeps the meaning intact, including the word itself', () => {
    // Definitions often name their own headword; nothing is blanked out now.
    expect(cellSubject('harvest', 'The harvest season, when crops are gathered.'))
      .toBe('the word "harvest" — The harvest season, when crops are gathered.');
  });

  it('falls back to the word alone when there is no definition', () => {
    expect(cellSubject('gangster')).toBe('the meaning of the word "gangster"');
    expect(cellSubject('gangster', '')).toBe('the meaning of the word "gangster"');
    expect(cellSubject('gangster', '   ')).toBe('the meaning of the word "gangster"');
  });
});
