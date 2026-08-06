// The word reaches the image model alongside its meaning: it is the strongest
// hint the model has about what to draw, and withholding it did not stop the
// lettering it was withheld to prevent — see prompt.ts.

import { describe, expect, it } from 'vitest';
import { cellSubject } from './prompt.ts';

describe('cellSubject', () => {
  it('sends the word with its meaning, unquoted', () => {
    const subject = cellSubject('bulimia', 'An eating disorder involving binges.');
    expect(subject).toBe('bulimia — An eating disorder involving binges.');
    expect(subject).not.toContain('"');
  });

  it('sends one sense, not the whole dictionary entry', () => {
    // Two unrelated senses in a cell is what makes the model letter it: it
    // can't draw both, so it writes them instead.
    expect(cellSubject('cabinet', 'Storage unit; a group of government ministers.'))
      .toBe('cabinet — Storage unit');
    expect(cellSubject('grieve', 'Feel deep sadness, especially after a loss; cause great sorrow.'))
      .toBe('grieve — Feel deep sadness, especially after a loss');
  });

  it('keeps a meaning that names its own headword', () => {
    // Definitions often repeat the word they define; nothing is blanked out.
    expect(cellSubject('harvest', 'The harvest season, when crops are gathered.'))
      .toBe('harvest — The harvest season, when crops are gathered.');
  });

  it('falls back to the word alone when there is no definition', () => {
    expect(cellSubject('gangster')).toBe('gangster');
    expect(cellSubject('gangster', '')).toBe('gangster');
    expect(cellSubject('gangster', '   ')).toBe('gangster');
  });
});
