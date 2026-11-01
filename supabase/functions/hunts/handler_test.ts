// The `hunts` routes, end to end, against an in-memory stand-in for the tables
// (../_shared/fake_db.ts): a teacher makes a hunt from a question set, a class
// joins, both teams race to the treasure — and every rule a student could try
// to break is tried. Then the results, read back from the rows.
//
//   npm run test:functions
//
// (A Deno test rather than vitest: the handler imports npm: specifiers.)

import { createHandler } from './index.ts';
import { FakeDb } from '../_shared/fake_db.ts';
import { COOLDOWN_MS, stationOrder } from '../_shared/hunts.ts';

const TEACHER = 'teacher-1';
const STRANGER = 'teacher-2';

// deno-lint-ignore no-explicit-any
type Call = (method: string, path: string, body?: unknown, as?: string) => Promise<{ status: number; body: any }>;

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
  const call: Call = async (method, path, body, as) => {
    const res = await handler(new Request(`http://x/functions/v1/hunts${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(as ? { 'x-test-user': as } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
    return { status: res.status, body: await res.json() };
  };
  return { db, call };
}

const mcq = (i: number) => ({ type: 'definition', prompt: `meaning ${i}`, options: [`w${i}`, 'nope', 'never'], answer: `w${i}` });
const spell = (i: number) => ({ type: 'spell', prompt: '', say: `w${i}`, answer: `w${i}` });

/** A set of hers, written straight into the tables. Question i answers `w<i>`. */
function makeSet(db: FakeDb, questions: Record<string, unknown>[], owner = TEACHER): string {
  const id = crypto.randomUUID();
  db.tables.question_sets.push(db.defaults('question_sets', { id, owner_id: owner, title: 'Set', question_count: questions.length }));
  questions.forEach((q, position) => {
    db.tables.questions.push(db.defaults('questions', {
      set_id: id, position, type: q.type, prompt: q.prompt ?? '', answer: q.answer,
      options: q.options ?? null, accept: q.accept ?? null, say: q.say ?? null, image_word: q.imageWord ?? null,
      pair_prompts: q.slotPrompts ?? null, pair_words: q.slots ?? null,
    }));
  });
  return id;
}

/** Two questions per station for GOLD, dealt round the four stations. */
const EIGHT: Record<string, unknown>[] = [...[0, 1, 2, 3].map(mcq), ...[4, 5, 6, 7].map(spell)];

async function newHunt(call: Call, db: FakeDb, extra: Record<string, unknown> = {}) {
  const setId = makeSet(db, EIGHT);
  const r = await call('POST', '', {
    title: 'Class 5A', mode: 'qr', treasure: 'gold', setId, need: 2, durationMin: 20,
    clues: ['clue 0', 'clue 1', 'clue 2', 'clue 3'], ...extra,
  }, TEACHER);
  eq(r.status, 200, JSON.stringify(r.body));
  return r.body.hunt;
}

function eq(a: unknown, b: unknown, msg = '') {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)} ${msg}`);
}
function ok(v: unknown, msg: string) {
  if (!v) throw new Error(msg);
}

let clock = Date.parse('2026-11-01T09:00:00Z');
const realNow = Date.now;
function freeze() { Date.now = () => clock; }
function thaw() { Date.now = realNow; }
const tick = (ms: number) => { clock += ms; };

/** The answer to whatever question a player is shown: `w<i>`, read off the prompt or what's said. */
function answerTo(q: { prompt: string; say: string | null }): string {
  return q.say ?? q.prompt.replace('meaning ', 'w');
}

// ── The teacher ─────────────────────────────────────────────────────────────

Deno.test('creating needs a signed-in teacher', async () => {
  const { call } = setup();
  eq((await call('POST', '', { title: 'x', treasure: 'gold', setId: crypto.randomUUID() })).status, 401);
  eq((await call('GET', '')).status, 401);
});

Deno.test('a hunt copies its set into stations and rows', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call, db);
  eq([hunt.status, hunt.stations], ['lobby', 4]);
  ok(/^[A-HJKMNP-Z2-9]{6}$/.test(hunt.code), `join code ${hunt.code}`);
  eq(db.tables.hunt_stations.map((s) => s.letter).join(''), 'GOLD');
  eq(db.tables.hunt_stations.map((s) => s.clue), ['clue 0', 'clue 1', 'clue 2', 'clue 3']);
  eq(new Set(db.tables.hunt_stations.map((s) => s.card)).size, 4);
  // Dealt round, grouped by kind: station 0 holds a meaning (w0) and a spelling (w4).
  eq(db.tables.hunt_questions.filter((q) => q.station === 0).map((q) => q.answer), ['w0', 'w4']);
  const sources = new Set(db.tables.questions.map((q) => q.id));
  ok(db.tables.hunt_questions.every((q) => sources.has(q.source_id)), 'source ids');
  eq(db.tables.hunts[0].set_id, hunt.setId);
});

Deno.test('editing the set afterwards leaves the hunt’s copy alone', async () => {
  const { call, db } = setup();
  await newHunt(call, db);
  db.remove('questions', [...db.tables.questions]);
  eq(db.tables.hunt_questions.length, 8);
  ok(db.tables.hunt_questions.every((q) => q.source_id === null), 'sources forgotten, copies kept');
});

Deno.test('a hunt needs her own set, with enough questions', async () => {
  const { call, db } = setup();
  const theirs = makeSet(db, EIGHT, STRANGER);
  eq((await call('POST', '', { title: 'x', treasure: 'gold', setId: theirs }, TEACHER)).status, 404);
  eq((await call('POST', '', { title: 'x', treasure: 'gold' }, TEACHER)).status, 400);
  const small = makeSet(db, [mcq(0), mcq(1)]);
  const r = await call('POST', '', { title: 'x', treasure: 'gold', setId: small }, TEACHER);
  eq(r.status, 400);
  ok(/at least 4/.test(r.body.error), r.body.error);
  eq(db.tables.hunts.length, 0);
});

Deno.test('bad input is a 400 with a message', async () => {
  const { call, db } = setup();
  const setId = makeSet(db, EIGHT);
  eq((await call('POST', '', { title: 'x', treasure: 'go', setId }, TEACHER)).status, 400);
  eq((await call('POST', '', { title: '', treasure: 'gold', setId }, TEACHER)).status, 400);
  eq((await call('POST', '', 'not an object', TEACHER)).status, 400);
  eq((await call('POST', '', { title: 'x', mode: 'world', treasure: 'gold', setId, places: ['ngoMon', 'ngoMon', 'kyDai', 'dongBa'] }, TEACHER)).status, 400);
});

Deno.test('another teacher can’t see, start, read or delete your hunt', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call, db);
  eq((await call('GET', `/board?id=${hunt.id}`, undefined, STRANGER)).status, 404);
  eq((await call('GET', `/results?id=${hunt.id}`, undefined, STRANGER)).status, 404);
  eq((await call('POST', '/start', { id: hunt.id }, STRANGER)).status, 404);
  eq((await call('GET', '', undefined, STRANGER)).body.hunts, []);
  await call('DELETE', `?id=${hunt.id}`, undefined, STRANGER);
  eq(db.tables.hunts.length, 1);
});

Deno.test('delete is idempotent and takes every row of the hunt with it', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call, db);
  await call('POST', '/join', { code: hunt.code, name: 'Ann' });
  eq((await call('DELETE', `?id=${hunt.id}`, undefined, TEACHER)).status, 200);
  eq((await call('DELETE', `?id=${hunt.id}`, undefined, TEACHER)).status, 200);
  for (const t of ['hunts', 'hunt_players', 'hunt_stations', 'hunt_questions']) eq(db.tables[t].length, 0, t);
  // The set outlives it.
  eq(db.tables.questions.length, 8);
});

Deno.test('unknown routes are 404', async () => {
  const { call } = setup();
  eq((await call('GET', '/nope', undefined, TEACHER)).status, 404);
  eq((await call('PATCH', '', {}, TEACHER)).status, 404);
});

// ── Joining ─────────────────────────────────────────────────────────────────

Deno.test('students join without accounts and fill the teams evenly', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call, db);
  const teams = [];
  for (const name of ['Ann', 'Bao', 'Cam', 'Dan', 'Eve']) {
    const r = await call('POST', '/join', { code: hunt.code.toLowerCase(), name });
    eq(r.status, 200);
    ok(r.body.token.length >= 32, 'token');
    teams.push(r.body.play.me.team);
  }
  eq(teams, [0, 1, 0, 1, 0]);
  ok(db.tables.hunt_players.every((p) => typeof p.token_hash === 'string' && !('token' in p)), 'hashed');
});

Deno.test('joining needs a real code and a name', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call, db);
  eq((await call('POST', '/join', { code: 'ZZZZZZ', name: 'Ann' })).status, 404);
  eq((await call('POST', '/join', { code: hunt.code, name: '   ' })).status, 400);
  eq((await call('GET', `/preview?code=${hunt.code}`)).body.preview.title, 'Class 5A');
  eq((await call('GET', '/preview?code=NOPE')).status, 404);
});

Deno.test('a made-up token is turned away', async () => {
  const { call } = setup();
  eq((await call('GET', '/play?token=0123456789abcdef0123456789abcdef')).status, 401);
  eq((await call('GET', '/play?token=short')).status, 400);
});

Deno.test('the teacher can move a student across', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call, db);
  const ann = (await call('POST', '/join', { code: hunt.code, name: 'Ann' })).body.play.me;
  const r = await call('POST', '/move', { id: hunt.id, player: ann.id, team: 1 }, TEACHER);
  eq(r.status, 200);
  eq(r.body.board.teams[1].players.map((p: { name: string }) => p.name), ['Ann']);
  eq((await call('POST', '/move', { id: hunt.id, player: ann.id, team: 2 }, TEACHER)).status, 400);
});

// ── The race ────────────────────────────────────────────────────────────────

Deno.test('a whole classroom race, start to treasure — and every answer on record', async () => {
  freeze();
  try {
    const { call, db } = setup();
    const hunt = await newHunt(call, db);
    const join = async (name: string) => {
      const r = await call('POST', '/join', { code: hunt.code, name });
      return { token: r.body.token as string, team: r.body.play.me.team as number };
    };
    const ann = await join('Ann'); // red
    const cam = await join('Cam'); // blue
    const bao = await join('Bao'); // red
    const dan = await join('Dan'); // blue

    const cards = db.tables.hunt_stations.map((s) => s.card as string);
    const play = async (t: string) => (await call('GET', `/play?token=${t}`)).body.play;

    eq((await call('POST', '/found', { token: ann.token, card: cards[0] })).status, 400);
    eq((await play(ann.token)).team.clue, 'clue 0');

    eq((await call('POST', '/start', { id: hunt.id }, TEACHER)).status, 200);
    eq((await call('POST', '/start', { id: hunt.id }, TEACHER)).status, 400);

    const redOrder = stationOrder(0, 4);
    const blueOrder = stationOrder(1, 4);
    const p0 = await play(cam.token);
    eq(p0.team.clue, `clue ${blueOrder[0]}`);
    ok(!JSON.stringify(p0).includes(cards[blueOrder[0]]), 'card code leaked');

    eq((await call('POST', '/found', { token: ann.token, card: cards[redOrder[1]] })).body.result, 'notYet');
    eq((await call('POST', '/found', { token: ann.token, card: 'XXXX' })).body.result, 'unknown');
    eq((await call('POST', '/answer', { token: ann.token, answer: 'w0' })).status, 400);

    const solveStation = async (a: { token: string }, b: { token: string }, s: number) => {
      eq((await call('POST', '/found', { token: a.token, card: cards[s].toLowerCase() })).body.result, 'found');
      eq((await call('POST', '/found', { token: b.token, card: cards[s] })).body.result, 'already');
      const qa = (await play(a.token)).team.question;
      const qb = (await play(b.token)).team.question;
      ok(qa && qb, 'both have a question');
      ok(!('answer' in qa), 'answer leaked');
      ok(answerTo(qa) !== answerTo(qb), 'teammates asked the same question');
      eq((await call('POST', '/answer', { token: a.token, answer: answerTo(qa).toUpperCase() })).body.correct, true);
      eq((await call('POST', '/answer', { token: a.token, answer: answerTo(qa) })).status, 400);
      eq((await play(a.token)).team.iSolved, true);
      eq((await call('POST', '/answer', { token: b.token, answer: ` ${answerTo(qb)} ` })).body.correct, true);
    };

    // Red: a miss, a cooldown, then through.
    eq((await call('POST', '/found', { token: ann.token, card: cards[redOrder[0]] })).body.result, 'found');
    const before = (await play(ann.token)).team.question;
    eq((await call('POST', '/answer', { token: ann.token, answer: 'nope' })).body.correct, false);
    let p = await play(ann.token);
    ok(p.team.cooldownUntil, 'cooldown set');
    ok(answerTo(p.team.question) !== answerTo(before), 'a miss moves the student on');
    eq((await call('POST', '/answer', { token: ann.token, answer: answerTo(p.team.question) })).status, 400);
    // A second's margin: stored timestamps never repeat, so they run a little ahead.
    tick(COOLDOWN_MS + 1000);
    eq((await call('POST', '/answer', { token: ann.token, answer: answerTo(p.team.question) })).body.correct, true);
    eq((await call('POST', '/answer', { token: bao.token, answer: answerTo((await play(bao.token)).team.question) })).body.correct, true);
    p = await play(ann.token);
    eq([p.team.phase, p.team.position, p.team.clue], ['find', 1, 'clue 1']);

    for (const s of redOrder.slice(1)) await solveStation(ann, bao, s);
    p = await play(bao.token);
    eq([p.team.phase, p.team.letters], ['final', ['D', 'G', 'L', 'O']]);

    for (const s of blueOrder) await solveStation(cam, dan, s);

    eq((await call('POST', '/answer', { token: bao.token, answer: 'GLOD' })).body.correct, false);
    eq((await call('POST', '/answer', { token: bao.token, answer: 'gold' })).status, 400);
    eq((await call('POST', '/answer', { token: ann.token, answer: 'gold' })).body.correct, true);
    eq((await play(ann.token)).outcome, { over: false, winner: 0 });

    eq((await call('POST', '/answer', { token: dan.token, answer: 'GOLD' })).body.correct, true);
    const board = (await call('GET', `/board?id=${hunt.id}`, undefined, TEACHER)).body.board;
    eq(board.outcome, { over: true, winner: 0 });
    eq(board.teams.map((t: { phase: string }) => t.phase), ['done', 'done']);
    ok(board.feed[0].kind === 'finish' && board.feed[0].player === 'Dan', 'feed newest first');
    ok(!JSON.stringify(board).includes('"answer"'), 'board leaks answers');

    // Every answer is a row, with what was given and which question it was.
    const rows = db.tables.hunt_answers;
    eq(rows.filter((a) => !a.correct).map((a) => a.given), ['nope', 'GLOD']);
    ok(rows.filter((a) => (a.station as number) >= 0).every((a) => a.question_id), 'station answers name their question');
    ok(rows.filter((a) => a.station === -1).every((a) => a.question_id === null), 'treasure guesses have none');
    eq(db.tables.hunt_finds.length, 8);

    // …and the teacher can read them back.
    const res = (await call('GET', `/results?id=${hunt.id}`, undefined, TEACHER)).body.results;
    eq(res.questions.length, 8);
    const missed = res.questions.filter((q: { wrong: unknown[] }) => q.wrong.length);
    eq(missed.map((q: { wrong: unknown }) => q.wrong), [[{ given: 'nope', count: 1 }]]);
    eq(res.treasure, { attempts: 3, correct: 2, wrong: [{ given: 'GLOD', count: 1 }] });
    const annRes = res.players.find((x: { name: string }) => x.name === 'Ann');
    ok(annRes.attempts > annRes.correct, 'Ann’s miss counted');
    eq(res.questions.reduce((n: number, q: { correct: number }) => n + q.correct, 0), 16);
  } finally {
    thaw();
  }
});

Deno.test('the clock running out ends it, further along wins', async () => {
  freeze();
  try {
    const { call, db } = setup();
    const hunt = await newHunt(call, db, { durationMin: 5, need: 1 });
    const ann = (await call('POST', '/join', { code: hunt.code, name: 'Ann' })).body.token;
    await call('POST', '/join', { code: hunt.code, name: 'Cam' });
    await call('POST', '/start', { id: hunt.id }, TEACHER);
    await call('POST', '/found', { token: ann, card: db.tables.hunt_stations[stationOrder(0, 4)[0]].card });
    const q = (await call('GET', `/play?token=${ann}`)).body.play.team.question;
    eq((await call('POST', '/answer', { token: ann, answer: answerTo(q) })).body.correct, true);
    tick(5 * 60_000 + 1);
    const p = (await call('GET', `/play?token=${ann}`)).body.play;
    eq([p.hunt.status, p.outcome], ['ended', { over: true, winner: 0 }]);
    eq((await call('POST', '/answer', { token: ann, answer: 'x' })).status, 400);
    eq((await call('POST', '/join', { code: hunt.code, name: 'Late' })).status, 400);
  } finally {
    thaw();
  }
});

Deno.test('the teacher can end it early; level is a draw', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call, db);
  await call('POST', '/join', { code: hunt.code, name: 'Ann' });
  await call('POST', '/join', { code: hunt.code, name: 'Cam' });
  await call('POST', '/start', { id: hunt.id }, TEACHER);
  const r = await call('POST', '/end', { id: hunt.id }, TEACHER);
  eq([r.body.board.hunt.status, r.body.board.outcome], ['ended', { over: true, winner: null }]);
});

Deno.test('a world hunt opens a station by its landmark', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call, db, { mode: 'world', need: 1, places: ['ngoMon', 'thaiHoa', 'kyDai', 'dongBa'] });
  const token = (await call('POST', '/join', { code: hunt.code, name: 'Ann' })).body.token;
  await call('POST', '/start', { id: hunt.id }, TEACHER);
  let p = (await call('GET', `/play?token=${token}`)).body.play;
  eq(p.team.place, 'ngoMon');
  eq((await call('POST', '/found', { token, card: 'thaiHoa' })).body.result, 'notYet');
  eq((await call('POST', '/found', { token, card: 'ngoMon' })).body.result, 'found');
  p = (await call('GET', `/play?token=${token}`)).body.play;
  eq((await call('POST', '/answer', { token, answer: answerTo(p.team.question) })).body.correct, true);
  p = (await call('GET', `/play?token=${token}`)).body.play;
  eq([p.team.phase, p.team.place], ['find', 'thaiHoa']);
});

Deno.test('her own questions grade her alternatives, and never send them', async () => {
  const { call, db } = setup();
  const setId = makeSet(db, [0, 1, 2].map((i) => ({ type: 'custom', prompt: `Colour ${i}?`, answer: 'grey', accept: ['gray'] })));
  const r = await call('POST', '', { title: 'Mine', treasure: 'CAT', setId, need: 1 }, TEACHER);
  const token = (await call('POST', '/join', { code: r.body.hunt.code, name: 'Ann' })).body.token;
  await call('POST', '/start', { id: r.body.hunt.id }, TEACHER);
  await call('POST', '/found', { token, card: db.tables.hunt_stations[0].card });
  const p = (await call('GET', `/play?token=${token}`)).body.play;
  eq(p.team.question, { type: 'custom', prompt: 'Colour 0?', options: null, image: null, slotPrompts: null, say: null, scrambled: null, length: null });
  ok(!JSON.stringify(p).includes('gray') && !JSON.stringify(p).includes('grey'), 'answer leaked');
  eq((await call('POST', '/answer', { token, answer: 'Gray' })).body.correct, true);
  eq(db.tables.hunt_answers[0].given, 'Gray');
});

Deno.test('picture and matching questions, end to end', async () => {
  const { call, db } = setup();
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  db.tables.word_doodles.push({ word: 'sun', doodle: png });
  const setId = makeSet(db, [
    { type: 'image', prompt: '', imageWord: 'sun', options: ['sun', 'moon'], answer: 'sun' },
    { type: 'match', prompt: '', slotPrompts: ['purrs', 'barks'], slots: ['cat', 'dog'], options: ['dog', 'cat', 'cow'], answer: 'cat · dog' },
    mcq(9),
  ]);
  const r = await call('POST', '', { title: 'P', treasure: 'CAT', setId, need: 1 }, TEACHER);
  eq(r.status, 200, JSON.stringify(r.body));
  const token = (await call('POST', '/join', { code: r.body.hunt.code, name: 'Ann' })).body.token;
  await call('POST', '/start', { id: r.body.hunt.id }, TEACHER);
  const cards = db.tables.hunt_stations.map((s) => s.card as string);

  // The picture: fetched by the question's id, never by its word, and only by
  // a player of this hunt.
  await call('POST', '/found', { token, card: cards[0] });
  let p = (await call('GET', `/play?token=${token}`)).body.play;
  const key = p.team.question.image;
  eq(key, db.tables.hunt_questions.find((q) => q.type === 'image')!.id);
  ok(!JSON.stringify(p).includes('base64'), 'picture rides on the poll');
  eq((await call('GET', `/image?token=${token}&key=${key}`)).body.image, png);
  eq((await call('GET', `/image?token=${token}&key=${crypto.randomUUID()}`)).status, 404);
  eq((await call('GET', `/image?token=${token}&key=sun`)).status, 400);
  eq((await call('GET', `/image?token=0123456789abcdef0123456789abcdef&key=${key}`)).status, 401);
  eq((await call('POST', '/answer', { token, answer: 'sun' })).body.correct, true);

  // Matching: the whole pairing at once, in the order of the meanings.
  await call('POST', '/found', { token, card: cards[1] });
  p = (await call('GET', `/play?token=${token}`)).body.play;
  eq(p.team.question.slotPrompts, ['purrs', 'barks']);
  ok(!JSON.stringify(p.team.question).includes('slots'), 'pairing leaked');
  eq((await call('POST', '/answer', { token, answer: ['dog', 'cat'] })).body.correct, false);
  eq(db.tables.hunt_answers.at(-1)!.given, 'dog | cat');
  clock = realNow() + COOLDOWN_MS + 1000;
  freeze();
  try {
    eq((await call('POST', '/answer', { token, answer: ['cat', 'dog'] })).body.correct, true);
  } finally {
    thaw();
  }
  eq((await call('GET', `/play?token=${token}`)).body.play.team.position, 2);
});
