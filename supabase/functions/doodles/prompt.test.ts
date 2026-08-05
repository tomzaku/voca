// The word must not reach the image model. Seen live: a doodle for "bulimia"
// came back with "bulimia" lettered underneath it, which on a flash card is
// the answer to the question the learner is being asked.

import { describe, expect, it } from 'vitest';
import { cellSubject, maskWord } from './prompt.ts';

describe('maskWord', () => {
  it('blanks the word out of its own definition', () => {
    expect(maskWord('The harvest season, when crops are gathered.', 'harvest'))
      .toBe('The ___ season, when crops are gathered.');
  });

  it('is case-insensitive', () => {
    expect(maskWord('Bulimia is an eating disorder.', 'bulimia')).toBe('___ is an eating disorder.');
  });

  it('catches ordinary inflections', () => {
    expect(maskWord('A person who harvests crops; harvesting by hand.', 'harvest'))
      .toBe('A person who ___ crops; ___ by hand.');
  });

  it('leaves words that merely contain it alone', () => {
    // "bank" must not blank out "banker" ... but "banks" is the same word.
    expect(maskWord('Riverbank scenery.', 'bank')).toBe('Riverbank scenery.');
    expect(maskWord('Two banks of the river.', 'bank')).toBe('Two ___ of the river.');
  });

  it('matches a multi-word entry whole', () => {
    expect(maskWord('To run for office in an election.', 'run for office'))
      .toBe('To ___ in an election.');
  });

  it('survives regex metacharacters in the word', () => {
    expect(() => maskWord('anything', 'c++')).not.toThrow();
    expect(maskWord('The c++ language.', 'c++')).toContain('___');
  });

  it('returns the text unchanged for an empty word', () => {
    expect(maskWord('Some meaning.', '  ')).toBe('Some meaning.');
  });
});

describe('cellSubject', () => {
  it('describes the cell by its masked meaning', () => {
    expect(cellSubject('bulimia', 'An eating disorder involving bulimia binges.'))
      .toBe('An eating disorder involving ___ binges.');
  });

  it('never contains the word itself when a definition exists', () => {
    const subject = cellSubject('tiger', 'A large striped Asian cat, a powerful tiger predator.');
    expect(subject.toLowerCase()).not.toContain('tiger');
  });

  it('falls back to the word when there is no definition', () => {
    // The only case where the prompt's no-caption rule has to carry the load.
    expect(cellSubject('gangster')).toBe('the meaning of the word "gangster"');
    expect(cellSubject('gangster', '')).toBe('the meaning of the word "gangster"');
  });

  it('falls back when masking leaves nothing usable', () => {
    expect(cellSubject('hush', 'Hush.')).toBe('the meaning of the word "hush"');
  });
});
