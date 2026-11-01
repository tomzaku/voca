// The `hunts` resource — a teacher's treasure hunt, two teams racing through a
// chain of English challenges. The rules (who's where, who won) are pure and
// live in _shared/hunts.ts; this file is the door to the tables.
//
// The teacher, signed in:
//   GET    /hunts                         → { hunts }   their own, newest first
//   POST   /hunts      { title, mode, treasure, setId, clues, places, need, durationMin, teamNames } → { hunt }
//   DELETE /hunts      ?id=               → { ok }      idempotent
//   GET    /hunts/board ?id=              → { board }   the projector's view
//   GET    /hunts/results ?id=            → { results } every question and every student, how they did
//   GET    /hunts/stations ?id=           → { rehearsal } every station with its questions AND answers — her
//                                          own hunt, for playing it through as a student before class
//   POST   /hunts/start { id }            → { board }   opens the race, starts the clock
//   POST   /hunts/end   { id }            → { board }   stops it early
//   POST   /hunts/move  { id, player, team } → { board }  balance the teams by hand
//
// A student, no account needed:
//   GET    /hunts/preview ?code=          → { preview } what a code opens, before joining
//   POST   /hunts/join   { code, name }   → { token, play }
//   GET    /hunts/play   ?token=          → { play }    my team's place in the race
//   POST   /hunts/found  { token, card }  → { result, play }  scanned a card / reached a place
//   POST   /hunts/answer { token, answer }→ { correct, play }   answer: string, or string[] for matching
//   GET    /hunts/image  ?token=&key=     → { image }   a picture question's picture
//
// The tables (see the flat_hunts migration): a hunt has its stations, its own
// copy of the questions — made from a question set when it's created, so
// editing the set later can't change a game under way — its players, the
// cards they found, and every answer they gave. The race itself isn't stored:
// it's replayed from the finds and the answers on each read, so two teammates
// answering at the same instant both just add a row.
//
// WHY A TOKEN AND NOT THE SESSION. A class of children opening a link on their
// phones won't have accounts, and shouldn't need one. Joining hands back a
// random token the device keeps; it's the student's credential for this hunt
// and nothing else, and only its hash is stored. It identifies the player the
// way a session would — the server never takes a player or team id from a
// student's request, it looks the token up.
//
// Every answer is graded here, against questions the browser never sees — the
// tables have no policies at all, so reading the answers out of the network
// tab isn't possible.
//
// Deploy: `npm run deploy:hunts` (and `npm run db:push` for the tables).

import { corsHeaders, jsonResponse, requireUser, serviceClient } from '../_shared/ai.ts';
import {
  buildStations,
  clampInt,
  cleanTeamNames,
  cleanTreasure,
  cooldownUntil,
  FINAL,
  fromColumns,
  givenText,
  Invalid,
  isCorrect,
  isLive,
  MAX_NAME,
  MAX_PLAYERS,
  MAX_SET_QUESTIONS,
  MAX_SLOTS,
  MAX_STATION_QUESTIONS,
  MAX_STATIONS,
  MAX_TITLE,
  outcome,
  publicQuestion,
  questionColumns,
  questionIndex,
  randomCode,
  shownLetters,
  stationOrder,
  teamForNewPlayer,
  teamState,
  TEAMS,
  UUID,
  type HuntEvent,
  type Player,
  type QuestionColumns,
  type Station,
  type StoredQuestion,
  type TeamState,
} from '../_shared/hunts.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_HUNTS_PER_OWNER = 50;
const JOIN_CODE_LENGTH = 6;
const CARD_CODE_LENGTH = 4;
const FEED_LIMIT = 15;
/** Rows one results read takes: a long hunt's answers, with room to spare. */
const RESULTS_LIMIT = 5000;

const QUESTION_COLUMNS = 'id, station, position, type, prompt, answer, options, accept, say, scrambled, image_word, pair_prompts, pair_words, word';

interface HuntRow {
  id: string;
  owner_id: string;
  set_id: string | null;
  code: string;
  title: string;
  mode: 'qr' | 'world';
  treasure: string;
  need: number;
  team_names: string[];
  duration_min: number;
  status: 'lobby' | 'live' | 'ended';
  started_at: string | null;
  ends_at: string | null;
  created_at: string;
}

/** A hunt with its stations and their questions, ready for the rules. */
interface Hunt extends HuntRow {
  stations: Station[];
}

interface PlayerRow extends Player {
  team: 0 | 1;
}

interface AnswerRow {
  id: number;
  player_id: string | null;
  team: number;
  station: number;
  question_id: string | null;
  given: string;
  correct: boolean;
  at: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function code(length: number): string {
  return randomCode(length, crypto.getRandomValues(new Uint8Array(length)));
}

/** One fresh card code per station, no two alike. */
function uniqueCodes(n: number): string[] {
  const out = new Set<string>();
  while (out.size < n) out.add(code(CARD_CODE_LENGTH));
  return [...out];
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Reads ───────────────────────────────────────────────────────────────────

async function loadHunt(db: SupabaseClient, by: 'id' | 'code', value: string): Promise<HuntRow | null> {
  const { data, error } = await db.from('hunts').select('*').eq(by, value).maybeSingle();
  if (error) throw new Error(error.message);
  return data as HuntRow | null;
}

/** The hunt's stations, each with its questions in order. Two small reads. */
async function withStations(db: SupabaseClient, h: HuntRow): Promise<Hunt> {
  const [st, qs] = await Promise.all([
    db.from('hunt_stations').select('station, card, place, clue, letter').eq('hunt_id', h.id).order('station').limit(MAX_STATIONS),
    db.from('hunt_questions').select(QUESTION_COLUMNS).eq('hunt_id', h.id).order('position')
      .limit(MAX_STATIONS * MAX_STATION_QUESTIONS),
  ]);
  if (st.error) throw new Error(st.error.message);
  if (qs.error) throw new Error(qs.error.message);
  const questions = (qs.data ?? []) as (QuestionColumns & { id: string; station: number })[];
  const stations = ((st.data ?? []) as { station: number; card: string; place: string | null; clue: string; letter: string }[])
    .map((s) => ({
      card: s.card,
      place: s.place,
      clue: s.clue,
      letter: s.letter,
      questions: questions.filter((q) => q.station === s.station).map(fromColumns),
    }));
  return { ...h, stations };
}

async function loadPlayers(db: SupabaseClient, huntId: string): Promise<PlayerRow[]> {
  const { data, error } = await db
    .from('hunt_players')
    .select('id, name, team, joined_at')
    .eq('hunt_id', huntId)
    .order('joined_at')
    .limit(MAX_PLAYERS);
  if (error) throw new Error(error.message);
  return (data ?? []) as PlayerRow[];
}

/**
 * What the replay needs, as the rules' events: every card found, and every
 * right answer (a station solved, or the treasure opened). Both are bounded —
 * a find or a solve the race no longer needs is refused — so a whole hunt's
 * worth is a few hundred rows. Wrong answers aren't (a student can keep
 * guessing), so they're read per player, below.
 */
async function loadProgress(db: SupabaseClient, huntId: string): Promise<HuntEvent[]> {
  const [finds, rights] = await Promise.all([
    db.from('hunt_finds').select('team, station, player_id, at').eq('hunt_id', huntId).order('id').limit(500),
    db.from('hunt_answers').select('team, station, player_id, at').eq('hunt_id', huntId).eq('correct', true).order('id').limit(1000),
  ]);
  if (finds.error) throw new Error(finds.error.message);
  if (rights.error) throw new Error(rights.error.message);
  type Row = { team: number; station: number; player_id: string | null; at: string };
  return [
    ...((finds.data ?? []) as Row[]).map((r): HuntEvent => ({ ...r, kind: 'found' })),
    ...((rights.data ?? []) as Row[]).map((r): HuntEvent => ({ ...r, kind: r.station === FINAL ? 'finish' : 'solve' })),
  ].sort((a, b) => a.at.localeCompare(b.at));
}

/** One student's wrong answers at one station — their cooldown, and which question they're on. */
async function loadMisses(db: SupabaseClient, huntId: string, playerId: string, station: number): Promise<HuntEvent[]> {
  const { data, error } = await db
    .from('hunt_answers')
    .select('team, station, player_id, at')
    .eq('hunt_id', huntId)
    .eq('player_id', playerId)
    .eq('station', station)
    .eq('correct', false)
    .order('id')
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Omit<HuntEvent, 'kind'>[]).map((r) => ({ ...r, kind: 'miss' }));
}

async function recordAnswer(
  db: SupabaseClient,
  h: HuntRow,
  p: PlayerRow,
  station: number,
  question: StoredQuestion | null,
  given: string | string[],
  correct: boolean,
) {
  const { error } = await db.from('hunt_answers').insert({
    hunt_id: h.id,
    player_id: p.id,
    team: p.team,
    station,
    question_id: question?.id ?? null,
    given: givenText(given),
    correct,
  });
  if (error) throw new Error(error.message);
}

/** The hunt as its owner lists it. One station per letter of the treasure. */
function toSummary(h: HuntRow, playerCount?: number) {
  return {
    id: h.id,
    code: h.code,
    title: h.title,
    mode: h.mode,
    status: h.status,
    setId: h.set_id,
    stations: h.treasure.length,
    teamNames: h.team_names,
    durationMin: h.duration_min,
    need: h.need,
    startedAt: h.started_at,
    endsAt: h.ends_at,
    createdAt: h.created_at,
    playerCount: playerCount ?? null,
  };
}

/** The status, with a live hunt whose clock has run out reported as ended. */
function effectiveStatus(h: HuntRow, now: number): HuntRow['status'] {
  return h.status === 'live' && !isLive(h, now) ? 'ended' : h.status;
}

// ── The teacher's board, and the results ────────────────────────────────────

async function board(db: SupabaseClient, h: Hunt) {
  const now = Date.now();
  const [players, events, finds, answers] = await Promise.all([
    loadPlayers(db, h.id),
    loadProgress(db, h.id),
    db.from('hunt_finds').select('team, station, player_id, at').eq('hunt_id', h.id).order('id', { ascending: false }).limit(FEED_LIMIT),
    db.from('hunt_answers').select('team, station, player_id, given, correct, at').eq('hunt_id', h.id).order('id', { ascending: false }).limit(FEED_LIMIT),
  ]);
  if (finds.error) throw new Error(finds.error.message);
  if (answers.error) throw new Error(answers.error.message);
  const states = TEAMS.map((t) => teamState(h.stations, t, h.need, players, events));
  const names = new Map(players.map((p) => [p.id, p.name]));
  type Feed = { at: string; team: number; kind: HuntEvent['kind']; station: number; player: string | null; given: string | null };
  const feed: Feed[] = [
    ...((finds.data ?? []) as { team: number; station: number; player_id: string | null; at: string }[])
      .map((e) => ({ at: e.at, team: e.team, kind: 'found' as const, station: e.station, player: (e.player_id && names.get(e.player_id)) || null, given: null })),
    ...((answers.data ?? []) as Omit<AnswerRow, 'id' | 'question_id'>[]).map((e) => ({
      at: e.at,
      team: e.team,
      kind: (e.correct ? (e.station === FINAL ? 'finish' : 'solve') : 'miss') as HuntEvent['kind'],
      station: e.station,
      player: (e.player_id && names.get(e.player_id)) || null,
      // What a student got wrong is the teacher's to see — that's the lesson.
      given: e.correct ? null : e.given,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, FEED_LIMIT);
  return {
    hunt: { ...toSummary(h, players.length), status: effectiveStatus(h, now), treasure: h.treasure },
    // The owner's own hunt, so the cards and clues are theirs to see — but not
    // the questions, which the board has no use for.
    stations: h.stations.map((s, i) => ({ index: i, card: s.card, place: s.place, clue: s.clue, letter: s.letter })),
    teams: TEAMS.map((t) => ({
      team: t,
      name: h.team_names[t],
      players: players.filter((p) => p.team === t).map((p) => ({ id: p.id, name: p.name })),
      order: stationOrder(t, h.stations.length),
      ...stateView(states[t]),
    })),
    feed,
    outcome: outcome(states, h, now),
  };
}

/**
 * How every question and every student did. Per question: how often it was
 * answered and answered right, and the wrong answers the class gave most —
 * the part a teacher teaches from. The treasure word counts as a question of
 * its own. Old answers from before answers were recorded in full have no
 * question, and are counted only for their students.
 */
async function results(db: SupabaseClient, h: Hunt) {
  const [players, answers] = await Promise.all([
    loadPlayers(db, h.id),
    db.from('hunt_answers').select('id, player_id, team, station, question_id, given, correct, at').eq('hunt_id', h.id).order('id').limit(RESULTS_LIMIT),
  ]);
  if (answers.error) throw new Error(answers.error.message);
  const rows = (answers.data ?? []) as AnswerRow[];

  const tally = (list: AnswerRow[]) => {
    const wrong = new Map<string, number>();
    for (const a of list) if (!a.correct && a.given) wrong.set(a.given, (wrong.get(a.given) ?? 0) + 1);
    return {
      attempts: list.length,
      correct: list.filter((a) => a.correct).length,
      wrong: [...wrong].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([given, count]) => ({ given, count })),
    };
  };

  const questions = h.stations.flatMap((s, station) => s.questions.map((q) => ({
    id: q.id!,
    station,
    type: q.type,
    prompt: q.prompt,
    answer: q.answer,
    ...tally(rows.filter((a) => a.question_id === q.id)),
  })));
  return {
    hunt: { ...toSummary(h, players.length), status: effectiveStatus(h, Date.now()), treasure: h.treasure },
    questions,
    treasure: tally(rows.filter((a) => a.station === FINAL)),
    players: players.map((p) => {
      const mine = rows.filter((a) => a.player_id === p.id);
      return { id: p.id, name: p.name, team: p.team, attempts: mine.length, correct: mine.filter((a) => a.correct).length };
    }),
  };
}

/** A team's replayed state, as both screens show it. */
function stateView(s: TeamState) {
  return {
    phase: s.phase,
    position: s.position,
    station: s.station,
    need: s.need,
    solved: s.solvedBy.length,
    letters: s.letters.length,
    finishedAt: s.finishedAt,
  };
}

// ── A student's view ────────────────────────────────────────────────────────

async function playerFor(db: SupabaseClient, token: unknown): Promise<{ player: PlayerRow; hunt: Hunt }> {
  if (typeof token !== 'string' || token.length < 16 || token.length > 128) {
    throw new HttpError(400, '"token" is required.');
  }
  const { data, error } = await db
    .from('hunt_players')
    .select('id, name, team, joined_at, hunt_id')
    .eq('token_hash', await hashToken(token))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(401, 'You’re not in this hunt any more — join again.');
  const hunt = await loadHunt(db, 'id', data.hunt_id as string);
  if (!hunt) throw new HttpError(404, 'This hunt has been deleted.');
  return { player: data as PlayerRow, hunt: await withStations(db, hunt) };
}

/**
 * Everything a student's screen needs, from their team's side. The other team
 * is just a position — enough for a race, not enough to copy from.
 */
async function play(db: SupabaseClient, h: Hunt, me: PlayerRow) {
  const now = Date.now();
  const [players, events] = await Promise.all([loadPlayers(db, h.id), loadProgress(db, h.id)]);
  const states = TEAMS.map((t) => teamState(h.stations, t, h.need, players, events));
  const mine = states[me.team];
  const rival = states[me.team === 0 ? 1 : 0];
  const live = isLive(h, now);
  const at = mine.station === null ? null : h.stations[mine.station];

  let question = null;
  let cooldown: string | null = null;
  const iSolved = mine.solvedBy.includes(me.id);
  if (live && mine.phase === 'solve' && at?.questions.length && !iSolved) {
    const misses = await loadMisses(db, h.id, me.id, mine.station!);
    const i = questionIndex(mine.station!, at.questions.length, players, me, misses);
    question = publicQuestion(at.questions[i]);
    cooldown = cooldownUntil(misses, me.id, mine.station!, now);
  }
  if (live && mine.phase === 'final') {
    cooldown = cooldownUntil(await loadMisses(db, h.id, me.id, FINAL), me.id, FINAL, now);
  }

  return {
    hunt: {
      id: h.id,
      code: h.code,
      title: h.title,
      mode: h.mode,
      status: effectiveStatus(h, now),
      stations: h.stations.length,
      teamNames: h.team_names,
      endsAt: h.ends_at,
    },
    me: { id: me.id, name: me.name, team: me.team },
    teammates: players.filter((p) => p.team === me.team).map((p) => p.name),
    team: {
      ...stateView(mine),
      iSolved,
      // Where to go next. The classroom's clue is the teacher's words — never
      // the card code itself, or the hunt is just typing it in.
      clue: mine.phase === 'find' && at ? at.clue : null,
      place: mine.phase === 'find' && at ? at.place : null,
      letters: shownLetters(mine.letters),
      treasureLength: h.stations.length,
      question,
      cooldownUntil: cooldown,
    },
    rival: { name: h.team_names[rival.team], ...stateView(rival) },
    outcome: outcome(states, h, now),
    serverTime: new Date(now).toISOString(),
  };
}

// ── Routing ─────────────────────────────────────────────────────────────────

/**
 * What the handler reaches outside itself for: the service-role database and
 * the signed-in caller. Injected so handler_test.ts can run every route
 * against an in-memory database.
 */
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

async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = '/' + parts.slice(parts.lastIndexOf('hunts') + 1).join('/');
  const route = `${req.method} ${sub === '/' ? '/' : sub.replace(/\/$/, '')}`;
  const q = (k: string) => url.searchParams.get(k) ?? '';

  const body = async (): Promise<Record<string, unknown>> => {
    try {
      const b = await req.json();
      if (b && typeof b === 'object' && !Array.isArray(b)) return b as Record<string, unknown>;
    } catch { /* fall through */ }
    throw new HttpError(400, 'Invalid JSON body.');
  };

  const db = deps.db();
  if (!db) return jsonResponse(500, { error: 'The server is missing its service key.' });

  try {
    // ── Open to students ──────────────────────────────────────────
    switch (route) {
      case 'GET /preview': {
        const h = await loadHunt(db, 'code', q('code').toUpperCase().slice(0, 12));
        if (!h) return jsonResponse(404, { error: 'No hunt has that code.' });
        const players = await loadPlayers(db, h.id);
        return jsonResponse(200, {
          preview: {
            title: h.title,
            mode: h.mode,
            status: effectiveStatus(h, Date.now()),
            teamNames: h.team_names,
            playerCount: players.length,
          },
        });
      }

      case 'POST /join': {
        const b = await body();
        const row = await loadHunt(db, 'code', str(b.code, 12).toUpperCase());
        if (!row) return jsonResponse(404, { error: 'No hunt has that code.' });
        if (effectiveStatus(row, Date.now()) === 'ended') return jsonResponse(400, { error: 'This hunt has finished.' });
        const name = str(b.name, MAX_NAME);
        if (!name) return jsonResponse(400, { error: 'Please type your name.' });
        const players = await loadPlayers(db, row.id);
        if (players.length >= MAX_PLAYERS) return jsonResponse(400, { error: 'This hunt is full.' });
        const token = [...crypto.getRandomValues(new Uint8Array(24))].map((x) => x.toString(16).padStart(2, '0')).join('');
        const { data, error } = await db
          .from('hunt_players')
          .insert({ hunt_id: row.id, token_hash: await hashToken(token), name, team: teamForNewPlayer(players) })
          .select('id, name, team, joined_at')
          .single();
        if (error) throw new Error(error.message);
        return jsonResponse(200, { token, play: await play(db, await withStations(db, row), data as PlayerRow) });
      }

      // A picture question's picture, by the question's id — fetched once, so
      // pictures never ride along on the poll, and the request never names the
      // word. The picture is the app's own, from `word_doodles`.
      case 'GET /image': {
        const { hunt } = await playerFor(db, q('token'));
        const key = q('key');
        if (!UUID.test(key)) return jsonResponse(400, { error: '"key" is required.' });
        const question = hunt.stations.flatMap((s) => s.questions).find((x) => x.id === key);
        if (!question?.imageWord) return jsonResponse(404, { error: 'Picture not found.' });
        const { data, error } = await db.from('word_doodles').select('doodle').eq('word', question.imageWord).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return jsonResponse(404, { error: 'Picture not found.' });
        return jsonResponse(200, { image: data.doodle as string });
      }

      case 'GET /play': {
        const { player, hunt } = await playerFor(db, q('token'));
        return jsonResponse(200, { play: await play(db, hunt, player) });
      }

      case 'POST /found': {
        const b = await body();
        const { player, hunt } = await playerFor(db, b.token);
        if (!isLive(hunt, Date.now())) return jsonResponse(400, { error: 'The hunt isn’t running.' });
        const card = str(b.card, 40);
        const players = await loadPlayers(db, hunt.id);
        const state = teamState(hunt.stations, player.team, hunt.need, players, await loadProgress(db, hunt.id));
        // A card is its code in the classroom, its landmark in the world.
        const match = (s: Station) => (hunt.mode === 'world' ? s.place === card : s.card === card.toUpperCase());
        const index = hunt.stations.findIndex(match);
        let result: 'found' | 'already' | 'notYet' | 'unknown';
        if (index < 0) result = 'unknown';
        else if (state.phase === 'find' && state.station === index) {
          const { error } = await db.from('hunt_finds').insert({ hunt_id: hunt.id, team: player.team, station: index, player_id: player.id });
          if (error) throw new Error(error.message);
          result = 'found';
        } else {
          const done = stationOrder(player.team, hunt.stations.length).indexOf(index) <= state.position;
          result = done ? 'already' : 'notYet';
        }
        return jsonResponse(200, { result, play: await play(db, hunt, player) });
      }

      case 'POST /answer': {
        const b = await body();
        const { player, hunt } = await playerFor(db, b.token);
        const now = Date.now();
        if (!isLive(hunt, now)) return jsonResponse(400, { error: 'The hunt isn’t running.' });
        // A string, or — for a matching question — one word per meaning.
        const answer = Array.isArray(b.answer)
          ? b.answer.slice(0, MAX_SLOTS).map((a) => str(a, 60))
          : str(b.answer, 60);
        if (!answer.length) return jsonResponse(400, { error: '"answer" is required.' });
        const players = await loadPlayers(db, hunt.id);
        const state = teamState(hunt.stations, player.team, hunt.need, players, await loadProgress(db, hunt.id));

        if (state.phase === 'final') {
          const misses = await loadMisses(db, hunt.id, player.id, FINAL);
          if (cooldownUntil(misses, player.id, FINAL, now)) return jsonResponse(400, { error: 'Wait a moment before trying again.' });
          const correct = typeof answer === 'string' && isCorrect({ answer: hunt.treasure }, answer);
          await recordAnswer(db, hunt, player, FINAL, null, answer, correct);
          return jsonResponse(200, { correct, play: await play(db, hunt, player) });
        }

        if (state.phase !== 'solve' || state.station === null) {
          return jsonResponse(400, { error: 'There’s no question to answer right now.' });
        }
        if (state.solvedBy.includes(player.id)) {
          return jsonResponse(400, { error: 'You’ve answered here — it’s your teammates’ turn.' });
        }
        const station = hunt.stations[state.station];
        if (!station.questions.length) return jsonResponse(400, { error: 'This station has no questions.' });
        const misses = await loadMisses(db, hunt.id, player.id, state.station);
        if (cooldownUntil(misses, player.id, state.station, now)) {
          return jsonResponse(400, { error: 'Wait a moment before trying again.' });
        }
        // Graded against the question this player was shown — the same pick
        // `play` made, from the same misses.
        const question = station.questions[questionIndex(state.station, station.questions.length, players, player, misses)];
        const correct = isCorrect(question, answer);
        await recordAnswer(db, hunt, player, state.station, question, answer, correct);
        return jsonResponse(200, { correct, play: await play(db, hunt, player) });
      }
    }

    // ── The teacher ───────────────────────────────────────────────
    const auth = await deps.user(req);
    if (!auth) return jsonResponse(401, { error: 'Please sign in to run a treasure hunt.' });
    const owner = auth.user.id;

    const owned = async (id: unknown): Promise<Hunt> => {
      if (typeof id !== 'string' || !UUID.test(id)) throw new HttpError(400, '"id" is required.');
      const h = await loadHunt(db, 'id', id);
      // Someone else's hunt is reported exactly like a missing one.
      if (!h || h.owner_id !== owner) throw new HttpError(404, 'Hunt not found.');
      return withStations(db, h);
    };

    switch (route) {
      case 'GET /': {
        const { data, error } = await db
          .from('hunts')
          .select('*')
          .eq('owner_id', owner)
          .order('created_at', { ascending: false })
          .limit(MAX_HUNTS_PER_OWNER);
        if (error) throw new Error(error.message);
        return jsonResponse(200, { hunts: ((data ?? []) as HuntRow[]).map((h) => ({ ...toSummary(h), status: effectiveStatus(h, Date.now()) })) });
      }

      case 'POST /': {
        const b = await body();
        const title = str(b.title, MAX_TITLE);
        if (!title) return jsonResponse(400, { error: 'Give the hunt a name.' });
        const mode = b.mode === 'world' ? 'world' : 'qr';
        const treasure = cleanTreasure(b.treasure);

        // The set it plays — hers, and only hers.
        if (typeof b.setId !== 'string' || !UUID.test(b.setId)) return jsonResponse(400, { error: '"setId" is required.' });
        const { data: set, error: setError } = await db.from('question_sets').select('id, owner_id').eq('id', b.setId).maybeSingle();
        if (setError) throw new Error(setError.message);
        if (!set || set.owner_id !== owner) return jsonResponse(404, { error: 'Question set not found.' });
        const { data: qRows, error: qError } = await db
          .from('questions')
          .select('id, type, prompt, answer, options, accept, say, scrambled, image_word, pair_prompts, pair_words, word')
          .eq('set_id', set.id)
          .order('position')
          .limit(MAX_SET_QUESTIONS);
        if (qError) throw new Error(qError.message);
        const stations = buildStations(
          ((qRows ?? []) as (QuestionColumns & { id: string })[]).map(fromColumns),
          treasure,
          mode,
          uniqueCodes(treasure.length),
          { clues: b.clues, places: b.places },
        );

        const { count, error: countError } = await db
          .from('hunts')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', owner);
        if (countError) throw new Error(countError.message);
        if ((count ?? 0) >= MAX_HUNTS_PER_OWNER) {
          return jsonResponse(400, { error: `You can keep up to ${MAX_HUNTS_PER_OWNER} hunts — delete an old one first.` });
        }
        // A join code collision is vanishingly rare, but it's a unique column:
        // try a fresh code rather than fail the teacher's hunt.
        let row: HuntRow | null = null;
        for (let attempt = 0; attempt < 5 && !row; attempt++) {
          const { data, error } = await db
            .from('hunts')
            .insert({
              owner_id: owner,
              set_id: set.id,
              code: code(JOIN_CODE_LENGTH),
              title,
              mode,
              treasure,
              need: clampInt(b.need, 1, 5, 2),
              team_names: cleanTeamNames(b.teamNames),
              duration_min: clampInt(b.durationMin, 5, 180, 30),
            })
            .select('*')
            .single();
          if (!error) row = data as HuntRow;
          else if (error.code !== '23505') throw new Error(error.message);
        }
        if (!row) throw new Error('Could not find a free join code.');

        try {
          const { error: sError } = await db.from('hunt_stations').insert(stations.map((s, station) => ({
            hunt_id: row!.id, station, card: s.card, place: s.place, clue: s.clue, letter: s.letter,
          })));
          if (sError) throw new Error(sError.message);
          // The hunt's own copy of each question, remembering where it came from.
          const { error: hqError } = await db.from('hunt_questions').insert(stations.flatMap((s, station) =>
            s.questions.map((qq, position) => ({ hunt_id: row!.id, station, position, source_id: qq.id ?? null, ...questionColumns(qq) }))));
          if (hqError) throw new Error(hqError.message);
        } catch (err) {
          // A hunt without its stations would strand a class; better none and a retry.
          await db.from('hunts').delete().eq('id', row.id);
          throw err;
        }
        return jsonResponse(200, { hunt: toSummary(row, 0) });
      }

      case 'DELETE /': {
        const id = q('id');
        if (!UUID.test(id)) return jsonResponse(400, { error: '"id" is required.' });
        const { error } = await db.from('hunts').delete().eq('id', id).eq('owner_id', owner);
        if (error) throw new Error(error.message);
        return jsonResponse(200, { ok: true });
      }

      case 'GET /board':
        return jsonResponse(200, { board: await board(db, await owned(q('id'))) });

      case 'GET /results':
        return jsonResponse(200, { results: await results(db, await owned(q('id'))) });

      // The teacher's rehearsal: the whole hunt, answers included, so she can
      // play it through as a student would — graded on her device, recorded
      // nowhere. Owner only: these are the answers.
      case 'GET /stations': {
        const h = await owned(q('id'));
        return jsonResponse(200, {
          rehearsal: {
            title: h.title,
            mode: h.mode,
            treasure: h.treasure,
            need: h.need,
            teamNames: h.team_names,
            stations: h.stations.map((s, index) => ({ index, place: s.place, clue: s.clue, letter: s.letter, questions: s.questions })),
          },
        });
      }

      case 'POST /start': {
        const h = await owned((await body()).id);
        if (h.status !== 'lobby') return jsonResponse(400, { error: 'This hunt has already started.' });
        const now = Date.now();
        const { data, error } = await db
          .from('hunts')
          .update({
            status: 'live',
            started_at: new Date(now).toISOString(),
            ends_at: new Date(now + h.duration_min * 60_000).toISOString(),
          })
          .eq('id', h.id)
          .eq('status', 'lobby')
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return jsonResponse(200, { board: await board(db, { ...(data as HuntRow), stations: h.stations }) });
      }

      case 'POST /end': {
        const h = await owned((await body()).id);
        const { data, error } = await db
          .from('hunts')
          .update({ status: 'ended', ends_at: h.ends_at ?? new Date().toISOString() })
          .eq('id', h.id)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return jsonResponse(200, { board: await board(db, { ...(data as HuntRow), stations: h.stations }) });
      }

      case 'POST /move': {
        const b = await body();
        const h = await owned(b.id);
        if (typeof b.player !== 'string' || !UUID.test(b.player)) return jsonResponse(400, { error: '"player" is required.' });
        if (b.team !== 0 && b.team !== 1) return jsonResponse(400, { error: '"team" must be 0 or 1.' });
        const { error } = await db
          .from('hunt_players')
          .update({ team: b.team })
          .eq('id', b.player)
          .eq('hunt_id', h.id);
        if (error) throw new Error(error.message);
        return jsonResponse(200, { board: await board(db, h) });
      }
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse(err.status, { error: err.message });
    if (err instanceof Invalid) return jsonResponse(400, { error: err.message });
    console.error('[hunts]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
