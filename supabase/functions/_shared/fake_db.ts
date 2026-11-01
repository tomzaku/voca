// An in-memory stand-in for the slice of the supabase-js query builder the
// hunt and question-set functions use, so their tests can run every route
// without a database. Defaults, unique columns and ON DELETE CASCADE follow
// the migrations; a query it doesn't understand throws, so a new one can't
// silently pass a test.
//
// Test-only. Nothing in a deployed function imports it.

type Row = Record<string, unknown>;

/** Columns that are unique, per table — an insert that repeats one fails like Postgres's 23505. */
const UNIQUE: Record<string, string[]> = { hunts: ['code'], hunt_players: ['token_hash'] };

/** child table → [its column, parent table, parent column] — ON DELETE CASCADE. */
const CASCADE: [string, string, string, string][] = [
  ['hunt_players', 'hunt_id', 'hunts', 'id'],
  ['hunt_stations', 'hunt_id', 'hunts', 'id'],
  ['hunt_questions', 'hunt_id', 'hunts', 'id'],
  ['hunt_finds', 'hunt_id', 'hunts', 'id'],
  ['hunt_answers', 'hunt_id', 'hunts', 'id'],
  ['questions', 'set_id', 'question_sets', 'id'],
];

/** child → [its column, parent table] — ON DELETE SET NULL. */
const SET_NULL: [string, string, string][] = [
  ['hunt_questions', 'source_id', 'questions'],
  ['hunt_answers', 'question_id', 'hunt_questions'],
  ['hunts', 'set_id', 'question_sets'],
];

const many = (v: Row | Row[]) => (Array.isArray(v) ? v : [v]);

export class FakeDb {
  tables: Record<string, Row[]> = {
    hunts: [], hunt_players: [], hunt_stations: [], hunt_questions: [], hunt_finds: [], hunt_answers: [],
    question_sets: [], questions: [], word_doodles: [],
  };
  serial = 0;
  private lastAt = 0;

  /**
   * now(), never twice the same: separate requests never share a timestamp in
   * Postgres, but a test's frozen clock would make them all equal.
   */
  private stamp(): string {
    this.lastAt = Math.max(Date.now(), this.lastAt + 1);
    return new Date(this.lastAt).toISOString();
  }

  from(table: string) {
    if (!(table in this.tables)) throw new Error(`unknown table ${table}`);
    return new Query(this, table);
  }

  defaults(table: string, row: Row): Row {
    const now = this.stamp();
    switch (table) {
      case 'hunts':
        return { id: crypto.randomUUID(), set_id: null, play: 'teams', need: 2, team_names: ['Red', 'Blue'], duration_min: 30, status: 'lobby', started_at: null, ends_at: null, created_at: now, ...row };
      case 'hunt_players':
        return { id: crypto.randomUUID(), joined_at: now, ...row };
      case 'question_sets':
        return { id: crypto.randomUUID(), question_count: 0, created_at: now, updated_at: now, ...row };
      case 'questions':
      case 'hunt_questions':
        return { id: crypto.randomUUID(), prompt: '', options: null, accept: null, say: null, scrambled: null, image_word: null, pair_prompts: null, pair_words: null, word: null, ...row };
      case 'hunt_finds':
      case 'hunt_answers':
        return { id: ++this.serial, at: now, ...row };
      default:
        return { ...row };
    }
  }

  /** Deletes rows, following the foreign keys as Postgres would. */
  remove(table: string, gone: Row[]) {
    const ids = new Set(gone.map((r) => r.id));
    this.tables[table] = this.tables[table].filter((r) => !gone.includes(r));
    for (const [child, col, parent, pcol] of CASCADE) {
      if (parent !== table) continue;
      const doomed = this.tables[child].filter((r) => gone.some((g) => g[pcol] === r[col]));
      if (doomed.length) this.remove(child, doomed);
    }
    for (const [child, col, parent] of SET_NULL) {
      if (parent !== table) continue;
      for (const r of this.tables[child]) if (ids.has(r[col])) r[col] = null;
    }
  }
}

type Result = { data: unknown; error: { message: string; code?: string } | null; count?: number };

class Query implements PromiseLike<Result> {
  private filters: ((r: Row) => boolean)[] = [];
  private sort: { col: string; asc: boolean } | null = null;
  private max = Infinity;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
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
  insert(row: Row | Row[]) { this.op = 'insert'; this.payload = row; return this; }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this; }
  in(col: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[col])); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.sort = { col, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }

  private run(): Result {
    const rows = this.db.tables[this.table];
    const match = (r: Row) => this.filters.every((f) => f(r));
    let out: Row[];
    if (this.op === 'insert') {
      out = [];
      for (const given of many(this.payload!)) {
        const row = this.db.defaults(this.table, structuredClone(given));
        for (const col of UNIQUE[this.table] ?? []) {
          if (rows.some((r) => r[col] === row[col])) return { data: null, error: { message: 'duplicate', code: '23505' } };
        }
        rows.push(row);
        out.push(row);
      }
    } else if (this.op === 'update') {
      out = rows.filter(match);
      for (const r of out) Object.assign(r, this.payload as Row);
    } else if (this.op === 'delete') {
      out = rows.filter(match);
      this.db.remove(this.table, out);
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

  then<A, B>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.run()).then(ok, bad);
  }
}
