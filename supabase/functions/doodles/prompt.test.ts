// The word does NOT reach the image model: given the string, the model letters
// it under (or over) the picture whatever the prompt says. Only the meaning is
// sent — see prompt.ts.

import { describe, expect, it } from 'vitest';
import { cellSubject } from './prompt.ts';

describe('cellSubject', () => {
  it('sends the meaning, and never the word itself', () => {
    const subject = cellSubject('bulimia', 'An eating disorder involving binges.');
    expect(subject).toBe('An eating disorder involving binges.');
    expect(subject).not.toContain('bulimia');
  });

  it('keeps a meaning that names its own headword', () => {
    // Definitions often repeat the word they define. Blanking it out would
    // leave a hole in the sentence the model has to draw from, and one loose
    // mention reads as prose, not as a label to letter.
    expect(cellSubject('harvest', 'The harvest season, when crops are gathered.'))
      .toBe('The harvest season, when crops are gathered.');
  });

  it('falls back to the word alone when there is no definition', () => {
    // Nothing else to go on: an unillustrated word beats a blank cell, which
    // would break the grid the crop is cut on.
    expect(cellSubject('gangster')).toBe('gangster');
    expect(cellSubject('gangster', '')).toBe('gangster');
    expect(cellSubject('gangster', '   ')).toBe('gangster');
  });
});
