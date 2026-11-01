// The `hunts` routes, end to end, against an in-memory stand-in for the three
// tables: a teacher makes a hunt, a class joins, both teams race to the
// treasure — and every rule a student could try to break is tried.
//
//   deno test --allow-env supabase/functions/hunts/handler_test.ts
//
// (A Deno test rather than vitest: the handler imports npm: specifiers.)
// The fake implements only the slice of the supabase-js query builder this
// function uses; a query it doesn't understand throws, so a new one can't
// silently pass here.

import { createHandler } from './index.ts';
import { COOLDOWN_MS, stationOrder, type Station } from '../_shared/hunts.ts';

// ── A tiny in-memory PostgREST ──────────────────────────────────────────────

type Row = Record<string, unknown>;

const UNIQUE: Record<string, string[]> = { hunts: ['code'], hunt_players: ['token_hash'] };

export class FakeDb {
  tables: Record<string, Row[]> = { hunts: [], hunt_players: [], hunt_events: [] };
  serial = 0;
  from(table: string) {
    if (!(table in this.tables)) throw new Error(`unknown table ${table}`);
    return new Query(this, table);
  }
  defaults(table: string, row: Row): Row {
    const now = new Date(Date.now()).toISOString();
    if (table === 'hunts') {
      return { id: crypto.randomUUID(), need: 2, team_names: ['Red', 'Blue'], duration_min: 30, status: 'lobby', started_at: null, ends_at: null, created_at: now, ...row };
    }
    if (table === 'hunt_players') return { id: crypto.randomUUID(), joined_at: now, ...row };
    return { id: ++this.serial, at: now, ...row };
  }
}

class Query implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null; count?: number }> {
  private filters: ((r: Row) => boolean)[] = [];
  private sort: { col: string; asc: boolean } | null = null;
  private max = Infinity;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | null = null;
  private returning = false;
  private one: 'single' | 'maybe' | null = null;
  private counting = false;
  private head = false;

  constructor(private db: FakeDb, private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === 'select') {
      this.counting = opts?.count === 'exact';
      this.head = Boolean(opts?.head);
    } else this.returning = true;
    return this;
  }
  insert(row: Row) { this.op = 'insert'; this.payload = row; return this; }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this; }
  in(col: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[col])); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.sort = { col, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }

  private run() {
    const rows = this.db.tables[this.table];
    const match = (r: Row) => this.filters.every((f) => f(r));
    let out: Row[];
    if (this.op === 'insert') {
      const row = this.db.defaults(this.table, structuredClone(this.payload!));
      for (const col of UNIQUE[this.table] ?? []) {
        if (rows.some((r) => r[col] === row[col])) return { data: null, error: { message: 'duplicate', code: '23505' } };
      }
      rows.push(row);
      out = [row];
    } else if (this.op === 'update') {
      out = rows.filter(match);
      for (const r of out) Object.assign(r, this.payload);
    } else if (this.op === 'delete') {
      const gone = rows.filter(match);
      this.db.tables[this.table] = rows.filter((r) => !match(r));
      // Cascades, as the foreign keys do.
      if (this.table === 'hunts') {
        for (const t of ['hunt_players', 'hunt_events']) {
          this.db.tables[t] = this.db.tables[t].filter((r) => !gone.some((g) => g.id === r.hunt_id));
        }
      }
      out = gone;
    } else {
      out = rows.filter(match);
    }
    if (this.sort) {
      const { col, asc } = this.sort;
      out = [...out].sort((a, b) => {
        const x = a[col] as string | number, y = b[col] as string | number;
        return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1);
      });
    }
    out = out.slice(0, this.max).map((r) => structuredClone(r));
    if (this.counting) return { data: this.head ? null : out, error: null, count: out.length };
    if (this.op !== 'select' && !this.returning) return { data: null, error: null };
    if (this.one === 'single') {
      return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: `expected 1 row, got ${out.length}` } };
    }
    if (this.one === 'maybe') return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }

  then<A, B>(ok?: ((v: ReturnType<Query['run']>) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.run()).then(ok, bad);
  }
}

// ── Harness ─────────────────────────────────────────────────────────────────

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
  const call = async (method: string, path: string, body?: unknown, as?: string) => {
    const res = await handler(new Request(`http://x/functions/v1/hunts${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(as ? { 'x-test-user': as } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
    // deno-lint-ignore no-explicit-any
    return { status: res.status, body: await res.json() as any };
  };
  return { db, call };
}

/** One question per station, answer `w<i>`; the treasure spells GOLD. */
function stations(mode: 'qr' | 'world') {
  const places = ['ngoMon', 'thaiHoa', 'kyDai', 'dongBa'];
  return Array.from({ length: 4 }, (_, i) => ({
    type: 'definition',
    clue: `clue ${i}`,
    place: mode === 'world' ? places[i] : null,
    questions: [
      { type: 'definition', prompt: `meaning ${i}a`, options: [`w${i}`, 'nope', 'never'], answer: `w${i}` },
      { type: 'spell', prompt: '', say: `w${i}`, answer: `w${i}` },
    ],
  }));
}

async function newHunt(call: ReturnType<typeof setup>['call'], mode: 'qr' | 'world' = 'qr', extra: Record<string, unknown> = {}) {
  const r = await call('POST', '', { title: 'Class 5A', mode, treasure: 'gold', stations: stations(mode), need: 2, durationMin: 20, ...extra }, TEACHER);
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

// ── The teacher ─────────────────────────────────────────────────────────────

Deno.test('creating needs a signed-in teacher', async () => {
  const { call } = setup();
  eq((await call('POST', '', { title: 'x', treasure: 'gold', stations: stations('qr') })).status, 401);
  eq((await call('GET', '')).status, 401);
});

Deno.test('a hunt is created with server-made codes, letters and defaults', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call);
  eq(hunt.status, 'lobby');
  eq(hunt.stations, 4);
  ok(/^[A-HJKMNP-Z2-9]{6}$/.test(hunt.code), `join code ${hunt.code}`);
  const row = db.tables.hunts[0];
  eq(row.treasure, 'GOLD');
  eq((row.stations as Station[]).map((s) => s.letter).join(''), 'GOLD');
  eq(new Set((row.stations as Station[]).map((s) => s.card)).size, 4);
  eq(row.owner_id, TEACHER);
});

Deno.test('bad input is a 400 with a message', async () => {
  const { call } = setup();
  const r1 = await call('POST', '', { title: 'x', treasure: 'go', stations: stations('qr') }, TEACHER);
  eq(r1.status, 400);
  ok(typeof r1.body.error === 'string', 'has error');
  const r2 = await call('POST', '', { title: '', treasure: 'gold', stations: stations('qr') }, TEACHER);
  eq(r2.status, 400);
  const r3 = await call('POST', '', 'not an object', TEACHER);
  eq(r3.status, 400);
});

Deno.test('another teacher can’t see, start or delete your hunt', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call);
  eq((await call('GET', `/board?id=${hunt.id}`, undefined, STRANGER)).status, 404);
  eq((await call('POST', '/start', { id: hunt.id }, STRANGER)).status, 404);
  eq((await call('GET', '', undefined, STRANGER)).body.hunts, []);
  await call('DELETE', `?id=${hunt.id}`, undefined, STRANGER);
  eq(db.tables.hunts.length, 1);
});

Deno.test('delete is idempotent and takes the players with it', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call);
  await call('POST', '/join', { code: hunt.code, name: 'Ann' });
  eq((await call('DELETE', `?id=${hunt.id}`, undefined, TEACHER)).status, 200);
  eq((await call('DELETE', `?id=${hunt.id}`, undefined, TEACHER)).status, 200);
  eq(db.tables.hunts.length, 0);
  eq(db.tables.hunt_players.length, 0);
});

Deno.test('unknown routes are 404', async () => {
  const { call } = setup();
  eq((await call('GET', '/nope', undefined, TEACHER)).status, 404);
  eq((await call('PATCH', '', {}, TEACHER)).status, 404);
});

// ── Joining ─────────────────────────────────────────────────────────────────

Deno.test('students join without accounts and fill the teams evenly', async () => {
  const { call, db } = setup();
  const hunt = await newHunt(call);
  const teams = [];
  for (const name of ['Ann', 'Bao', 'Cam', 'Dan', 'Eve']) {
    const r = await call('POST', '/join', { code: hunt.code.toLowerCase(), name });
    eq(r.status, 200);
    ok(r.body.token.length >= 32, 'token');
    teams.push(r.body.play.me.team);
  }
  eq(teams, [0, 1, 0, 1, 0]);
  // Only the hash is kept.
  ok(db.tables.hunt_players.every((p) => typeof p.token_hash === 'string' && !('token' in p)), 'hashed');
});

Deno.test('joining needs a real code and a name', async () => {
  const { call } = setup();
  const hunt = await newHunt(call);
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
  const { call } = setup();
  const hunt = await newHunt(call);
  const ann = (await call('POST', '/join', { code: hunt.code, name: 'Ann' })).body.play.me;
  const r = await call('POST', '/move', { id: hunt.id, player: ann.id, team: 1 }, TEACHER);
  eq(r.status, 200);
  eq(r.body.board.teams[1].players.map((p: { name: string }) => p.name), ['Ann']);
  eq((await call('POST', '/move', { id: hunt.id, player: ann.id, team: 2 }, TEACHER)).status, 400);
});

// ── The race ────────────────────────────────────────────────────────────────

Deno.test('a whole classroom race, start to treasure', async () => {
  freeze();
  try {
    const { call, db } = setup();
    const hunt = await newHunt(call);
    const join = async (name: string) => {
      const r = await call('POST', '/join', { code: hunt.code, name });
      return { token: r.body.token as string, team: r.body.play.me.team as number };
    };
    const ann = await join('Ann'); // red
    const cam = await join('Cam'); // blue
    const bao = await join('Bao'); // red
    const dan = await join('Dan'); // blue
    eq([ann.team, cam.team, bao.team, dan.team], [0, 1, 0, 1]);

    const cards = (db.tables.hunts[0].stations as Station[]).map((s) => s.card);
    const play = async (t: string) => (await call('GET', `/play?token=${t}`)).body.play;

    // Nothing counts before the start.
    eq((await call('POST', '/found', { token: ann.token, card: cards[0] })).status, 400);
    let p = await play(ann.token);
    eq(p.hunt.status, 'lobby');
    eq(p.team.clue, 'clue 0');

    eq((await call('POST', '/start', { id: hunt.id }, TEACHER)).status, 200);
    eq((await call('POST', '/start', { id: hunt.id }, TEACHER)).status, 400);

    // The teams start at different cards; the clue never gives the code away.
    const redOrder = stationOrder(0, 4);
    const blueOrder = stationOrder(1, 4);
    p = await play(cam.token);
    eq(p.team.clue, `clue ${blueOrder[0]}`);
    ok(!JSON.stringify(p).includes(cards[blueOrder[0]]), 'card code leaked');

    // A card out of turn, and a card that isn't one.
    eq((await call('POST', '/found', { token: ann.token, card: cards[redOrder[1]] })).body.result, 'notYet');
    eq((await call('POST', '/found', { token: ann.token, card: 'XXXX' })).body.result, 'unknown');

    // Nothing to answer before the card's found.
    eq((await call('POST', '/answer', { token: ann.token, answer: 'w0' })).status, 400);

    const solveStation = async (a: { token: string }, b: { token: string }, s: number) => {
      eq((await call('POST', '/found', { token: a.token, card: cards[s].toLowerCase() })).body.result, 'found');
      // Finding it twice is fine and changes nothing.
      eq((await call('POST', '/found', { token: b.token, card: cards[s] })).body.result, 'already');
      const qa = (await play(a.token)).team.question;
      const qb = (await play(b.token)).team.question;
      ok(qa && qb, 'both have a question');
      ok(!('answer' in qa), 'answer leaked');
      eq((await call('POST', '/answer', { token: a.token, answer: `W${s}` })).body.correct, true);
      // One student can't answer twice for the team.
      eq((await call('POST', '/answer', { token: a.token, answer: `w${s}` })).status, 400);
      eq((await play(a.token)).team.iSolved, true);
      eq((await call('POST', '/answer', { token: b.token, answer: ` w${s} ` })).body.correct, true);
    };

    // Red: a miss, a cooldown, then through.
    eq((await call('POST', '/found', { token: ann.token, card: cards[redOrder[0]] })).body.result, 'found');
    const before = (await play(ann.token)).team.question;
    eq((await call('POST', '/answer', { token: ann.token, answer: 'nope' })).body.correct, false);
    p = await play(ann.token);
    ok(p.team.cooldownUntil, 'cooldown set');
    eq(p.team.question.type === before.type && p.team.question.prompt === before.prompt, false);
    eq((await call('POST', '/answer', { token: ann.token, answer: 'w0' })).status, 400);
    tick(COOLDOWN_MS + 1);
    eq((await call('POST', '/answer', { token: ann.token, answer: 'w0' })).body.correct, true);
    eq((await call('POST', '/answer', { token: bao.token, answer: 'w0' })).body.correct, true);
    p = await play(ann.token);
    eq([p.team.phase, p.team.position, p.team.clue], ['find', 1, 'clue 1']);
    eq(p.rival.position, 0);

    for (const s of redOrder.slice(1)) await solveStation(ann, bao, s);
    p = await play(bao.token);
    eq(p.team.phase, 'final');
    eq(p.team.letters, ['D', 'G', 'L', 'O']);
    eq(p.team.question, null);

    // Blue gets close too.
    for (const s of blueOrder) await solveStation(cam, dan, s);

    // A wrong treasure guess, then the right one.
    eq((await call('POST', '/answer', { token: bao.token, answer: 'GLOD' })).body.correct, false);
    eq((await call('POST', '/answer', { token: bao.token, answer: 'gold' })).status, 400); // cooling down
    eq((await call('POST', '/answer', { token: ann.token, answer: 'gold' })).body.correct, true);
    p = await play(ann.token);
    eq([p.team.phase, p.outcome], ['done', { over: false, winner: 0 }]);

    // Blue finishes second; the race is over, and red still won.
    eq((await call('POST', '/answer', { token: dan.token, answer: 'GOLD' })).body.correct, true);
    const board = (await call('GET', `/board?id=${hunt.id}`, undefined, TEACHER)).body.board;
    eq(board.outcome, { over: true, winner: 0 });
    eq(board.teams.map((t: { phase: string }) => t.phase), ['done', 'done']);
    ok(board.feed.length > 0 && board.feed[0].kind === 'finish' && board.feed[0].player === 'Dan', 'feed newest first');
    ok(!JSON.stringify(board).includes('"questions"'), 'board leaks questions');
  } finally {
    thaw();
  }
});

Deno.test('the clock running out ends it, further along wins', async () => {
  freeze();
  try {
    const { call, db } = setup();
    const hunt = await newHunt(call, 'qr', { durationMin: 5, need: 1 });
    const ann = (await call('POST', '/join', { code: hunt.code, name: 'Ann' })).body.token;
    await call('POST', '/join', { code: hunt.code, name: 'Cam' });
    await call('POST', '/start', { id: hunt.id }, TEACHER);
    const card = (db.tables.hunts[0].stations as Station[])[stationOrder(0, 4)[0]].card;
    await call('POST', '/found', { token: ann, card });
    eq((await call('POST', '/answer', { token: ann, answer: `w${stationOrder(0, 4)[0]}` })).body.correct, true);
    tick(5 * 60_000 + 1);
    const p = (await call('GET', `/play?token=${ann}`)).body.play;
    eq(p.hunt.status, 'ended');
    eq(p.outcome, { over: true, winner: 0 });
    eq((await call('POST', '/answer', { token: ann, answer: 'x' })).status, 400);
    // Too late to join, too.
    eq((await call('POST', '/join', { code: hunt.code, name: 'Late' })).status, 400);
  } finally {
    thaw();
  }
});

Deno.test('the teacher can end it early; level is a draw', async () => {
  const { call } = setup();
  const hunt = await newHunt(call);
  await call('POST', '/join', { code: hunt.code, name: 'Ann' });
  await call('POST', '/join', { code: hunt.code, name: 'Cam' });
  await call('POST', '/start', { id: hunt.id }, TEACHER);
  const r = await call('POST', '/end', { id: hunt.id }, TEACHER);
  eq(r.body.board.hunt.status, 'ended');
  eq(r.body.board.outcome, { over: true, winner: null });
});

Deno.test('a world hunt opens a station by its landmark', async () => {
  const { call } = setup();
  const hunt = await newHunt(call, 'world', { need: 1 });
  const r = await call('POST', '/join', { code: hunt.code, name: 'Ann' });
  const token = r.body.token;
  await call('POST', '/start', { id: hunt.id }, TEACHER);
  let p = (await call('GET', `/play?token=${token}`)).body.play;
  eq(p.team.place, 'ngoMon');
  eq((await call('POST', '/found', { token, card: 'thaiHoa' })).body.result, 'notYet');
  eq((await call('POST', '/found', { token, card: 'ngoMon' })).body.result, 'found');
  eq((await call('POST', '/answer', { token, answer: 'w0' })).body.correct, true);
  p = (await call('GET', `/play?token=${token}`)).body.play;
  eq([p.team.phase, p.team.place], ['find', 'thaiHoa']);
});

Deno.test('a world hunt refuses two stations on one place', async () => {
  const { call } = setup();
  const same = stations('world').map((s) => ({ ...s, place: 'ngoMon' }));
  const r = await call('POST', '', { title: 'x', mode: 'world', treasure: 'gold', stations: same }, TEACHER);
  eq(r.status, 400);
});

Deno.test('a hunt of the teacher’s own questions grades her alternatives, and never sends them', async () => {
  const { call, db } = setup();
  const own = Array.from({ length: 3 }, (_, i) => ({
    type: 'custom', clue: '', place: null,
    questions: [{ type: 'custom', prompt: `Colour ${i}?`, answer: 'grey', accept: ['gray'] }],
  }));
  const r = await call('POST', '', { title: 'Mine', mode: 'qr', treasure: 'CAT', stations: own, need: 1 }, TEACHER);
  eq(r.status, 200, JSON.stringify(r.body));
  const token = (await call('POST', '/join', { code: r.body.hunt.code, name: 'Ann' })).body.token;
  await call('POST', '/start', { id: r.body.hunt.id }, TEACHER);
  const cards = (db.tables.hunts[0].stations as Station[]).map((s) => s.card);
  await call('POST', '/found', { token, card: cards[0] });
  const p = (await call('GET', `/play?token=${token}`)).body.play;
  eq(p.team.question, { type: 'custom', prompt: 'Colour 0?', options: null, say: null, scrambled: null, length: null });
  ok(!JSON.stringify(p).includes('gray') && !JSON.stringify(p).includes('grey'), 'answer leaked');
  eq((await call('POST', '/answer', { token, answer: 'Gray' })).body.correct, true);
});
