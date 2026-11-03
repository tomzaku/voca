// The built-in collections' practice tests, for the `tests` resource: a few
// fixed tests for each of Curated, CEFR Level 1–6 and the topics. Their
// questions are frozen in _shared/builtinTests.json (`npm run export:tests`);
// what's stored is each learner's attempts (builtin_test_results).
//
// They read like a teacher's test — the same summary, questions, review and
// top three — with these differences:
//   - no owner and no due date (`dueAt` null); anyone signed in can take one
//   - taken again as often as you like: Start after a hand-in begins a fresh
//     attempt, and your best counts (highest score, then quickest, then
//     earliest)
//   - the right answers show as soon as you've handed in — there's no due
//     date to wait for
//   - `practiceNumber` is its place in its collection, for the client to name
//     it ("Test 2") in the reader's language

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { publicQuestion, type StoredQuestion } from '../_shared/hunts.ts';
import { grade } from '../_shared/tests.ts';
import BUILTIN from '../_shared/builtinTests.json' with { type: 'json' };

interface BuiltinCollection {
  name: string;
  tests: { id: string; questions: (StoredQuestion & { id: string })[] }[];
}
const ALL = BUILTIN as unknown as Record<string, BuiltinCollection>;
const LEADERS = 3;
/** When the tests were written — what a list sorts them by. */
const CREATED_AT = '2026-11-11T00:00:00.000Z';
/** More tests than a learner could have attempted — a bound on the read. */
const MAX_RESULTS = 500;

/** "level-2-t3": a built-in test's id, as opposed to a teacher's (a uuid). */
export const BUILTIN_ID = /^[a-z0-9-]{1,40}-t\d{1,2}$/;

export interface BuiltinTest {
  id: string;
  collectionId: string;
  collectionName: string;
  number: number;
  questions: (StoredQuestion & { id: string })[];
}

export function findBuiltin(id: string): BuiltinTest | null {
  for (const [collectionId, c] of Object.entries(ALL)) {
    const i = c.tests.findIndex((t) => t.id === id);
    if (i >= 0) return { id, collectionId, collectionName: c.name, number: i + 1, questions: c.tests[i].questions };
  }
  return null;
}

/** A built-in collection's tests, or null when it isn't one. */
export function builtinCollection(collectionId: string): BuiltinTest[] | null {
  const c = ALL[collectionId];
  if (!c) return null;
  return c.tests.map((t, i) => ({ id: t.id, collectionId, collectionName: c.name, number: i + 1, questions: t.questions }));
}

interface ResultRow {
  test_id: string;
  user_id: string;
  name: string;
  started_at: string | null;
  last_answers: Record<string, string | string[]> | null;
  last_score: number | null;
  last_submitted_at: string | null;
  best_score: number | null;
  best_duration_ms: number | null;
  best_at: string | null;
  total: number;
}

const COLUMNS = 'test_id, user_id, name, started_at, last_answers, last_score, last_submitted_at, best_score, best_duration_ms, best_at, total';

/** Built-in tests, with the caller's own results and how many have taken each. */
export class Builtins {
  constructor(private db: SupabaseClient, private me: string) {}

  private async mine(testIds: string[]): Promise<Map<string, ResultRow>> {
    if (!testIds.length) return new Map();
    const { data, error } = await this.db.from('builtin_test_results').select(COLUMNS).eq('user_id', this.me).in('test_id', testIds);
    if (error) throw new Error(error.message);
    return new Map(((data ?? []) as ResultRow[]).map((r) => [r.test_id, r]));
  }

  private async takers(testIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    await Promise.all(testIds.map(async (id) => {
      const { count, error } = await this.db.from('builtin_test_results').select('user_id', { count: 'exact', head: true })
        .eq('test_id', id).not('best_score', 'is', null);
      if (error) throw new Error(error.message);
      counts.set(id, count ?? 0);
    }));
    return counts;
  }

  private toSummary(t: BuiltinTest, row: ResultRow | undefined, taken: number) {
    return {
      id: t.id,
      isOwner: false,
      collectionId: t.collectionId,
      collectionName: t.collectionName,
      practiceNumber: t.number,
      title: `${t.collectionName} · Test ${t.number}`,
      dueAt: null,
      showLeaderboard: true,
      theme: 'classic',
      instantFeedback: false,
      questionCount: t.questions.length,
      createdAt: CREATED_AT,
      submittedCount: taken,
      memberCount: 0,
      myResult: row?.best_score != null
        ? { score: row.best_score, total: row.total, durationMs: row.best_duration_ms, submittedAt: row.best_at! }
        : null,
      startedAt: row?.started_at ?? null,
    };
  }

  async summaries(tests: BuiltinTest[]) {
    const ids = tests.map((t) => t.id);
    const [mine, taken] = await Promise.all([this.mine(ids), this.takers(ids)]);
    return tests.map((t) => this.toSummary(t, mine.get(t.id), taken.get(t.id) ?? 0));
  }

  /** The built-in tests the caller has started or handed in, for the list of every test. */
  async attempted() {
    const { data, error } = await this.db.from('builtin_test_results').select('test_id').eq('user_id', this.me).limit(MAX_RESULTS);
    if (error) throw new Error(error.message);
    const tests = (data ?? []).map((r) => findBuiltin(r.test_id as string)).filter((t): t is BuiltinTest => !!t);
    return this.summaries(tests);
  }

  private async summary(t: BuiltinTest) {
    return (await this.summaries([t]))[0];
  }

  private async leaderboard(t: BuiltinTest) {
    const { data, error } = await this.db.from('builtin_test_results').select('user_id, name, best_score, best_duration_ms, total')
      .eq('test_id', t.id).not('best_score', 'is', null)
      .order('best_score', { ascending: false })
      .order('best_duration_ms', { ascending: true, nullsFirst: false })
      .order('best_at', { ascending: true })
      .limit(LEADERS);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      name: r.name as string,
      score: r.best_score as number,
      total: r.total as number,
      durationMs: r.best_duration_ms as number | null,
      isMe: r.user_id === this.me,
    }));
  }

  /** Your last hand-in, each answer marked, the right answer alongside. */
  private review(t: BuiltinTest, row: ResultRow) {
    const { graded } = grade(t.questions, row.last_answers ?? {});
    const answerOf = new Map(t.questions.map((q) => [q.id, q.answer]));
    return graded.map((g) => ({ ...g, answer: answerOf.get(g.questionId) ?? '' }));
  }

  /** GET /tests/:id — questions once started; your last review when no attempt is under way. */
  async read(t: BuiltinTest) {
    const row = (await this.mine([t.id])).get(t.id);
    const underWay = !!row?.started_at;
    const handedIn = row?.last_answers != null;
    return {
      test: await this.summary(t),
      questions: underWay || handedIn ? t.questions.map((q) => ({ id: q.id, ...publicQuestion(q) })) : [],
      checked: [],
      review: !underWay && handedIn ? this.review(t, row!) : null,
      leaderboard: await this.leaderboard(t),
    };
  }

  /** POST /tests/:id/start — starts an attempt (or carries on the one under way). */
  async start(t: BuiltinTest, name: string) {
    const row = (await this.mine([t.id])).get(t.id);
    if (!row) {
      const { error } = await this.db.from('builtin_test_results')
        .insert({ test_id: t.id, user_id: this.me, name, started_at: new Date().toISOString(), total: t.questions.length });
      // A double tap racing itself: the other insert started the clock.
      if (error && error.code !== '23505') throw new Error(error.message);
    } else if (!row.started_at) {
      const { error } = await this.db.from('builtin_test_results')
        .update({ started_at: new Date().toISOString(), name }).eq('test_id', t.id).eq('user_id', this.me);
      if (error) throw new Error(error.message);
    }
    return {
      test: await this.summary(t),
      questions: t.questions.map((q) => ({ id: q.id, ...publicQuestion(q) })),
      checked: [],
    };
  }

  /** POST /tests/:id/submit — marks the attempt; keeps it as your best if it beats it. Null when none is under way. */
  async submit(t: BuiltinTest, answers: unknown, name: string) {
    const row = (await this.mine([t.id])).get(t.id);
    if (!row?.started_at) return null;
    const sent = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers as Record<string, unknown> : {};
    const { graded, score, total } = grade(t.questions, sent);
    const now = new Date().toISOString();
    const durationMs = Math.max(0, Date.parse(now) - Date.parse(row.started_at));
    const better = row.best_score == null || score > row.best_score ||
      (score === row.best_score && (row.best_duration_ms == null || durationMs < row.best_duration_ms));
    const kept = Object.fromEntries(graded.map((g) => [g.questionId, g.given]));
    // Only the attempt that was started: a second tab's hand-in finds it gone.
    const { data, error } = await this.db.from('builtin_test_results')
      .update({
        name,
        started_at: null,
        last_answers: kept,
        last_score: score,
        last_submitted_at: now,
        total,
        ...(better ? { best_score: score, best_duration_ms: durationMs, best_at: now } : {}),
      })
      .eq('test_id', t.id).eq('user_id', this.me).eq('started_at', row.started_at)
      .select(COLUMNS);
    if (error) throw new Error(error.message);
    if (!data?.length) return null;
    return {
      test: await this.summary(t),
      review: this.review(t, data[0] as ResultRow),
      leaderboard: await this.leaderboard(t),
    };
  }
}
