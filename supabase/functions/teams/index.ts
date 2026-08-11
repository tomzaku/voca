// Teams endpoint — the one door to the `teams` and `team_members` tables,
// which carry no row-level policies of their own (see the migration). Every
// rule about who may see or join a team is stated here, in one file, as code.
//
//   GET  /teams                    → { teams }      teams you can see, with your membership
//   GET  /teams/board   ?team=     → { team, rows, myRank, me, scoring }
//   GET  /teams/preview ?code=     → { preview }    what a code opens, before joining
//   POST /teams         { name, … }→ { team }       Pro only; you own it and are in it
//   POST /teams/join    { team }   → { team }       share your progress with it
//   POST /teams/leave   { team }   → { team }       stop sharing; the row is deleted
//   POST /teams/join-by-code { code }   → { team }  the way into a private team
//   POST /teams/rotate-invite { team }  → { team }  owner only; revokes shared links
//   PUT  /teams/scoring { team, since, until } → { team }  owner only; the period
//
// `team` is a team id, or omitted for the built-in Global team.
//
// `PUT /scoring` is a full replace of the team's scoring period, which is all a
// "reset the scores" button has to do: the score is derived from the review log
// on every read, so moving the window recomputes it rather than editing anyone's
// numbers. Omitting `since` puts the team back on the rolling default and every
// score with it. `until` bounds a challenge — after it passes the board is final.
//
// What a member shares lives on their membership row (name, avatar, words
// learned, streak), copied from their own session and progress when they join
// and refreshed each time they open a board.
//
// Reading a board also refreshes a bounded number of OTHER members whose
// numbers have gone stale — the one place this function touches progress that
// isn't the caller's. It exposes nothing new, since every number it computes is
// already on the board in front of them, and it's what keeps a decaying score
// honest: without it an absent member's peak would never fall. Everything else
// here reads only the caller's own rows.
//
// Deploy: `npm run deploy:teams`

import {
  BadRequest,
  corsHeaders,
  jsonResponse,
  oneOf,
  reqStr,
  requireUser,
  serviceClient,
} from '../_shared/ai.ts';
// The scoring rules — weights, the period, and the terms derived from the
// review log. Pure, and tested in _shared/teams.test.ts.
import {
  DAY_MS,
  scanLogs,
  scoreFrom,
  scoringFor,
  streakRun,
  windowFor,
  type ScoreWindow,
} from '../_shared/teams.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** How many places a board returns before it cuts to the caller's own row. */
const BOARD_LIMIT = 20;

/** A member's numbers are recomputed on a board load once they're older than this. */
const STALE_AFTER_MS = 6 * 3_600_000;
/** How many stale members one board load will refresh, oldest first. */
const REFRESH_LIMIT = 12;
/** How many of those run at once — each one costs four queries. */
const REFRESH_CONCURRENCY = 4;

/** Longest span a scoring period may cover. A bound on the log scan, not a rule. */
const MAX_WINDOW_DAYS = 400;

/** Guardrails on what one Pro account can create. Generous, but not unbounded. */
const MAX_TEAMS_PER_OWNER = 20;
const MAX_TEAM_MEMBERS = 200;

const MAX_NAME = 60;
const MAX_DESCRIPTION = 200;

// Invite codes are read off a screen and typed in, so the alphabet drops the
// characters that get confused for each other (0/O, 1/I/L). 8 characters over
// this alphabet is ~10^12 combinations — not guessable at any useful rate.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function newInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** A url-safe slug from the team name, with a suffix so two "Class 5A"s can coexist. */
function slugFor(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'team'}-${newInviteCode().toLowerCase().slice(0, 6)}`;
}

/**
 * Creating a team is Pro-only. Checked against `pro_users` through the caller's
 * OWN client: RLS lets a user read only their own row, so a row coming back is
 * proof it's theirs. Same check the `ai` function runs for its pro actions.
 */
async function requirePro(client: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await client
    .from('pro_users')
    .select('expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return 'Could not verify Pro status.';
  if (!data) return 'Creating a team requires a Pro account.';
  if (data.expires_at && new Date(data.expires_at as string) <= new Date()) {
    return 'Your Pro access has expired.';
  }
  return null;
}

/**
 * Routes → the operation each one performs. The method carries the verb: GET
 * never changes anything, POST does. Handlers below are unchanged by this
 * mapping — they read a plain `params` object, which comes from the query
 * string on a GET and from the JSON body on a POST.
 */
const ROUTES: Record<string, Action> = {
  'GET /': 'list',
  'POST /': 'create',
  'GET /board': 'board',
  'GET /preview': 'previewCode',
  'POST /join': 'join',
  'POST /join-by-code': 'joinByCode',
  'POST /leave': 'leave',
  'POST /rotate-invite': 'rotateInvite',
  'PUT /scoring': 'setScoring',
};

type Action =
  | 'list' | 'board' | 'join' | 'leave'
  | 'create' | 'rotateInvite' | 'previewCode' | 'joinByCode' | 'setScoring';

interface TeamRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  is_public: boolean;
  member_count: number;
  invite_code: string | null;
  scored_since: string | null;
  scored_until: string | null;
}

interface MemberRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  learned: number;
  streak: number;
  longest: number;
}

/** A team as the client sees it: the row plus this caller's relationship to it. */
function toTeam(t: TeamRow, userId: string, joined: boolean) {
  const isOwner = t.owner_id === userId;
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    isPublic: t.is_public,
    isOwner,
    joined,
    memberCount: t.member_count,
    // Owners only. A member holding the code could invite people the owner
    // never meant to let in, so it never leaves the server for anyone else.
    inviteCode: isOwner ? t.invite_code : null,
    // Everyone's, not just the owner's: "this challenge ends Friday" is the
    // main thing a member wants to know about a board they're on.
    scoredSince: t.scored_since,
    scoredUntil: t.scored_until,
  };
}

/**
 * An instant from the request, or null when the key is absent, null or empty —
 * which on a PUT is how that end of the window gets cleared.
 */
function dateParam(params: Record<string, unknown>, key: string): number | null {
  const v = params[key];
  if (v === undefined || v === null || v === '') return null;
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isFinite(t)) throw new BadRequest(`"${key}" must be an ISO date.`);
  return t;
}

/** A team id from the request, or null meaning "the built-in Global team". */
function teamParam(params: Record<string, unknown>): string | null {
  const v = params.team;
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) {
    throw new BadRequest('"team" must be a team id.');
  }
  return v;
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('teams') + 1).join('/');
  const action = ROUTES[`${req.method} /${sub}`];
  if (!action) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });

  const db = serviceClient();
  if (!db) return jsonResponse(500, { error: 'Server is not configured for teams.' });

  // A GET carries its parameters in the query string; a POST in its body.
  let params: Record<string, unknown>;
  if (req.method === 'GET') {
    params = Object.fromEntries(url.searchParams);
  } else {
    try {
      params = (await req.json() ?? {}) as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body.' });
    }
  }

  const userId = auth.user.id;

  try {

    // ── A member's numbers, against one team's window ────────────────
    // Everything scored is recomputed here from the review log; nothing is
    // carried over from the stored row. `score` therefore depends on the team,
    // because two teams can be counting over different spans — which is why
    // this takes a window rather than reading one global constant.
    const statsFor = async (id: string, w: ScoreWindow) => {
      const sinceIso = new Date(w.since).toISOString();
      const untilIso = new Date(w.until).toISOString();

      const [{ count: learned }, { data: settings }, { data: active }, { count: mastered }] =
        await Promise.all([
          db
            .from('user_word_progress')
            .select('word', { count: 'exact', head: true })
            .eq('user_id', id)
            .or('mastered.eq.true,status.eq.known'),
          db
            .from('user_settings')
            .select('streak_count, longest_streak')
            .eq('user_id', id)
            .maybeSingle(),
          // Only words touched inside the window can hold answers inside it, so
          // this filter keeps the logs pulled into memory small. No upper bound:
          // a row last reviewed after the window closed can still hold events
          // from inside it — scanLogs is what drops those, per event.
          db
            .from('user_word_progress')
            .select('review_log')
            .eq('user_id', id)
            .gte('last_reviewed_at', sinceIso)
            .limit(1000),
          // No mastered_at column exists, but a mastered word leaves the review
          // rotation entirely — so its last review IS the moment it graduated.
          // Words mastered through the "Know it" shortcut never set
          // last_reviewed_at and so aren't counted here; their answers still
          // score through the term above.
          db
            .from('user_word_progress')
            .select('word', { count: 'exact', head: true })
            .eq('user_id', id)
            .eq('mastered', true)
            .gte('last_reviewed_at', sinceIso)
            .lte('last_reviewed_at', untilIso),
        ]);

      const { wordDays, days } = scanLogs(active ?? [], w.since, w.until);

      return {
        score: scoreFrom({
          wordDays,
          mastered: mastered ?? 0,
          streakDays: streakRun(days, w.until),
        }),
        learned: learned ?? 0,
        // Displayed, not scored: the learner's real lifetime streak, which is
        // what they see everywhere else in the app.
        streak: (settings?.streak_count as number | null) ?? 0,
        longest: (settings?.longest_streak as number | null) ?? 0,
        stats_at: new Date().toISOString(),
      };
    };

    /** Resolve `team` to a row, or the Global team when omitted. */
    const loadTeam = async (id: string | null): Promise<TeamRow | null> => {
      const q = db.from('teams').select('*');
      const { data } = await (id ? q.eq('id', id) : q.eq('slug', 'global')).maybeSingle();
      return (data as TeamRow | null) ?? null;
    };

    const isMember = async (teamId: string): Promise<boolean> => {
      const { count } = await db
        .from('team_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('user_id', userId);
      return (count ?? 0) > 0;
    };

    /** Public teams are open; a private team is only for its owner and members. */
    const canSee = async (t: TeamRow) =>
      t.is_public || t.owner_id === userId || (await isMember(t.id));

    /** Recount rather than +/- 1, so the stored count can't drift. */
    const syncMemberCount = async (teamId: string): Promise<number> => {
      const { count } = await db
        .from('team_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('team_id', teamId);
      const n = count ?? 0;
      await db.from('teams').update({ member_count: n }).eq('id', teamId);
      return n;
    };

    if (action === 'list') {
      // Public teams, plus any private team the caller owns or belongs to.
      const [{ data: visible }, { data: mine }] = await Promise.all([
        db.from('teams').select('*').or(`is_public.eq.true,owner_id.eq.${userId}`),
        db.from('team_members').select('team_id').eq('user_id', userId),
      ]);
      const joinedIds = new Set((mine ?? []).map((m) => m.team_id as string));
      const byId = new Map<string, TeamRow>();
      for (const t of (visible ?? []) as TeamRow[]) byId.set(t.id, t);

      // A private team the caller was invited into isn't in `visible`.
      const missing = [...joinedIds].filter((id) => !byId.has(id));
      if (missing.length > 0) {
        const { data: extra } = await db.from('teams').select('*').in('id', missing);
        for (const t of (extra ?? []) as TeamRow[]) byId.set(t.id, t);
      }

      const teams = [...byId.values()]
        // Built-ins first (Global heads the list), then by name.
        .sort((a, b) =>
          Number(!!a.owner_id) - Number(!!b.owner_id) || a.name.localeCompare(b.name)
        )
        .map((t) => toTeam(t, userId, joinedIds.has(t.id)));

      return jsonResponse(200, { teams });
    }

    if (action === 'create') {
      const denial = await requirePro(auth.supabase, userId);
      if (denial) return jsonResponse(403, { error: denial });

      const name = reqStr(params, 'name', MAX_NAME);
      const description = typeof params.description === 'string'
        ? params.description.trim().slice(0, MAX_DESCRIPTION) || null
        : null;
      // Teams are invite-only unless asked otherwise: a team someone made for
      // their class shouldn't appear on strangers' team lists by default.
      const isPublic = params.isPublic === true;

      const { count: owned } = await db
        .from('teams')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId);
      if ((owned ?? 0) >= MAX_TEAMS_PER_OWNER) {
        return jsonResponse(403, { error: `You can own up to ${MAX_TEAMS_PER_OWNER} teams.` });
      }

      const { data: created, error: createErr } = await db
        .from('teams')
        .insert({
          slug: slugFor(name),
          name,
          description,
          owner_id: userId,
          is_public: isPublic,
          invite_code: newInviteCode(),
          member_count: 1,
        })
        .select('*')
        .single();
      if (createErr || !created) {
        console.error('[teams] create', createErr);
        return jsonResponse(500, { error: "Couldn't create the team." });
      }

      // The owner is a member from the start — a board you can't see yourself
      // on reads as broken, and there's nobody to compare against otherwise.
      const meta = auth.user.user_metadata ?? {};
      await db.from('team_members').insert({
        team_id: (created as TeamRow).id,
        user_id: userId,
        display_name: (meta.full_name as string | undefined) ??
          auth.user.email?.split('@')[0] ?? null,
        avatar_url: (meta.avatar_url as string | undefined) ?? null,
        ...(await statsFor(userId, windowFor(created as TeamRow, Date.now()))),
      });

      return jsonResponse(200, { team: toTeam(created as TeamRow, userId, true) });
    }

    // Uppercased so a code typed in lowercase off a printout still works.
    const codeParam = () => reqStr(params, 'code', 32).toUpperCase().replace(/\s+/g, '');

    const byCode = async (code: string): Promise<TeamRow | null> => {
      const { data } = await db.from('teams').select('*').eq('invite_code', code).maybeSingle();
      return (data as TeamRow | null) ?? null;
    };

    if (action === 'previewCode') {
      // What a code opens, without opening it: an invite link should be able to
      // say which team it's for before anyone agrees to share anything with it.
      const target = await byCode(codeParam());
      if (!target) return jsonResponse(404, { error: "That invite code doesn't work." });
      return jsonResponse(200, {
        preview: {
          name: target.name,
          description: target.description,
          memberCount: target.member_count,
          joined: await isMember(target.id),
          full: target.member_count >= MAX_TEAM_MEMBERS,
        },
      });
    }

    if (action === 'joinByCode') {
      const target = await byCode(codeParam());
      if (!target) return jsonResponse(404, { error: "That invite code doesn't work." });

      if (target.member_count >= MAX_TEAM_MEMBERS) {
        return jsonResponse(403, { error: 'This team is full.' });
      }

      // Holding the code IS the invitation — this is the one path into a
      // private team, which is why it doesn't consult is_public.
      const meta = auth.user.user_metadata ?? {};
      await db.from('team_members').upsert(
        {
          team_id: target.id,
          user_id: userId,
          display_name: (meta.full_name as string | undefined) ??
            auth.user.email?.split('@')[0] ?? null,
          avatar_url: (meta.avatar_url as string | undefined) ?? null,
          ...(await statsFor(userId, windowFor(target, Date.now()))),
        },
        { onConflict: 'team_id,user_id' },
      );
      target.member_count = await syncMemberCount(target.id);
      return jsonResponse(200, { team: toTeam(target, userId, true) });
    }

    const team = await loadTeam(teamParam(params));
    if (!team) return jsonResponse(404, { error: 'That team no longer exists.' });

    if (action === 'rotateInvite') {
      if (team.owner_id !== userId) {
        return jsonResponse(403, { error: 'Only the team owner can change the invite code.' });
      }
      const code = newInviteCode();
      await db.from('teams').update({ invite_code: code }).eq('id', team.id);
      // Every link handed out before this moment stops working — which is the
      // point of rotating one.
      team.invite_code = code;
      return jsonResponse(200, { team: toTeam(team, userId, await isMember(team.id)) });
    }

    if (action === 'setScoring') {
      // Global has no owner, so it can never be reset — its window is the one
      // thing every learner on it has in common.
      if (team.owner_id !== userId) {
        return jsonResponse(403, { error: 'Only the team owner can change the scoring period.' });
      }

      // A full replace, which is what PUT means here: leaving `since` out is
      // how a team goes back to the rolling window, not a request to keep it.
      const now = Date.now();
      const since = dateParam(params, 'since');
      const until = dateParam(params, 'until');
      const span = MAX_WINDOW_DAYS * DAY_MS;

      if (since !== null && (since < now - span || since > now + span)) {
        throw new BadRequest(
          `A scoring period has to start within ${MAX_WINDOW_DAYS} days of today.`,
        );
      }
      if (until !== null) {
        const start = since ?? now;
        if (until <= start) throw new BadRequest('The scoring period has to end after it starts.');
        if (until > start + span) {
          throw new BadRequest(`A scoring period can run for at most ${MAX_WINDOW_DAYS} days.`);
        }
      }

      team.scored_since = since === null ? null : new Date(since).toISOString();
      team.scored_until = until === null ? null : new Date(until).toISOString();
      await db
        .from('teams')
        .update({ scored_since: team.scored_since, scored_until: team.scored_until })
        .eq('id', team.id);

      // Every stored score was measured against the old window and means
      // nothing against the new one. Zeroed outright rather than left to look
      // like standings, and stamped stale so the board's pass recomputes them.
      // Nobody's history is touched: this is the whole of what a reset does,
      // and clearing the window again would restore every score exactly.
      await db
        .from('team_members')
        .update({ score: 0, stats_at: new Date(0).toISOString() })
        .eq('team_id', team.id);

      return jsonResponse(200, { team: toTeam(team, userId, await isMember(team.id)) });
    }

    if (action === 'join') {
      if (!team.is_public && team.owner_id !== userId) {
        // Invites are what will open a private team; until then, only its owner.
        return jsonResponse(403, { error: 'This team is invite-only.' });
      }
      const meta = auth.user.user_metadata ?? {};
      await db.from('team_members').upsert(
        {
          team_id: team.id,
          user_id: userId,
          // Shared knowingly at this moment — this is the join button's promise,
          // written down. Refreshed on later board loads so it stays current.
          display_name: (meta.full_name as string | undefined) ??
            auth.user.email?.split('@')[0] ?? null,
          avatar_url: (meta.avatar_url as string | undefined) ?? null,
          ...(await statsFor(userId, windowFor(team, Date.now()))),
        },
        { onConflict: 'team_id,user_id' },
      );
      team.member_count = await syncMemberCount(team.id);
      return jsonResponse(200, { team: toTeam(team, userId, true) });
    }

    if (action === 'leave') {
      // The membership row is everything that was shared, so this is the
      // complete undo — no copy of the caller's numbers is left behind.
      await db.from('team_members').delete().eq('team_id', team.id).eq('user_id', userId);
      team.member_count = await syncMemberCount(team.id);
      return jsonResponse(200, { team: toTeam(team, userId, false) });
    }

    // ── board ───────────────────────────────────────────────────────
    if (!(await canSee(team))) {
      return jsonResponse(403, { error: 'This team is private.' });
    }

    const now = Date.now();
    const w = windowFor(team, now);
    const joined = await isMember(team.id);

    // Opening the board is the moment to bring your own numbers up to date —
    // your rank should reflect the words you learned since you last looked, and
    // the client re-reads this after every correct answer expecting the score
    // to move. Skipped once the window has closed: the pass below is what
    // settles a finished challenge, and it only does so once.
    if (joined && !w.closed) {
      await db
        .from('team_members')
        .update(await statsFor(userId, w))
        .eq('team_id', team.id)
        .eq('user_id', userId);
    }

    // A closed board settles through the capped pass below, so on a big team
    // the caller could wait several loads to see their own final number. That's
    // the one row they'll check, so it doesn't queue behind anyone else's.
    if (joined && w.closed) {
      const { data: row } = await db
        .from('team_members')
        .select('stats_at')
        .eq('team_id', team.id)
        .eq('user_id', userId)
        .maybeSingle();
      if (row && Date.parse(row.stats_at as string) < w.until) {
        await db
          .from('team_members')
          .update(await statsFor(userId, w))
          .eq('team_id', team.id)
          .eq('user_id', userId);
      }
    }

    /**
     * Bring stale members up to date, oldest first and capped.
     *
     * Without this a score is only recomputed when that member opens a board,
     * which for a window that decays is worse than merely stale: an absent
     * member's peak never falls, so they keep outranking people who are still
     * turning up — the exact thing the window exists to prevent. It's also what
     * makes a closed challenge final, since one board load after the end brings
     * everyone to their last-day numbers and nothing moves them afterwards.
     *
     * Capped because this is the one place the function reads progress that
     * isn't the caller's. It exposes nothing new — every number it computes is
     * already on the board in front of them — but a single board load should
     * not be able to fan out across two hundred members.
     */
    const refreshStale = async () => {
      // Open: anything past the staleness cutoff. Closed: anything measured
      // before the close, which can only be true once per member.
      const cutoff = new Date(w.closed ? w.until : now - STALE_AFTER_MS).toISOString();
      const { data: stale } = await db
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id)
        .lt('stats_at', cutoff)
        .order('stats_at', { ascending: true })
        .limit(REFRESH_LIMIT);

      const ids = (stale ?? []).map((r) => r.user_id as string);
      for (let i = 0; i < ids.length; i += REFRESH_CONCURRENCY) {
        await Promise.all(
          ids.slice(i, i + REFRESH_CONCURRENCY).map(async (id) => {
            await db
              .from('team_members')
              .update(await statsFor(id, w))
              .eq('team_id', team.id)
              .eq('user_id', id);
          }),
        );
      }
    };
    await refreshStale();

    const { data: top } = await db
      .from('team_members')
      .select('user_id, display_name, avatar_url, score, learned, streak, longest')
      .eq('team_id', team.id)
      .order('score', { ascending: false })
      .order('learned', { ascending: false })
      .order('longest', { ascending: false })
      .limit(BOARD_LIMIT);

    const rows = (top ?? []) as MemberRow[];
    const meIndex = rows.findIndex((r) => r.user_id === userId);

    // The caller's own line, returned outright so a client showing "your score"
    // doesn't have to find itself among the rows — and can still show it when
    // it ranks below the cut. Read back from the table rather than kept in hand
    // from the update above, so it's the same number the rows were ranked on
    // whichever of the two passes last wrote it.
    let myRank: number | null = null;
    let me: (Omit<MemberRow, 'user_id' | 'display_name' | 'avatar_url'> & { rank: number }) | null =
      null;

    if (meIndex >= 0) {
      const row = rows[meIndex];
      myRank = meIndex + 1;
      me = {
        score: row.score,
        learned: row.learned,
        streak: row.streak,
        longest: row.longest,
        rank: myRank,
      };
    } else if (joined) {
      // Ranked below the cut: one count says how many members are ahead, which
      // is cheaper and clearer than paging the whole board to find yourself.
      const { data: row } = await db
        .from('team_members')
        .select('score, learned, streak, longest')
        .eq('team_id', team.id)
        .eq('user_id', userId)
        .maybeSingle();
      const { count: ahead } = await db
        .from('team_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .gt('score', (row?.score as number | null) ?? 0);
      myRank = (ahead ?? 0) + 1;
      me = row
        ? {
          score: row.score as number,
          learned: row.learned as number,
          streak: row.streak as number,
          longest: row.longest as number,
          rank: myRank,
        }
        : null;
    }

    return jsonResponse(200, {
      team: toTeam(team, userId, joined),
      rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
      myRank,
      me,
      // Sent with every board so the client's explanation of the score is the
      // formula and the period actually used, not a copy that can fall behind.
      scoring: scoringFor(w, team),
    });
  } catch (e) {
    if (e instanceof BadRequest) return jsonResponse(400, { error: e.message });
    console.error('[teams]', e);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
