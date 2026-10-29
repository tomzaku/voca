// Word-selection endpoint. Picks which words a user should study next from a
// candidate list, using the server-side user_word_progress rows — the
// authoritative, cross-device state — so a device with stale local progress
// still gets the words the user is actually incorrect on / has never checked.
//
//   POST { words: string[], exclude?: string[], count?: number, mode?: 'learn' | 'quiz',
//          sources?: { random?: boolean, unseen?: boolean, mistakes?: boolean, smart?: boolean } }
//   → 200 { words: string[] }   (ordered picks, drawn from the submitted list)
//
// 'learn' mirrors the client's pickNextWord: a 50/50 mix of difficult words
// (last round failed, or more wrong answers than correct) and never-answered
// words; correctly-answered words only return when their FSRS review is due.
// 'quiz' mirrors sampleQuizWords: an even round-robin over the pools the user
// checked — 'mistakes' (>30% wrong), 'unseen' (never answered) and 'random'
// (anything) — each defaulting to on when omitted. sources.smart overrides the
// pools and runs the learn algorithm instead (Smart word selection on the quiz
// settings screen).
// Dismissed (skipped-for-good) words are never picked in either mode.
//
// The client falls back to the same algorithm over local state when offline.
//
// Signing in isn't required: a visitor without an account simply has no progress
// rows, so every word reads as never-answered and they get the same selection
// the client would make on its own. Nothing here is generated or billed — it's
// a sort over a list the caller already sent.
//
// Deploy: `supabase functions deploy pick`

import { corsHeaders, jsonResponse, optionalUser } from '../_shared/ai.ts';

const MAX_WORDS = 1000;
const MAX_EXCLUDE = 100;
const MAX_COUNT = 20;

interface Prog {
  status: string | null;
  dueAt: number | null; // epoch ms
  mastered: boolean;
  correct: number;
  wrong: number;
}

type Bucket = 'pending' | 'difficult' | 'learning' | 'mastered' | 'dismissed';

// Must match src/lib/progress.ts (wordBucket) on the client.
function bucket(p: Prog | undefined): Bucket {
  if (p?.status === 'dismissed') return 'dismissed';
  if (p?.mastered) return 'mastered';
  if (p && (p.status === 'skipped' || p.wrong > p.correct)) return 'difficult';
  if (p?.dueAt != null) return 'learning';
  return 'pending';
}

const isDue = (p: Prog | undefined, now: number): boolean =>
  p?.dueAt != null && !p.mastered && p.dueAt <= now;

const dueTime = (p: Prog | undefined): number => p?.dueAt ?? Infinity;

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const asWords = (v: unknown, cap: number): string[] =>
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
function pickSoonest<T>(items: T[], dueOf: (item: T) => number, spread = 5): T {
  const sorted = [...items].sort((a, b) => dueOf(a) - dueOf(b));
  return sorted[Math.floor(Math.random() * Math.min(spread, sorted.length))];
}

/** One learn-mode pick — mirrors the client's pickNextWord. */
function pickLearnWord(
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

interface QuizSources {
  random: boolean;
  unseen: boolean;
  mistakes: boolean;
  smart: boolean; // exclusive: learn-style picking instead of the pools above
}

/** Quiz-mode sample — mirrors the client's sampleQuizWords. */
function sampleQuizWords(
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

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const auth = await optionalUser(req);

  let params: Record<string, unknown>;
  try {
    params = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const words = asWords(params.words, MAX_WORDS);
  if (words.length === 0) return jsonResponse(400, { error: '"words" must be a non-empty array.' });
  const exclude = new Set(asWords(params.exclude, MAX_EXCLUDE).map((w) => w.toLowerCase()));
  const count = Math.min(MAX_COUNT, Math.max(1, Number(params.count) || 1));
  const mode = params.mode === 'quiz' ? 'quiz' : 'learn';
  // Quiz pools — each defaults to on when omitted (old clients send none);
  // 'smart' defaults to off and overrides the pools when set.
  const src = (params.sources ?? {}) as Record<string, unknown>;
  let sources: QuizSources = {
    random: src.random !== false,
    unseen: src.unseen !== false,
    mistakes: src.mistakes !== false,
    smart: src.smart === true,
  };
  // Nothing checked would pick nothing — treat it as "everything".
  if (!sources.random && !sources.unseen && !sources.mistakes && !sources.smart) {
    sources = { random: true, unseen: true, mistakes: true, smart: false };
  }

  // The user's own progress rows (RLS-scoped client), or none at all for a
  // visitor. Keyed lowercase so custom-collection casing still matches.
  let rows: Record<string, unknown>[] = [];
  if (auth.user) {
    const res = await auth.supabase
      .from('user_word_progress')
      .select('word, status, due_at, mastered, correct_count, wrong_count')
      .eq('user_id', auth.user.id);
    if (res.error) return jsonResponse(500, { error: 'Could not load progress.' });
    rows = res.data ?? [];
  }

  const progMap = new Map<string, Prog>();
  for (const r of rows) {
    progMap.set(String(r.word).toLowerCase(), {
      status: (r.status as string | null) ?? null,
      dueAt: r.due_at ? new Date(r.due_at as string).getTime() : null,
      mastered: Boolean(r.mastered),
      correct: (r.correct_count as number | null) ?? 0,
      wrong: (r.wrong_count as number | null) ?? 0,
    });
  }
  const prog = (w: string) => progMap.get(w.toLowerCase());

  const now = Date.now();
  let picks: string[];
  if (mode === 'quiz' && !sources.smart) {
    picks = sampleQuizWords(words.filter((w) => !exclude.has(w.toLowerCase())), prog, count, sources);
  } else {
    picks = [];
    const taken = new Set(exclude);
    for (let i = 0; i < count; i++) {
      const w = pickLearnWord(words, prog, taken, now);
      if (!w) break;
      picks.push(w);
      taken.add(w.toLowerCase());
    }
  }

  console.log(`[pick] mode=${mode} candidates=${words.length} picked=${picks.length} user=${auth.user?.id ?? 'anon'}`);
  return jsonResponse(200, { words: picks });
}

if (import.meta.main) Deno.serve(handler);
