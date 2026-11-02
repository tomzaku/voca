// How words are picked for study — the rules `pick` serves the flash cards
// with, shared with `questions` so the world's questions come from the same
// words the flash cards would choose (difficult and new first, the rest when
// they're due). Pure apart from `loadProgress`, which reads the caller's rows.
//
// Mirrors src/lib/wordService.ts (pickNextWord, sampleQuizWords) on the
// client, which runs the same rules offline; the two must stay in step.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface Prog {
  status: string | null;
  dueAt: number | null; // epoch ms
  mastered: boolean;
  correct: number;
  wrong: number;
}

export type Bucket = 'pending' | 'difficult' | 'learning' | 'mastered' | 'dismissed';

// Must match src/lib/progress.ts (wordBucket) on the client.
export function bucket(p: Prog | undefined): Bucket {
  if (p?.status === 'dismissed') return 'dismissed';
  if (p?.mastered) return 'mastered';
  if (p && (p.status === 'skipped' || p.wrong > p.correct)) return 'difficult';
  if (p?.dueAt != null) return 'learning';
  return 'pending';
}

export const isDue = (p: Prog | undefined, now: number): boolean =>
  p?.dueAt != null && !p.mastered && p.dueAt <= now;

export const dueTime = (p: Prog | undefined): number => p?.dueAt ?? Infinity;

export const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const asWords = (v: unknown, cap: number): string[] =>
  (Array.isArray(v) ? v : [])
    .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
    .map((w) => w.trim().slice(0, 100))
    .slice(0, cap);

/**
 * The soonest-due item, but sampled from the few most overdue rather than a
 * strict argmin. Always returning the single earliest means one word wins every
 * pick until it's finally answered well — which is how a hard word ends up
 * dominating the rotation instead of merely being prioritised in it.
 *
 * Mirrors pickSoonest in src/lib/wordService.ts — the two must stay in step.
 */
export function pickSoonest<T>(items: T[], dueOf: (item: T) => number, spread = 5): T {
  const sorted = [...items].sort((a, b) => dueOf(a) - dueOf(b));
  return sorted[Math.floor(Math.random() * Math.min(spread, sorted.length))];
}

/** One learn-mode pick — mirrors the client's pickNextWord. */
export function pickLearnWord(
  words: string[],
  prog: (w: string) => Prog | undefined,
  excludeLower: Set<string>,
  now: number,
): string | null {
  const inRotation = words.filter(
    (w) => !excludeLower.has(w.toLowerCase()) && bucket(prog(w)) !== 'dismissed',
  );

  const difficult = inRotation.filter((w) => bucket(prog(w)) === 'difficult');
  const fresh = inRotation.filter((w) => bucket(prog(w)) === 'pending');

  // 50/50 mix of difficult and new; an empty pool yields its turn.
  const pools = Math.random() < 0.5 ? [difficult, fresh] : [fresh, difficult];
  for (const pool of pools) {
    if (!pool.length) continue;
    if (pool === difficult) {
      const dueDifficult = pool.filter((w) => isDue(prog(w), now));
      if (dueDifficult.length) {
        return pickSoonest(dueDifficult, (w) => dueTime(prog(w)));
      }
    }
    return pickRandom(pool);
  }

  // Fall back to the review schedule: due first (soonest), then upcoming.
  const due = inRotation.filter((w) => isDue(prog(w), now));
  if (due.length) {
    return pickSoonest(due, (w) => dueTime(prog(w)));
  }
  const upcoming = inRotation.filter((w) => {
    const p = prog(w);
    return p?.dueAt != null && !p.mastered;
  });
  if (upcoming.length) {
    return pickSoonest(upcoming, (w) => dueTime(prog(w)));
  }
  return inRotation.length ? pickRandom(inRotation) : null;
}

export interface QuizSources {
  random: boolean;
  unseen: boolean;
  mistakes: boolean;
  smart: boolean; // exclusive: learn-style picking instead of the pools above
}

/** Quiz-mode sample — mirrors the client's sampleQuizWords. */
export function sampleQuizWords(
  words: string[],
  prog: (w: string) => Prog | undefined,
  count: number,
  sources: QuizSources,
): string[] {
  const available = words.filter((w) => prog(w)?.status !== 'dismissed');
  const pools: string[][] = [];
  if (sources.mistakes) pools.push(shuffle(available.filter((w) => {
    const p = prog(w);
    const total = (p?.correct ?? 0) + (p?.wrong ?? 0);
    return total > 0 && (p?.wrong ?? 0) / total > 0.3;
  })));
  if (sources.unseen) pools.push(shuffle(available.filter((w) => {
    const p = prog(w);
    return !p?.status && p?.dueAt == null;
  })));
  if (sources.random) pools.push(shuffle(available.length ? available : words));

  // Round-robin across the checked pools (even share each), skipping words
  // already taken. With 'random' unchecked, the result may come up short.
  const n = Math.min(count, available.length || words.length);
  const sampled: string[] = [];
  const chosen = new Set<string>();
  const idx = pools.map(() => 0);
  while (sampled.length < n) {
    let advanced = false;
    for (let i = 0; i < pools.length && sampled.length < n; i++) {
      while (idx[i] < pools[i].length) {
        const w = pools[i][idx[i]++];
        if (!chosen.has(w)) {
          chosen.add(w);
          sampled.push(w);
          advanced = true;
          break;
        }
      }
    }
    if (!advanced) break; // every checked pool is exhausted
  }
  return sampled;
}

/**
 * The caller's progress, keyed lowercase so a collection's casing still
 * matches — or none at all for a visitor. Null if it couldn't be read.
 */
export async function loadProgress(client: SupabaseClient, userId: string | null): Promise<((w: string) => Prog | undefined) | null> {
  const progMap = new Map<string, Prog>();
  if (userId) {
    const res = await client
      .from('user_word_progress')
      .select('word, status, due_at, mastered, correct_count, wrong_count')
      .eq('user_id', userId);
    if (res.error) return null;
    for (const r of res.data ?? []) {
      progMap.set(String(r.word).toLowerCase(), {
        status: (r.status as string | null) ?? null,
        dueAt: r.due_at ? new Date(r.due_at as string).getTime() : null,
        mastered: Boolean(r.mastered),
        correct: (r.correct_count as number | null) ?? 0,
        wrong: (r.wrong_count as number | null) ?? 0,
      });
    }
  }
  return (w: string) => progMap.get(w.toLowerCase());
}
