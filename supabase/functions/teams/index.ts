// Teams endpoint — the one door to the `teams` and `team_members` tables,
// which carry no row-level policies of their own (see the migration). Every
// rule about who may see or join a team is stated here, in one file, as code.
//
//   POST { action, params }
//
//   list                → 200 { teams }            teams you can see, with your membership
//   board  { team }     → 200 { team, rows, … }    one team's standings
//   join   { team }     → 200 { team }             share your progress with it
//   leave  { team }     → 200 { team }             stop sharing; the row is deleted
//   create { name, … }  → 200 { team }             Pro only; you own it and are in it
//   rotateInvite {team} → 200 { team }             owner only; revokes shared links
//   joinByCode { code } → 200 { team }             the way into a private team
//
// `team` is a team id, or omitted for the built-in Global team.
//
// What a member shares lives on their membership row (name, avatar, words
// learned, streak), copied from their own session and progress when they join
// and refreshed each time they open a board. Nothing here reads one user's
// private progress on behalf of another: the only progress query is for the
// caller, over their own rows.
//
// Deploy: `supabase functions deploy teams`

import {
  BadRequest,
  corsHeaders,
  jsonResponse,
  oneOf,
  reqStr,
  requireUser,
  serviceClient,
} from '../_shared/ai.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** How many places a board returns before it cuts to the caller's own row. */
const BOARD_LIMIT = 20;

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

// ─── Scoring ────────────────────────────────────────────────────────
// The board ranks on a ROLLING score, not a lifetime total. A cumulative count
// only ever goes up, so the standings would freeze in favour of whoever started
// first and reward nobody for still turning up; a window that decays means a
// place has to be held. The three terms are effort, outcome and consistency:
//
//   1 point   per word answered correctly, counted once per word per day
//   2 points  per word that reached Mastered in the window
//   1 point   per day of the current streak
//
// These numbers are sent to the client with every board (see `SCORING`), so the
// "how is this worked out?" tooltip can never drift from what's computed here.

const WINDOW_DAYS = 30;

const POINTS = {
  /** One correct answer of one word on one day. Repeat drills the same day don't stack. */
  correctDay: 1,
  /** Reaching Mastered — the FSRS interval passing ~3 weeks. */
  mastered: 2,
  /** Each day of the current streak. */
  streakDay: 1,
} as const;

const SCORING = { windowDays: WINDOW_DAYS, points: POINTS };

interface ReviewEvent {
  at: string;
  ok: boolean;
}

/**
 * Distinct (word, day) pairs answered correctly inside the window.
 *
 * Deduping per word per day matches uniqueByWord() on the dashboard calendar,
 * so a day that shows "6 words" there is worth 6 points here. Days are UTC,
 * where the calendar's are local — the only case that differs is the same word
 * drilled either side of local midnight, which is worth a point either way.
 */
function correctWordDays(rows: { review_log: unknown }[], since: number): number {
  let total = 0;
  for (const row of rows) {
    const log = Array.isArray(row.review_log) ? (row.review_log as ReviewEvent[]) : [];
    const days = new Set<string>();
    for (const ev of log) {
      if (!ev?.ok || typeof ev.at !== 'string') continue;
      const t = Date.parse(ev.at);
      if (!Number.isFinite(t) || t < since) continue;
      days.add(new Date(t).toISOString().slice(0, 10));
    }
    total += days.size;
  }
  return total;
}

const ACTIONS = [
  'list',
  'board',
  'join',
  'leave',
  'create',
  'rotateInvite',
  'previewCode',
  'joinByCode',
] as const;

interface TeamRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  is_public: boolean;
  member_count: number;
  invite_code: string | null;
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
  };
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });

  const db = serviceClient();
  if (!db) return jsonResponse(500, { error: 'Server is not configured for teams.' });

  let body: { action?: unknown; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const params = (body.params ?? {}) as Record<string, unknown>;
  const userId = auth.user.id;

  try {
    const action = oneOf({ action: body.action }, 'action', ACTIONS);

    // ── The caller's own numbers ────────────────────────────────────
    // Read from their progress, never from anyone else's, and only ever written
    // to their own membership rows.
    const myStats = async () => {
      const since = Date.now() - WINDOW_DAYS * 86_400_000;
      const sinceIso = new Date(since).toISOString();

      const [{ count: learned }, { data: settings }, { data: active }, { count: mastered }] =
        await Promise.all([
          db
            .from('user_word_progress')
            .select('word', { count: 'exact', head: true })
            .eq('user_id', userId)
            .or('mastered.eq.true,status.eq.known'),
          db
            .from('user_settings')
            .select('streak_count, longest_streak')
            .eq('user_id', userId)
            .maybeSingle(),
          // Only words touched inside the window can hold answers inside it, so
          // this filter keeps the logs pulled into memory small.
          db
            .from('user_word_progress')
            .select('review_log')
            .eq('user_id', userId)
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
            .eq('user_id', userId)
            .eq('mastered', true)
            .gte('last_reviewed_at', sinceIso),
        ]);

      const streak = (settings?.streak_count as number | null) ?? 0;
      const score = correctWordDays(active ?? [], since) * POINTS.correctDay +
        (mastered ?? 0) * POINTS.mastered +
        streak * POINTS.streakDay;

      return {
        score,
        learned: learned ?? 0,
        streak,
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
        ...(await myStats()),
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
          ...(await myStats()),
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
          ...(await myStats()),
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

    const joined = await isMember(team.id);
    // Opening the board is the moment to bring your own numbers up to date —
    // your rank should reflect the words you learned since you last looked.
    // Kept in hand as well as written: the caller's own numbers are returned
    // outright, so a client showing "your score" doesn't have to find itself
    // among the rows (and can still show it when it ranks below the cut).
    let mine: Awaited<ReturnType<typeof myStats>> | null = null;
    if (joined) {
      mine = await myStats();
      await db
        .from('team_members')
        .update(mine)
        .eq('team_id', team.id)
        .eq('user_id', userId);
    }

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

    // Ranked below the cut: one count says how many members are ahead, which is
    // cheaper and clearer than paging the whole board to find yourself.
    let myRank: number | null = meIndex >= 0 ? meIndex + 1 : null;
    if (joined && meIndex < 0) {
      const { data: me } = await db
        .from('team_members')
        .select('score')
        .eq('team_id', team.id)
        .eq('user_id', userId)
        .maybeSingle();
      const { count: ahead } = await db
        .from('team_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .gt('score', (me?.score as number | null) ?? 0);
      myRank = (ahead ?? 0) + 1;
    }

    return jsonResponse(200, {
      team: toTeam(team, userId, joined),
      rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
      myRank,
      me: mine
        ? {
          score: mine.score,
          learned: mine.learned,
          streak: mine.streak,
          longest: mine.longest,
          rank: myRank,
        }
        : null,
      // Sent with every board so the client's explanation of the score is the
      // formula actually used, not a copy that can fall behind it.
      scoring: SCORING,
    });
  } catch (e) {
    if (e instanceof BadRequest) return jsonResponse(400, { error: e.message });
    console.error('[teams]', e);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
});
