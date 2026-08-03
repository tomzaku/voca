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
import {
  fetchBoard,
  fetchTeams,
  joinTeam,
  leaveTeam,
  TeamsError,
  type Board,
  type BoardRow,
  type Scoring,
  type Team,
} from '../lib/teamsApi';

export type { BoardRow, Scoring, Team };

interface TeamsState {
  teams: Team[];
  /** Whose board is on screen. Null until the team list arrives. */
  activeTeamId: string | null;
  rows: BoardRow[];
  /** The caller's place, even when it falls below the rows shown. */
  myRank: number | null;
  /** How the score is worked out — the server's own numbers, for the tooltip. */
  scoring: Scoring | null;
  loading: boolean;
  /** Set while join/leave is in flight, so the button can't be double-fired. */
  saving: boolean;
  error: string | null;
  /** Load the team list and the active team's board. */
  load: () => Promise<void>;
  selectTeam: (teamId: string) => Promise<void>;
  refreshBoard: (teamId?: string | null) => Promise<void>;
  /** Join (true) or leave (false) a team. */
  setJoined: (teamId: string, value: boolean) => Promise<void>;
  reset: () => void;
}

function message(e: unknown): string {
  return e instanceof TeamsError ? e.message : 'Something went wrong.';
}

export const useTeams = create<TeamsState>()((set, get) => ({
  teams: [],
  activeTeamId: null,
  rows: [],
  myRank: null,
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

  selectTeam: async (teamId) => {
    if (get().activeTeamId === teamId) return;
    // Clear the rows first: leaving the old team's board up under the new
    // team's name would misread as that team's standings.
    set({ activeTeamId: teamId, rows: [], myRank: null });
    await get().refreshBoard(teamId);
  },

  refreshBoard: async (teamId) => {
    set({ loading: true, error: null });
    try {
      const board: Board = await fetchBoard(teamId ?? get().activeTeamId);
      set({
        rows: board.rows,
        myRank: board.myRank,
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

  reset: () =>
    set({
      teams: [],
      activeTeamId: null,
      rows: [],
      myRank: null,
      scoring: null,
      loading: false,
      saving: false,
      error: null,
    }),
}));
