// Teams the user can study alongside, and the board for the one on screen.
//
// The team is the entity; the leaderboard is a view of it. "Global" is simply
// the built-in team (the one with no owner) that everyone can join, and today
// it's the only one — user-created teams need no change here, since the list
// comes from the server.
//
// Every call goes through lib/teamsApi (the `teams` edge function). This store
// holds no rules about who may join what: it renders what the server says and
// shows the server's message when it says no.

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { progressSynced } from './useVocabulary';
import {
  boardMe,
  createTeam,
  fetchBoard,
  fetchTeams,
  joinByCode,
  joinTeam,
  leaveTeam,
  rotateInvite,
  TeamsError,
  type Board,
  type BoardMe,
  type BoardRow,
  type Scoring,
  type Team,
} from '../lib/teamsApi';

export type { BoardMe, BoardRow, Scoring, Team };

interface TeamsState {
  teams: Team[];
  /** Whose board is on screen. Null until the team list arrives. */
  activeTeamId: string | null;
  rows: BoardRow[];
  /** The caller's place, even when it falls below the rows shown. */
  myRank: number | null;
  /** The caller's own standing, or null until a board loads / if not joined. */
  me: BoardMe | null;
  /** Points the last refresh added to the caller's score; 0 if it didn't move. */
  scoreGain: number;
  /** Bumped on every gain, so the UI can re-trigger the animation. */
  gainId: number;
  /** How the score is worked out — the server's own numbers, for the tooltip. */
  scoring: Scoring | null;
  loading: boolean;
  /** Set while join/leave is in flight, so the button can't be double-fired. */
  saving: boolean;
  error: string | null;
  /** Load the team list and the active team's board. */
  load: () => Promise<void>;
  /** Load once — for views that want a board but shouldn't re-fetch on mount. */
  ensureLoaded: () => Promise<void>;
  selectTeam: (teamId: string) => Promise<void>;
  refreshBoard: (teamId?: string | null) => Promise<void>;
  /**
   * Re-read the board after the learner answers a word correctly, so the score
   * (and the place it earns) catches up with what they just did.
   */
  recordAnswer: () => Promise<void>;
  /** Join (true) or leave (false) a team. */
  setJoined: (teamId: string, value: boolean) => Promise<void>;
  /** Create a team (Pro only, enforced server-side) and switch to its board. */
  create: (input: { name: string; description?: string; isPublic?: boolean }) => Promise<boolean>;
  /** Join with an invite code and switch to that team's board. */
  joinWithCode: (code: string) => Promise<boolean>;
  /** New invite code for a team you own; the old links stop working. */
  rotateCode: (teamId: string) => Promise<void>;
  reset: () => void;
}

function message(e: unknown): string {
  return e instanceof TeamsError ? e.message : 'Something went wrong.';
}

/**
 * Who's asking — needed only to pick the caller's own row out of a board sent
 * by a server old enough not to name it (see `boardMe`). Read from the cached
 * session, the same one every teams call already goes through.
 */
async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

export const useTeams = create<TeamsState>()((set, get) => ({
  teams: [],
  activeTeamId: null,
  rows: [],
  myRank: null,
  me: null,
  scoreGain: 0,
  gainId: 0,
  scoring: null,
  loading: false,
  saving: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const teams = await fetchTeams();
      // Built-ins sort first server-side, so this lands on Global unless a team
      // is already selected (a reload shouldn't move the user off their pick).
      const active = get().activeTeamId ?? teams[0]?.id ?? null;
      set({ teams, activeTeamId: active });
      await get().refreshBoard(active);
    } catch (e) {
      set({ loading: false, error: message(e) });
    }
  },

  ensureLoaded: async () => {
    // A board already on screen is fresh enough to show; the moments that make
    // it stale (answering a word, joining, switching team) each refresh it.
    if (get().activeTeamId || get().loading) return;
    await get().load();
  },

  selectTeam: async (teamId) => {
    if (get().activeTeamId === teamId) return;
    // Clear the rows first: leaving the old team's board up under the new
    // team's name would misread as that team's standings. `me` goes too — a
    // score carried over from the last team would read as a gain on this one.
    set({ activeTeamId: teamId, rows: [], myRank: null, me: null, scoreGain: 0 });
    await get().refreshBoard(teamId);
  },

  refreshBoard: async (teamId) => {
    set({ loading: true, error: null });
    try {
      const board: Board = await fetchBoard(teamId ?? get().activeTeamId);
      const uid = await currentUserId();
      const me = uid ? boardMe(board, uid) : null;
      // A rise in the caller's own score is the one change worth announcing —
      // measured against what was last on screen, so the very first board
      // (nothing to compare with) never animates.
      const before = get().me?.score ?? null;
      const gained = before !== null && me !== null && me.score > before ? me.score - before : 0;
      set({
        rows: board.rows,
        myRank: board.myRank,
        me,
        scoreGain: gained,
        gainId: gained > 0 ? get().gainId + 1 : get().gainId,
        scoring: board.scoring,
        // The board carries the team back with a fresh member count and
        // membership state, so the list can't drift from what's on screen.
        teams: get().teams.map((t) => (t.id === board.team.id ? board.team : t)),
        activeTeamId: board.team.id,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: message(e) });
    }
  },

  recordAnswer: async () => {
    // Nothing loaded yet means nothing on screen to update; whatever loads the
    // board next will read the new score anyway.
    if (!get().activeTeamId) return;
    // The score is worked out on the server from the caller's own progress, so
    // the answer has to have landed there first — otherwise the refresh reports
    // the score from before it.
    await progressSynced();
    await get().refreshBoard();
  },

  setJoined: async (teamId, value) => {
    if (get().saving) return;
    set({ saving: true, error: null });
    try {
      const team = value ? await joinTeam(teamId) : await leaveTeam(teamId);
      set({
        saving: false,
        teams: get().teams.map((t) => (t.id === team.id ? team : t)),
      });
      // Joining puts the user on the board (and leaving takes them off), so the
      // list on screen is stale the moment this succeeds.
      if (get().activeTeamId === teamId) await get().refreshBoard(teamId);
    } catch (e) {
      set({ saving: false, error: message(e) });
    }
  },

  /**
   * Both of these end with the new team on screen: creating or joining one and
   * then having to find it in a list would be a strange place to stop.
   * Returns whether it worked, so the form knows whether to close.
   */
  create: async (input) => {
    if (get().saving) return false;
    set({ saving: true, error: null });
    try {
      const team = await createTeam(input);
      set({ saving: false, teams: [...get().teams, team] });
      await get().selectTeam(team.id);
      return true;
    } catch (e) {
      set({ saving: false, error: message(e) });
      return false;
    }
  },

  joinWithCode: async (code) => {
    if (get().saving) return false;
    set({ saving: true, error: null });
    try {
      const team = await joinByCode(code);
      const known = get().teams.some((t) => t.id === team.id);
      set({
        saving: false,
        teams: known ? get().teams.map((t) => (t.id === team.id ? team : t)) : [...get().teams, team],
      });
      // Re-joining the team already on screen: selectTeam would no-op, so the
      // board has to be refreshed directly to show the new member.
      if (get().activeTeamId === team.id) await get().refreshBoard(team.id);
      else await get().selectTeam(team.id);
      return true;
    } catch (e) {
      set({ saving: false, error: message(e) });
      return false;
    }
  },

  rotateCode: async (teamId) => {
    if (get().saving) return;
    set({ saving: true, error: null });
    try {
      const team = await rotateInvite(teamId);
      set({ saving: false, teams: get().teams.map((t) => (t.id === team.id ? team : t)) });
    } catch (e) {
      set({ saving: false, error: message(e) });
    }
  },

  reset: () =>
    set({
      teams: [],
      activeTeamId: null,
      rows: [],
      myRank: null,
      me: null,
      scoreGain: 0,
      scoring: null,
      loading: false,
      saving: false,
      error: null,
    }),
}));
