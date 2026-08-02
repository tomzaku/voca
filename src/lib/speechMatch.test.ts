// The matcher decides whether a spoken answer counts. Both failure directions
// are costly and they pull against each other: too strict and a correct learner
// with an accent is told they're wrong; too loose and saying a different word
// scores a point. These tests pin both edges.

import { describe, expect, it } from 'vitest';
import { normalizeSpoken, spokenMatch } from './speechMatch';

describe('normalizeSpoken', () => {
  it('strips punctuation and case that Whisper adds on its own', () => {
    expect(normalizeSpoken(' Ubiquitous. ')).toBe('ubiquitous');
  });

  it('folds accents so an accented rendering still compares equal', () => {
    expect(normalizeSpoken('café')).toBe('cafe');
  });

  it("keeps apostrophes, which carry meaning", () => {
    expect(normalizeSpoken("won't")).toBe("won't");
  });

  it('collapses whitespace to single spaces', () => {
    expect(normalizeSpoken('  go   on  ')).toBe('go on');
  });
});

describe('spokenMatch — accepting correct answers', () => {
  it('matches the bare word', () => {
    expect(spokenMatch('ebb', 'ebb')).toBe(true);
  });

  it('matches when Whisper pads the word into a sentence', () => {
    // This is the common case, not an edge case — asked for one word, Whisper
    // routinely returns a capitalised sentence with a full stop.
    expect(spokenMatch('Ubiquitous.', 'ubiquitous')).toBe(true);
    expect(spokenMatch("It's ebb.", 'ebb')).toBe(true);
  });

  it('accepts an inflected form the word data knows about', () => {
    expect(spokenMatch('running', 'run', ['running', 'ran'])).toBe(true);
  });

  it('forgives a small mishearing in a long word', () => {
    expect(spokenMatch('ubiquitious', 'ubiquitous')).toBe(true);
  });

  it('matches multi-word targets like phrasal verbs', () => {
    expect(spokenMatch('I said go on there', 'go on')).toBe(true);
  });
});

describe('spokenMatch — rejecting wrong answers', () => {
  it('rejects a different word entirely', () => {
    expect(spokenMatch('banana', 'ubiquitous')).toBe(false);
  });

  it('does not forgive edits in short words, where they change the word', () => {
    // "cat" and "cut" are one edit apart and completely different words, so
    // short targets get no budget at all.
    expect(spokenMatch('cut', 'cat')).toBe(false);
    expect(spokenMatch('bad', 'bat')).toBe(false);
  });

  it('rejects an empty or silent transcript', () => {
    expect(spokenMatch('', 'ebb')).toBe(false);
    expect(spokenMatch('   ', 'ebb')).toBe(false);
    expect(spokenMatch('...', 'ebb')).toBe(false);
  });

  it('rejects a near-miss that exceeds the budget for its length', () => {
    // Four edits against an 8-letter target (budget 2).
    expect(spokenMatch('absolute', 'abstract')).toBe(false);
  });

  it('does not match a partial phrase for a multi-word target', () => {
    expect(spokenMatch('go', 'go on')).toBe(false);
  });
});

describe('spokenMatch — budget boundaries', () => {
  it('gives a 5-letter word one edit of slack', () => {
    expect(spokenMatch('bles', 'bless')).toBe(true); // deletion, within budget
    expect(spokenMatch('blss', 'bless')).toBe(true); // substitution, within budget
    expect(spokenMatch('bxxss', 'bless')).toBe(false); // two edits, over budget
  });

  it('gives a 4-letter word none, so one edit is already a different word', () => {
    expect(spokenMatch('helo', 'hell')).toBe(false);
  });

  it('allows two edits once a word is long enough to absorb them', () => {
    expect(spokenMatch('vicarous', 'vicarious')).toBe(true);
  });
});
