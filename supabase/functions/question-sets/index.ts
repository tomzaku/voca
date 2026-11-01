// The `question-sets` resource — a teacher's reusable sets of questions, the
// thing she builds once and plays as many hunts as she likes. Each question
// is a row of `questions`; the checks on what makes one usable are the hunt
// rules' own (_shared/hunts.ts), so a set saved here is one a hunt can play.
//
//   GET    /question-sets            → { sets }   her own, most recently changed first
//   POST   /question-sets            → { set }    { title, questions }
//   GET    /question-sets/:id        → { set }    with its questions, in order
//   PUT    /question-sets/:id        → { set }    { title, questions } — replaces both
//   DELETE /question-sets/:id        → { ok }     idempotent
//
// PUT is a full replace, on purpose: the editor holds the whole set and sends
// it back whole, and "the questions are exactly these" is simpler to reason
// about than a patch. Hunts already played aren't touched — each hunt keeps
// its own copy of the questions it was made from (see the flat_hunts migration).
//
// The tables carry no row-level policies, like the hunt tables: this function
// holds the service role and checks ownership itself.
//
// Deploy: `npm run deploy:question-sets`

import { corsHeaders, jsonResponse, requireUser, serviceClient } from '../_shared/ai.ts';
import {
  cleanQuestions,
  fromColumns,
  Invalid,
  MAX_SET_QUESTIONS,
  MAX_TITLE,
  questionColumns,
  UUID,
  type QuestionColumns,
  type StoredQuestion,
} from '../_shared/hunts.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Enough for a teacher's whole year; a bound on the table, not a rule. */
const MAX_SETS_PER_OWNER = 100;
const LIST_LIMIT = 100;

const COLUMNS = 'id, type, prompt, answer, options, accept, say, scrambled, image_word, pair_prompts, pair_words, word';

interface SetRow {
  id: string;
  owner_id: string;
  title: string;
  question_count: number;
  created_at: string;
  updated_at: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function toSummary(r: SetRow) {
  return { id: r.id, title: r.title, questionCount: r.question_count, createdAt: r.created_at, updatedAt: r.updated_at };
}

export interface Deps {
  db: () => SupabaseClient | null;
  user: (req: Request) => Promise<{ user: { id: string } } | null>;
}

export function createHandler(deps: Deps) {
  return (req: Request) => handle(req, deps);
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
const handler = createHandler({ db: serviceClient, user: requireUser });
export default handler;

async function loadQuestions(db: SupabaseClient, setId: string): Promise<StoredQuestion[]> {
  const { data, error } = await db
    .from('questions')
    .select(COLUMNS)
    .eq('set_id', setId)
    .order('position')
    .limit(MAX_SET_QUESTIONS);
  if (error) throw new Error(error.message);
  return ((data ?? []) as (QuestionColumns & { id: string })[]).map(fromColumns);
}

/**
 * Writes the set's questions: the new rows go in first, and only then do the
 * old ones go — so a failed insert leaves the set as it was rather than empty.
 */
async function replaceQuestions(db: SupabaseClient, setId: string, questions: StoredQuestion[]) {
  const { data: old, error: oldError } = await db.from('questions').select('id').eq('set_id', setId).limit(MAX_SET_QUESTIONS * 2);
  if (oldError) throw new Error(oldError.message);
  if (questions.length) {
    const rows = questions.map((q, position) => ({ set_id: setId, position, ...questionColumns(q) }));
    const { error } = await db.from('questions').insert(rows);
    if (error) throw new Error(error.message);
  }
  const ids = (old ?? []).map((r) => r.id as string);
  if (ids.length) {
    const { error } = await db.from('questions').delete().in('id', ids);
    if (error) throw new Error(error.message);
  }
}

async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const [id, ...rest] = parts.slice(parts.lastIndexOf('question-sets') + 1);
  if (rest.length || (id !== undefined && !UUID.test(id))) return jsonResponse(404, { error: 'Not found' });

  const db = deps.db();
  if (!db) return jsonResponse(500, { error: 'The server is missing its service key.' });
  const auth = await deps.user(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to keep question sets.' });
  const owner = auth.user.id;

  const body = async (): Promise<Record<string, unknown>> => {
    try {
      const b = await req.json();
      if (b && typeof b === 'object' && !Array.isArray(b)) return b as Record<string, unknown>;
    } catch { /* fall through */ }
    throw new HttpError(400, 'Invalid JSON body.');
  };

  /** Title and questions from a POST or PUT, checked. */
  const content = async () => {
    const b = await body();
    const title = typeof b.title === 'string' ? b.title.trim().slice(0, MAX_TITLE) : '';
    if (!title) throw new HttpError(400, 'Give the set a name.');
    return { title, questions: cleanQuestions(b.questions) };
  };

  /** Her set, or a 404 — someone else's is reported exactly like a missing one. */
  const owned = async (setId: string): Promise<SetRow> => {
    const { data, error } = await db.from('question_sets').select('*').eq('id', setId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || (data as SetRow).owner_id !== owner) throw new HttpError(404, 'Question set not found.');
    return data as SetRow;
  };

  const full = async (row: SetRow) => ({ ...toSummary(row), questions: await loadQuestions(db, row.id) });

  try {
    if (id === undefined && req.method === 'GET') {
      const { data, error } = await db
        .from('question_sets')
        .select('*')
        .eq('owner_id', owner)
        .order('updated_at', { ascending: false })
        .limit(LIST_LIMIT);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { sets: ((data ?? []) as SetRow[]).map(toSummary) });
    }

    if (id === undefined && req.method === 'POST') {
      const { title, questions } = await content();
      const { count, error: countError } = await db
        .from('question_sets')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', owner);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) >= MAX_SETS_PER_OWNER) {
        return jsonResponse(400, { error: `You can keep up to ${MAX_SETS_PER_OWNER} sets — delete an old one first.` });
      }
      const { data, error } = await db
        .from('question_sets')
        .insert({ owner_id: owner, title, question_count: questions.length })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      try {
        await replaceQuestions(db, (data as SetRow).id, questions);
      } catch (err) {
        // Half a set is worse than none: the teacher would think it saved.
        await db.from('question_sets').delete().eq('id', (data as SetRow).id);
        throw err;
      }
      return jsonResponse(200, { set: await full(data as SetRow) });
    }

    if (id !== undefined && req.method === 'GET') {
      return jsonResponse(200, { set: await full(await owned(id)) });
    }

    if (id !== undefined && req.method === 'PUT') {
      await owned(id);
      const { title, questions } = await content();
      await replaceQuestions(db, id, questions);
      const { data, error } = await db
        .from('question_sets')
        .update({ title, question_count: questions.length, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return jsonResponse(200, { set: await full(data as SetRow) });
    }

    if (id !== undefined && req.method === 'DELETE') {
      const { error } = await db.from('question_sets').delete().eq('id', id).eq('owner_id', owner);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse(err.status, { error: err.message });
    if (err instanceof Invalid) return jsonResponse(400, { error: err.message });
    console.error('[question-sets]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
