// Teams endpoint — the one door to the `teams` and `team_members` tables,
// which carry no row-level policies of their own (see the migration). Every
// rule about who may see or join a team is stated here, in one file, as code.
//
//   POST { action, params }
//
//   list           → 200 { teams: Team[] }        teams you can see, with your membership
//   board  { team } → 200 { team, rows, myRank }  one team's standings
//   join   { team } → 200 { team }                share your progress with it
//   leave  { team } → 200 { team }                stop sharing; the row is deleted
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

import { BadRequest, corsHeaders, jsonResponse, oneOf, requireUser, serviceClient } from '../_shared/ai.ts';

/** How many places a board returns before it cuts to the caller's own row. */
const BOARD_LIMIT = 20;

const ACTIONS = ['list', 'board', 'join', 'leave'] as const;

interface TeamRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  is_public: boolean;
  member_count: number;
}

interface MemberRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  learned: number;
  streak: number;
  longest: number;
}

/** A team as the client sees it: the row plus this caller's relationship to it. */
function toTeam(t: TeamRow, userId: string, joined: boolean) {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    isPublic: t.is_public,
    isOwner: t.owner_id === userId,
    joined,
    memberCount: t.member_count,
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
      const [{ count }, { data: settings }] = await Promise.all([
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
      ]);
      return {
        learned: count ?? 0,
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

    const team = await loadTeam(teamParam(params));
    if (!team) return jsonResponse(404, { error: 'That team no longer exists.' });

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
    if (joined) {
      await db
        .from('team_members')
        .update(await myStats())
        .eq('team_id', team.id)
        .eq('user_id', userId);
    }

    const { data: top } = await db
      .from('team_members')
      .select('user_id, display_name, avatar_url, learned, streak, longest')
      .eq('team_id', team.id)
      .order('learned', { ascending: false })
      .order('longest', { ascending: false })
      .order('streak', { ascending: false })
      .limit(BOARD_LIMIT);

    const rows = (top ?? []) as MemberRow[];
    const meIndex = rows.findIndex((r) => r.user_id === userId);

    // Ranked below the cut: one count says how many members are ahead, which is
    // cheaper and clearer than paging the whole board to find yourself.
    let myRank: number | null = meIndex >= 0 ? meIndex + 1 : null;
    if (joined && meIndex < 0) {
      const { data: me } = await db
        .from('team_members')
        .select('learned')
        .eq('team_id', team.id)
        .eq('user_id', userId)
        .maybeSingle();
      const { count: ahead } = await db
        .from('team_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .gt('learned', (me?.learned as number | null) ?? 0);
      myRank = (ahead ?? 0) + 1;
    }

    return jsonResponse(200, {
      team: toTeam(team, userId, joined),
      rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
      myRank,
    });
  } catch (e) {
    if (e instanceof BadRequest) return jsonResponse(400, { error: e.message });
    console.error('[teams]', e);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
});
