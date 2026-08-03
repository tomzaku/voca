// Regression tests for the "same word every time" bug.
//
// This exact defect has now shipped twice, in two languages: `dueDifficult[0]`
// in the word picker (which served "gaudy" on ~half of all rounds) and
// `order by (lapses + wrong_count) desc limit 1` in the reminder query (which
// named "pay off" in every notification). Both looked like prioritisation and
// were actually a lock.
//
// The property that matters is not "urgent items come first" — a plain argmin
// satisfies that. It's "urgent items come first AND the choice varies", and
// only the variance test below can tell those two apart.

import { describe, expect, it } from 'vitest';
import { pickSoonest } from './wordService';

interface Item {
  id: string;
  due: number;
}

/** `count` items with strictly increasing due times — no ties to hide behind. */
function items(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({ id: `w${i}`, due: i * 1000 }));
}

const dueOf = (i: Item) => i.due;
const runMany = (list: Item[], spread?: number, times = 300) =>
  new Set(Array.from({ length: times }, () => pickSoonest(list, dueOf, spread).id));

describe('pickSoonest', () => {
  it('always returns one of the items it was given', () => {
    const list = items(10);
    const ids = new Set(list.map((i) => i.id));
    for (let n = 0; n < 50; n++) {
      expect(ids.has(pickSoonest(list, dueOf).id)).toBe(true);
    }
  });

  it('varies its choice across calls — the actual bug', () => {
    // With a strict argmin this set has exactly one member, which is what
    // shipped. Ten distinct due times, 300 draws: anything less than 2 distinct
    // results means the lock is back.
    expect(runMany(items(10)).size).toBeGreaterThan(1);
  });

  it('never reaches past the soonest `spread` items', () => {
    // Variety must not come at the cost of urgency: the 6th-soonest word should
    // never be served while five more-overdue ones are waiting.
    const chosen = runMany(items(20), 5);
    expect(chosen.size).toBeGreaterThan(1);
    for (const id of chosen) {
      expect(['w0', 'w1', 'w2', 'w3', 'w4']).toContain(id);
    }
  });

  it('reduces to a strict argmin at spread 1', () => {
    // The old behaviour is the degenerate case, which documents exactly what
    // changed and keeps the ordering honest.
    expect(runMany(items(10), 1)).toEqual(new Set(['w0']));
  });

  it('sorts by due time rather than input order', () => {
    const shuffled: Item[] = [
      { id: 'late', due: 900 },
      { id: 'soon', due: 100 },
      { id: 'later', due: 5000 },
    ];
    expect(pickSoonest(shuffled, dueOf, 1).id).toBe('soon');
  });

  it('handles fewer items than the spread without going out of bounds', () => {
    const two = items(2);
    for (let n = 0; n < 50; n++) {
      expect(pickSoonest(two, dueOf, 5)).toBeDefined();
    }
    expect(runMany(two, 5).size).toBe(2);
  });

  it('returns the only item when there is one', () => {
    expect(pickSoonest(items(1), dueOf).id).toBe('w0');
  });

  it('does not mutate the caller\'s array', () => {
    // It sorts internally; sorting in place would quietly reorder the pool the
    // caller is still using.
    const list = items(5);
    const before = list.map((i) => i.id);
    for (let n = 0; n < 20; n++) pickSoonest(list, dueOf);
    expect(list.map((i) => i.id)).toEqual(before);
  });
});
