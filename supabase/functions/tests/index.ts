// The `tests` resource — a test a collection's owner sends its members: a
// question set copied in, a due date, and one submission per member. The
// grading rules are pure and live in _shared/tests.ts.
//
// The teacher (the collection's owner):
//   POST   /tests            { collectionId, setId, title, dueAt, showLeaderboard? } → { test }
//   PATCH  /tests/:id        { title?, dueAt?, showLeaderboard? } → { test }
//   DELETE /tests/:id                             → { ok }   idempotent
//   GET    /tests/:id/results                     → { results }  everyone's score, who hasn't
//                                                    taken it, and how each question went
//
// Anyone in the collection — its owner, a member, or (when it's public) any
// signed-in visitor holding the link:
//   GET    /tests ?collection=                    → { tests }  newest first
//   GET    /tests/:id                             → { test, questions, review, leaderboard }
//   POST   /tests/:id/start                       → { test, questions }  starts your clock; idempotent
//   POST   /tests/:id/submit { answers }          → { test, review, leaderboard }   answers: { [questionId]: string | string[] }
//   GET    /tests/:id/image ?key=                 → { image }  a picture question's picture
//
// `questions` is empty for a student until they press Start: that's when
// their clock starts, so the questions can't be read with it stopped. Their
// owner, and anyone already started or done, gets them on every read.
//
// `leaderboard` is the top three hand-ins — best score first, then fastest,
// then earliest — or empty when the teacher hasn't turned it on.
//
// `review` is null until you've submitted. After that it's your answers, each
// marked right or wrong — and, once the due date passes, the right answer
// too. Not before: a student who's done could otherwise pass them round to
// the ones who haven't.
//
// Submitting to a public collection you hadn't joined joins you, so the
// teacher's results list you with everyone else.
//
// The tables carry no row-level policies (see the collection_tests
// migration): this function holds the service role and checks the caller
// against the collection itself. `user_id` and the student's name are read
// from the session, never the body.
//
// Deploy: `npm run deploy:tests`

import type { SupabaseClient, User } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, requireUser, serviceClient } from '../_shared/ai.ts';
import {
  fromColumns,
  Invalid as InvalidQuestion,
  publicQuestion,
  questionColumns,
  UUID,
  type QuestionColumns,
  type StoredQuestion,
} from '../_shared/hunts.ts';
import { cleanDue, grade, Invalid, isOpen, MAX_TITLE, rank, tally } from '../_shared/tests.ts';

const QUESTION_COLUMNS = 'id, position, type, prompt, answer, options, accept, say, scrambled, image_word, pair_prompts, pair_words, word';
const SET_QUESTION_COLUMNS = 'id, type, prompt, answer, options, accept, say, scrambled, image_word, pair_prompts, pair_words, word';
/** More than a set can hold — a bound on the read, not a rule. */
const MAX_QUESTIONS = 100;
const LIST_LIMIT = 50;
/** A class's every answer to one test, with room to spare. */
const RESULTS_LIMIT = 20_000;
const LEADERS = 3;


interface TestRow {
  id: string;
  collection_id: string;
  owner_id: string;
  set_id: string | null;
  title: string;
  due_at: string;
  show_leaderboard: boolean;
  question_count: number;
  created_at: string;
}

interface CollectionRow {
  id: string;
  owner_id: string;
  is_public: boolean;
  member_count: number;
}

interface SubmissionRow {
  test_id: string;
  user_id: string;
  name: string;
  score: number;
  total: number;
  duration_ms: number | null;
  submitted_at: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function toSummary(t: TestRow, me: string, extra: { submittedCount: number; memberCount: number; mine: SubmissionRow | null; startedAt?: string | null }) {
  return {
    id: t.id,
    isOwner: t.owner_id === me,
    collectionId: t.collection_id,
    title: t.title,
    dueAt: t.due_at,
    showLeaderboard: t.show_leaderboard,
    questionCount: t.question_count,
    createdAt: t.created_at,
    submittedCount: extra.submittedCount,
    memberCount: extra.memberCount,
    myResult: extra.mine
      ? { score: extra.mine.score, total: extra.mine.total, durationMs: extra.mine.duration_ms, submittedAt: extra.mine.submitted_at }
      : null,
    /** When the caller pressed Start, or null. */
    startedAt: extra.startedAt ?? null,
  };
}

function nameOf(user: User): string {
  const meta = user.user_metadata ?? {};
  return String(meta.full_name ?? user.email?.split('@')[0] ?? 'Student').slice(0, 60);
}

async function loadQuestions(db: SupabaseClient, testId: string): Promise<StoredQuestion[]> {
  const { data, error } = await db
    .from('collection_test_questions')
    .select(QUESTION_COLUMNS)
    .eq('test_id', testId)
    .order('position')
    .limit(MAX_QUESTIONS);
  if (error) throw new Error(error.message);
  return ((data ?? []) as (QuestionColumns & { id: string })[]).map(fromColumns);
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const [id, sub, ...rest] = parts.slice(parts.lastIndexOf('tests') + 1);
  if (rest.length || (id !== undefined && !UUID.test(id))) return jsonResponse(404, { error: 'Not found' });

  const db = serviceClient();
  if (!db) return jsonResponse(500, { error: 'The server is missing its service key.' });
  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to take tests.' });
  const me = auth.user.id;

  const body = async (): Promise<Record<string, unknown>> => {
    try {
      const b = await req.json();
      if (b && typeof b === 'object' && !Array.isArray(b)) return b as Record<string, unknown>;
    } catch { /* fall through */ }
    throw new HttpError(400, 'Invalid JSON body.');
  };

  const collection = async (cid: string): Promise<CollectionRow> => {
    const { data, error } = await db.from('collections').select('id, owner_id, is_public, member_count').eq('id', cid).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new HttpError(404, 'Collection not found.');
    return data as CollectionRow;
  };

  const isMember = async (cid: string): Promise<boolean> => {
    const { data, error } = await db.from('collection_members').select('user_id').eq('collection_id', cid).eq('user_id', me).maybeSingle();
    if (error) throw new Error(error.message);
    return !!data;
  };

  /**
   * The collection, if the caller may see its tests: they own it, belong to
   * it, or it's public. Anything else is a 404, exactly like a missing one.
   */
  const visible = async (cid: string): Promise<CollectionRow> => {
    const col = await collection(cid);
    if (col.owner_id === me || col.is_public || await isMember(cid)) return col;
    throw new HttpError(404, 'Collection not found.');
  };

  const test = async (testId: string): Promise<TestRow> => {
    const { data, error } = await db.from('collection_tests').select('*').eq('id', testId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new HttpError(404, 'Test not found.');
    return data as TestRow;
  };

  /** A test the caller may take or read, with its collection. */
  const reachable = async (testId: string) => {
    const t = await test(testId);
    try {
      return { t, col: await visible(t.collection_id) };
    } catch (err) {
      if (err instanceof HttpError) throw new HttpError(404, 'Test not found.');
      throw err;
    }
  };

  /** A test the caller owns. Someone else's is reported as missing. */
  const owned = async (testId: string): Promise<TestRow> => {
    const t = await test(testId);
    if (t.owner_id !== me) throw new HttpError(404, 'Test not found.');
    return t;
  };

  const submissions = async (testIds: string[]): Promise<SubmissionRow[]> => {
    if (!testIds.length) return [];
    const { data, error } = await db
      .from('collection_test_submissions')
      .select('test_id, user_id, name, score, total, duration_ms, submitted_at')
      .in('test_id', testIds)
      .limit(RESULTS_LIMIT);
    if (error) throw new Error(error.message);
    return (data ?? []) as SubmissionRow[];
  };

  /** When the caller started each of these tests, by test id. */
  const startsOf = async (testIds: string[]): Promise<Map<string, string>> => {
    if (!testIds.length) return new Map();
    const { data, error } = await db
      .from('collection_test_starts')
      .select('test_id, started_at')
      .eq('user_id', me)
      .in('test_id', testIds);
    if (error) throw new Error(error.message);
    return new Map((data ?? []).map((r) => [r.test_id as string, r.started_at as string]));
  };

  const summary = async (t: TestRow, col: CollectionRow) => {
    const [subs, starts] = await Promise.all([submissions([t.id]), startsOf([t.id])]);
    return toSummary(t, me, {
      submittedCount: subs.length,
      memberCount: col.member_count,
      mine: subs.find((s) => s.user_id === me) ?? null,
      startedAt: starts.get(t.id) ?? null,
    });
  };

  /** The top hand-ins, when the teacher shows them. */
  const leaderboard = async (t: TestRow) => {
    if (!t.show_leaderboard) return [];
    // Ranked here rather than in SQL: "untimed sorts last" and the three-way
    // tie-break read more plainly as one comparator, and a class is small.
    const subs = (await submissions([t.id])).sort(rank).slice(0, LEADERS);
    return subs.map((r) => ({ name: r.name, score: r.score, total: r.total, durationMs: r.duration_ms, isMe: r.user_id === me }));
  };

  /** The caller's own answers, marked — with the right answers once it's closed. */
  const review = async (t: TestRow, questions: StoredQuestion[]) => {
    const { data, error } = await db
      .from('collection_test_answers')
      .select('question_id, given, correct')
      .eq('test_id', t.id)
      .eq('user_id', me)
      .limit(MAX_QUESTIONS);
    if (error) throw new Error(error.message);
    const byQuestion = new Map((data ?? []).map((a) => [a.question_id as string, a]));
    const reveal = !isOpen(t.due_at, Date.now());
    return questions.map((q) => {
      const a = byQuestion.get(q.id!);
      return {
        questionId: q.id!,
        given: (a?.given as string | undefined) ?? '',
        correct: (a?.correct as boolean | undefined) ?? false,
        answer: reveal ? q.answer : null,
      };
    });
  };

  try {
    const route = `${req.method} ${[id ? ':id' : '', sub ?? ''].filter(Boolean).join('/')}`.trim();

    switch (route) {
      case 'GET': {
        const cid = url.searchParams.get('collection') ?? '';
        if (!UUID.test(cid)) return jsonResponse(400, { error: '"collection" is required.' });
        const col = await visible(cid);
        const { data, error } = await db
          .from('collection_tests')
          .select('*')
          .eq('collection_id', cid)
          .order('created_at', { ascending: false })
          .limit(LIST_LIMIT);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as TestRow[];
        const [subs, starts] = await Promise.all([submissions(rows.map((r) => r.id)), startsOf(rows.map((r) => r.id))]);
        return jsonResponse(200, {
          tests: rows.map((t) => {
            const these = subs.filter((s) => s.test_id === t.id);
            return toSummary(t, me, {
              submittedCount: these.length,
              memberCount: col.member_count,
              mine: these.find((s) => s.user_id === me) ?? null,
              startedAt: starts.get(t.id) ?? null,
            });
          }),
        });
      }

      case 'POST': {
        const b = await body();
        const cid = typeof b.collectionId === 'string' ? b.collectionId : '';
        const setId = typeof b.setId === 'string' ? b.setId : '';
        if (!UUID.test(cid)) return jsonResponse(400, { error: '"collectionId" is required.' });
        if (!UUID.test(setId)) return jsonResponse(400, { error: '"setId" is required.' });
        const col = await collection(cid);
        if (col.owner_id !== me) return jsonResponse(404, { error: 'Collection not found.' });
        const title = typeof b.title === 'string' ? b.title.trim().slice(0, MAX_TITLE) : '';
        if (!title) return jsonResponse(400, { error: 'Give the test a name.' });
        const dueAt = cleanDue(b.dueAt, Date.now());

        const { data: set, error: setError } = await db.from('question_sets').select('id, owner_id').eq('id', setId).maybeSingle();
        if (setError) throw new Error(setError.message);
        if (!set || set.owner_id !== me) return jsonResponse(404, { error: 'Question set not found.' });
        const { data: qRows, error: qError } = await db
          .from('questions')
          .select(SET_QUESTION_COLUMNS)
          .eq('set_id', setId)
          .order('position')
          .limit(MAX_QUESTIONS);
        if (qError) throw new Error(qError.message);
        const questions = ((qRows ?? []) as (QuestionColumns & { id: string })[]).map(fromColumns);
        if (!questions.length) return jsonResponse(400, { error: 'Add some questions first.' });

        const { data, error } = await db
          .from('collection_tests')
          .insert({ collection_id: cid, owner_id: me, set_id: setId, title, due_at: dueAt, show_leaderboard: b.showLeaderboard === true, question_count: questions.length })
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        const t = data as TestRow;
        const { error: copyError } = await db.from('collection_test_questions').insert(
          questions.map((q, position) => ({ test_id: t.id, position, source_id: q.id, ...questionColumns(q) })),
        );
        if (copyError) {
          // A test with no questions would look sent and be useless.
          await db.from('collection_tests').delete().eq('id', t.id);
          throw new Error(copyError.message);
        }
        return jsonResponse(200, { test: toSummary(t, me, { submittedCount: 0, memberCount: col.member_count, mine: null }) });
      }

      case 'GET :id': {
        const { t, col } = await reachable(id!);
        const questions = await loadQuestions(db, t.id);
        const test = await summary(t, col);
        const canSee = test.isOwner || test.startedAt !== null || test.myResult !== null;
        return jsonResponse(200, {
          test,
          questions: canSee ? questions.map((q) => ({ id: q.id!, ...publicQuestion(q) })) : [],
          review: test.myResult ? await review(t, questions) : null,
          leaderboard: await leaderboard(t),
        });
      }

      case 'PATCH :id': {
        const t = await owned(id!);
        const b = await body();
        const patch: Record<string, unknown> = {};
        if ('title' in b) {
          const title = typeof b.title === 'string' ? b.title.trim().slice(0, MAX_TITLE) : '';
          if (!title) return jsonResponse(400, { error: 'Give the test a name.' });
          patch.title = title;
        }
        if ('dueAt' in b) patch.due_at = cleanDue(b.dueAt, Date.now());
        if ('showLeaderboard' in b) patch.show_leaderboard = b.showLeaderboard === true;
        const { data, error } = Object.keys(patch).length
          ? await db.from('collection_tests').update(patch).eq('id', t.id).select('*').single()
          : { data: t, error: null };
        if (error) throw new Error(error.message);
        return jsonResponse(200, { test: await summary(data as TestRow, await collection(t.collection_id)) });
      }

      case 'DELETE :id': {
        const { error } = await db.from('collection_tests').delete().eq('id', id!).eq('owner_id', me);
        if (error) throw new Error(error.message);
        return jsonResponse(200, { ok: true });
      }

      case 'POST :id/start': {
        const { t, col } = await reachable(id!);
        if (t.owner_id === me) return jsonResponse(400, { error: 'This is your own test — students take it.' });
        if (!isOpen(t.due_at, Date.now())) return jsonResponse(400, { error: 'This test is closed.' });
        // The first start counts; pressing Start again (a reload, a second
        // device) keeps the clock that's already running.
        const { error } = await db
          .from('collection_test_starts')
          .upsert({ test_id: t.id, user_id: me }, { onConflict: 'test_id,user_id', ignoreDuplicates: true });
        if (error) throw new Error(error.message);
        const questions = await loadQuestions(db, t.id);
        return jsonResponse(200, {
          test: await summary(t, col),
          questions: questions.map((q) => ({ id: q.id!, ...publicQuestion(q) })),
        });
      }

      case 'POST :id/submit': {
        const { t, col } = await reachable(id!);
        if (t.owner_id === me) return jsonResponse(400, { error: 'This is your own test — students take it.' });
        if (!isOpen(t.due_at, Date.now())) return jsonResponse(400, { error: 'This test is closed.' });
        const b = await body();
        const questions = await loadQuestions(db, t.id);
        const { graded, score, total } = grade(questions, b.answers);

        // Taking a public collection's test makes you one of its students.
        if (!await isMember(col.id)) {
          const { error } = await auth.supabase.rpc('join_collection', { cid: col.id });
          if (error) throw new Error(error.message);
        }

        const startedAt = (await startsOf([t.id])).get(t.id);
        const durationMs = startedAt ? Math.max(0, Date.now() - Date.parse(startedAt)) : null;
        const { error } = await db
          .from('collection_test_submissions')
          .insert({ test_id: t.id, user_id: me, name: nameOf(auth.user), score, total, duration_ms: durationMs });
        if (error) {
          // The primary key: they've already submitted (a double tap, a second tab).
          if (error.code === '23505') return jsonResponse(400, { error: 'You’ve already handed this test in.' });
          throw new Error(error.message);
        }
        const { error: answersError } = await db.from('collection_test_answers').insert(
          graded.map((g) => ({ test_id: t.id, user_id: me, question_id: g.questionId, given: g.given, correct: g.correct })),
        );
        if (answersError) {
          // Without its answers a submission is a score nobody can check — undo it so they can resend.
          await db.from('collection_test_submissions').delete().eq('test_id', t.id).eq('user_id', me);
          throw new Error(answersError.message);
        }
        return jsonResponse(200, {
          test: await summary(t, await collection(col.id)),
          review: await review(t, questions),
          leaderboard: await leaderboard(t),
        });
      }

      case 'GET :id/results': {
        const t = await owned(id!);
        const col = await collection(t.collection_id);
        const [questions, subs, answers, roster] = await Promise.all([
          loadQuestions(db, t.id),
          submissions([t.id]),
          db.from('collection_test_answers').select('question_id, given, correct').eq('test_id', t.id).limit(RESULTS_LIMIT),
          db.rpc('collection_roster', { cid: t.collection_id }),
        ]);
        if (answers.error) throw new Error(answers.error.message);
        if (roster.error) throw new Error(roster.error.message);
        const done = new Set(subs.map((s) => s.user_id));
        const byQuestion = new Map<string, { given: string; correct: boolean }[]>();
        for (const a of answers.data ?? []) {
          const list = byQuestion.get(a.question_id as string) ?? [];
          list.push({ given: a.given as string, correct: a.correct as boolean });
          byQuestion.set(a.question_id as string, list);
        }
        return jsonResponse(200, {
          results: {
            test: toSummary(t, me, { submittedCount: subs.length, memberCount: col.member_count, mine: null }),
            students: [...subs].sort(rank).map((s) => ({
              userId: s.user_id,
              name: s.name,
              score: s.score,
              total: s.total,
              durationMs: s.duration_ms,
              submittedAt: s.submitted_at,
            })),
            waiting: ((roster.data ?? []) as { user_id: string; display_name: string | null }[])
              .filter((m) => m.user_id !== me && !done.has(m.user_id))
              .map((m) => ({ userId: m.user_id, name: m.display_name ?? '' })),
            questions: questions.map((q) => ({
              id: q.id!,
              type: q.type,
              prompt: q.prompt || q.slotPrompts?.join(' · ') || '',
              answer: q.answer,
              ...tally(byQuestion.get(q.id!) ?? []),
            })),
          },
        });
      }

      // A picture question's picture, by the question's id — the request never names the word.
      case 'GET :id/image': {
        const { t } = await reachable(id!);
        const key = url.searchParams.get('key') ?? '';
        if (!UUID.test(key)) return jsonResponse(400, { error: '"key" is required.' });
        const { data: q, error: qError } = await db
          .from('collection_test_questions')
          .select('image_word')
          .eq('id', key)
          .eq('test_id', t.id)
          .maybeSingle();
        if (qError) throw new Error(qError.message);
        if (!q?.image_word) return jsonResponse(404, { error: 'Picture not found.' });
        const { data, error } = await db.from('word_doodles').select('doodle').eq('word', q.image_word).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return jsonResponse(404, { error: 'Picture not found.' });
        return jsonResponse(200, { image: data.doodle as string });
      }

      default:
        return jsonResponse(404, { error: 'Not found' });
    }
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse(err.status, { error: err.message });
    if (err instanceof Invalid || err instanceof InvalidQuestion) return jsonResponse(400, { error: err.message });
    console.error('[tests]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
