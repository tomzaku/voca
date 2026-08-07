// The bucket rule is written twice: here in wordBucket(), and as the `bucket`
// generated column in supabase/migrations/20260807000000_progress_bucket.sql.
// History filters on the SQL one and the flash card labels with this one, so a
// word that reads "Struggling" on the card has to come back from the
// struggling filter.
//
// These cases are the truth table both must satisfy. If you change one, change
// the other — and if this file fails, the migration is probably now wrong too.

import { describe, expect, it } from 'vitest';
import { BUCKET_META, wordBucket } from './progress';
import type { WordProgress } from '../types';

const w = (p: Partial<WordProgress>): WordProgress => ({
  word: 'test',
  seenAt: '2026-08-01T00:00:00.000Z',
  ...p,
});

describe('wordBucket', () => {
  it('treats an unknown word as not started', () => {
    expect(wordBucket(undefined)).toBe('pending');
    expect(wordBucket(w({}))).toBe('pending');
  });

  it('puts dismissed words in their own bucket, whatever else is true', () => {
    expect(wordBucket(w({ status: 'dismissed', mastered: true, dueAt: '2026-08-02T00:00:00.000Z' })))
      .toBe('dismissed');
  });

  it('ranks mastered above every remaining state', () => {
    expect(wordBucket(w({ mastered: true, wrong: 9, correct: 1 }))).toBe('mastered');
  });

  it('counts a given-up word as struggling even with a clean tally', () => {
    expect(wordBucket(w({ status: 'skipped', correct: 5, wrong: 0 }))).toBe('difficult');
  });

  it('counts more wrong than right as struggling', () => {
    expect(wordBucket(w({ status: 'known', correct: 1, wrong: 2 }))).toBe('difficult');
  });

  it('does not count an even tally as struggling', () => {
    expect(wordBucket(w({ status: 'known', correct: 2, wrong: 2, dueAt: '2026-08-02T00:00:00.000Z' })))
      .toBe('learning');
  });

  it('treats a scheduled word as learning', () => {
    expect(wordBucket(w({ status: 'known', dueAt: '2026-08-02T00:00:00.000Z' }))).toBe('learning');
  });

  it('leaves an answered-but-unscheduled word not started', () => {
    expect(wordBucket(w({ correct: 1, wrong: 0 }))).toBe('pending');
  });
});

describe('BUCKET_META', () => {
  it('gives every bucket a distinct History tab slug', () => {
    const tabs = Object.values(BUCKET_META).map((m) => m.tab);
    expect(new Set(tabs).size).toBe(tabs.length);
  });

  // These strings are the `?tab=` values in URLs people bookmark and the
  // values stored in the SQL column — renaming one silently breaks both.
  it('keeps the published slugs stable', () => {
    expect(Object.values(BUCKET_META).map((m) => m.tab)).toEqual([
      'not-started',
      'struggling',
      'learning',
      'mastered',
      'skipped',
    ]);
  });
});
