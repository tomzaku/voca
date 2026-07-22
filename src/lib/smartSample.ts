// Smart word sampling — the Learn page's rotation applied to an arbitrary
// word list (a collection, a quiz pool). Shared by the collection quiz's
// "Smart" word source and the quiz builder's "Smart" select button; local
// fallback for the server's `pick` function with sources.smart.

import { progressLookup, wordBucket } from './progress';
import { isDue, dueTime } from './srs';

/**
 * Pick up to `count` words the way the Learn page does: each slot is a 50/50
 * mix of difficult words (last round failed, or more wrong than correct) and
 * never-answered words; when both run out, due reviews (soonest first), then
 * upcoming ones, then anything still in rotation. Dismissed words never come.
 */
export function sampleSmartWords(
  words: string[],
  count: number,
  prog: ReturnType<typeof progressLookup>,
): string[] {
  const now = Date.now();
  const picks: string[] = [];
  const taken = new Set<string>();

  for (let i = 0; i < count; i++) {
    const inRotation = words.filter(
      (w) => !taken.has(w.toLowerCase()) && wordBucket(prog(w)) !== 'dismissed',
    );
    if (!inRotation.length) break;

    const difficult = inRotation.filter((w) => wordBucket(prog(w)) === 'difficult');
    const fresh = inRotation.filter((w) => wordBucket(prog(w)) === 'pending');

    let next: string | undefined;
    // 50/50 mix of difficult and new; an empty pool yields its turn.
    const pools = Math.random() < 0.5 ? [difficult, fresh] : [fresh, difficult];
    for (const pool of pools) {
      if (!pool.length) continue;
      if (pool === difficult) {
        // Lapsed words come back promptly: due ones first, soonest first.
        const dueDifficult = pool.filter((w) => isDue(prog(w), now));
        if (dueDifficult.length) {
          dueDifficult.sort((a, b) => dueTime(prog(a)) - dueTime(prog(b)));
          next = dueDifficult[0];
          break;
        }
      }
      next = pool[Math.floor(Math.random() * pool.length)];
      break;
    }

    if (!next) {
      // Fall back to the review schedule: due first (soonest), then upcoming.
      const due = inRotation.filter((w) => isDue(prog(w), now));
      const upcoming = due.length ? due : inRotation.filter((w) => {
        const p = prog(w);
        return !!p?.dueAt && !p.mastered;
      });
      if (upcoming.length) {
        upcoming.sort((a, b) => dueTime(prog(a)) - dueTime(prog(b)));
        next = upcoming[0];
      } else {
        next = inRotation[Math.floor(Math.random() * inRotation.length)];
      }
    }

    picks.push(next);
    taken.add(next.toLowerCase());
  }
  return picks;
}
