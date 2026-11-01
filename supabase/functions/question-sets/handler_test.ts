// The `question-sets` routes, end to end, against the in-memory tables
// (../_shared/fake_db.ts): a teacher saves a set, reads it back as she wrote
// it, replaces it, deletes it — and nobody else can touch it.
//
//   npm run test:functions

import { createHandler } from './index.ts';
import { FakeDb } from '../_shared/fake_db.ts';
import { MAX_SET_QUESTIONS } from '../_shared/hunts.ts';

const TEACHER = 'teacher-1';
const STRANGER = 'teacher-2';

function setup() {
  const db = new FakeDb();
  const handler = createHandler({
    // deno-lint-ignore no-explicit-any
    db: () => db as any,
    user: (req) => {
      const who = req.headers.get('x-test-user');
      return Promise.resolve(who ? { user: { id: who } } : null);
    },
  });
  const call = async (method: string, path: string, body?: unknown, as = TEACHER) => {
    const res = await handler(new Request(`http://x/functions/v1/question-sets${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(as ? { 'x-test-user': as } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
    // deno-lint-ignore no-explicit-any
    return { status: res.status, body: await res.json() as any };
  };
  return { db, call };
}

function eq(a: unknown, b: unknown, msg = '') {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)} ${msg}`);
}
function ok(v: unknown, msg: string) {
  if (!v) throw new Error(msg);
}

const QUESTIONS = [
  { type: 'definition', prompt: 'a large stream of water', options: ['river', 'hill'], answer: 'river', word: 'river' },
  { type: 'custom', prompt: 'Sky colour?', answer: 'grey', accept: ['gray'] },
  { type: 'image', prompt: '', imageWord: 'Sun', options: ['sun', 'moon'], answer: 'sun' },
  { type: 'match', prompt: '', slotPrompts: ['purrs', 'barks'], slots: ['cat', 'dog'], options: ['dog', 'cat'] },
];

Deno.test('a set is saved as rows and read back as she wrote it', async () => {
  const { call, db } = setup();
  const r = await call('POST', '', { title: ' Animals ', questions: QUESTIONS });
  eq(r.status, 200, JSON.stringify(r.body));
  const set = r.body.set;
  eq([set.title, set.questionCount], ['Animals', 4]);
  eq(db.tables.questions.map((q) => q.position), [0, 1, 2, 3]);
  eq(db.tables.questions[2].image_word, 'sun');
  eq(db.tables.questions[3].pair_words, ['cat', 'dog']);

  const got = (await call('GET', `/${set.id}`)).body.set;
  eq(got.questions.map((q: { type: string }) => q.type), ['definition', 'custom', 'image', 'match']);
  eq(got.questions[1].accept, ['gray']);
  eq(got.questions[0].word, 'river');
  ok(got.questions.every((q: { id: string }) => q.id), 'each has its row id');
});

Deno.test('unusable questions are dropped, not saved', async () => {
  const { call } = setup();
  const r = await call('POST', '', { title: 'x', questions: [...QUESTIONS, { type: 'essay', prompt: 'x', answer: 'y' }, { type: 'definition', prompt: 'p', options: ['a', 'b'], answer: 'c' }] });
  eq(r.body.set.questionCount, 4);
});

Deno.test('a set is capped', async () => {
  const { call } = setup();
  const many = Array.from({ length: 100 }, (_, i) => ({ type: 'custom', prompt: `Q${i}`, answer: `a${i}` }));
  eq((await call('POST', '', { title: 'Big', questions: many })).body.set.questionCount, MAX_SET_QUESTIONS);
});

Deno.test('listing shows hers only, newest change first, without loading questions', async () => {
  const { call } = setup();
  await call('POST', '', { title: 'One', questions: QUESTIONS });
  await call('POST', '', { title: 'Theirs', questions: QUESTIONS }, STRANGER);
  const two = (await call('POST', '', { title: 'Two', questions: QUESTIONS.slice(0, 1) })).body.set;
  const sets = (await call('GET', '')).body.sets;
  eq(sets.map((s: { title: string }) => s.title), ['Two', 'One']);
  eq(sets[0], { id: two.id, title: 'Two', questionCount: 1, createdAt: two.createdAt, updatedAt: two.updatedAt });
});

Deno.test('PUT replaces the title and every question', async () => {
  const { call, db } = setup();
  const set = (await call('POST', '', { title: 'Old', questions: QUESTIONS })).body.set;
  const r = await call('PUT', `/${set.id}`, { title: 'New', questions: [QUESTIONS[1]] });
  eq(r.status, 200);
  eq([r.body.set.title, r.body.set.questionCount], ['New', 1]);
  eq(db.tables.questions.length, 1);
  eq(r.body.set.questions[0].prompt, 'Sky colour?');
});

Deno.test('a failed PUT leaves the set as it was', async () => {
  const { call, db } = setup();
  const set = (await call('POST', '', { title: 'Keep', questions: QUESTIONS })).body.set;
  eq((await call('PUT', `/${set.id}`, { title: '', questions: [] })).status, 400);
  eq(db.tables.questions.length, 4);
});

Deno.test('another teacher can’t read, change or delete her set', async () => {
  const { call, db } = setup();
  const set = (await call('POST', '', { title: 'Mine', questions: QUESTIONS })).body.set;
  eq((await call('GET', `/${set.id}`, undefined, STRANGER)).status, 404);
  eq((await call('PUT', `/${set.id}`, { title: 'Hijack', questions: [] }, STRANGER)).status, 404);
  await call('DELETE', `/${set.id}`, undefined, STRANGER);
  eq(db.tables.question_sets.length, 1);
  eq(db.tables.questions.length, 4);
});

Deno.test('delete is idempotent and takes the questions with it', async () => {
  const { call, db } = setup();
  const set = (await call('POST', '', { title: 'Gone', questions: QUESTIONS })).body.set;
  eq((await call('DELETE', `/${set.id}`)).status, 200);
  eq((await call('DELETE', `/${set.id}`)).status, 200);
  eq([db.tables.question_sets.length, db.tables.questions.length], [0, 0]);
  eq((await call('GET', `/${set.id}`)).status, 404);
});

Deno.test('signed out, bad ids, bad bodies and unknown routes', async () => {
  const { call } = setup();
  eq((await call('GET', '', undefined, '')).status, 401);
  eq((await call('GET', '/not-a-uuid')).status, 404);
  eq((await call('GET', `/${crypto.randomUUID()}/extra`)).status, 404);
  eq((await call('POST', '', 'nope')).status, 400);
  eq((await call('POST', '', { title: 'x', questions: 'nope' })).status, 400);
  eq((await call('PATCH', `/${crypto.randomUUID()}`, {})).status, 404);
});
