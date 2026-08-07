// Client for the `teams` edge function — the only way in to teams and their
// leaderboards. Everything about who may see or join a team is decided there;
// this file just carries the call.
//
// Unlike pickApi there is no local fallback: a board is other people's data,
// so offline there is simply nothing to show.

import { ApiError, request } from './api';

const TIMEOUT_MS = 8000;

export interface Team {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isOwner: boolean;
  /** Whether the signed-in user shares their progress with this team. */
  joined: boolean;
  memberCount: number;
  /** Owners only — the server withholds it from everyone else. */
  inviteCode: string | null;
}

export interface BoardRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  /** The ranking metric: a rolling-window score (see `Scoring`). */
  score: number;
  /** Lifetime words known or mastered. Shown, not ranked on. */
  learned: number;
  streak: number;
  longest: number;
  rank: number;
}

/**
 * How the score is worked out, as used by the server on this very response.
 * The UI explains the score from these numbers rather than hardcoding its own,
 * so the explanation can't drift from the formula.
 */
export interface Scoring {
  windowDays: number;
  points: {
    /** Per word answered correctly, once per word per day. */
    correctDay: number;
    /** Per word that reached Mastered inside the window. */
    mastered: number;
    /** Per day of the current streak. */
    streakDay: number;
  };
}

/**
 * The caller's own line on the board, sent whether or not they made the cut.
 * Optional because a deployment of the function from before it existed simply
 * omits it — read it through `boardMe()`, which falls back to the rows.
 */
export interface BoardMe {
  score: number;
  learned: number;
  streak: number;
  longest: number;
  rank: number | null;
}

export interface Board {
  team: Team;
  rows: BoardRow[];
  /** The caller's place, even when it falls below the returned rows. */
  myRank: number | null;
  /** Null when the caller hasn't joined this team. */
  me?: BoardMe | null;
  scoring: Scoring;
}

/**
 * The caller's own standing, from the board's `me` when the server sent one and
 * otherwise from their row among the top places.
 */
export function boardMe(board: Board, userId: string): BoardMe | null {
  if (board.me) return board.me;
  const row = board.rows.find((r) => r.user_id === userId);
  if (!row) return null;
  return {
    score: row.score,
    learned: row.learned,
    streak: row.streak,
    longest: row.longest,
    rank: row.rank,
  };
}

/** What an invite code opens, shown before anyone agrees to share with it. */
export interface TeamPreview {
  name: string;
  description: string | null;
  memberCount: number;
  /** Already a member — the dialog says so instead of offering to join again. */
  joined: boolean;
  full: boolean;
}

/** Thrown with the server's message so the UI can show why something failed. */
export class TeamsError extends Error {}

/** The server's own message, in the type the UI already catches. */
async function call<T>(
  send: () => Promise<T>,
): Promise<T> {
  try {
    return await send();
  } catch (err) {
    throw new TeamsError(err instanceof ApiError ? err.message : 'Something went wrong.');
  }
}

/** Teams the user can see, each with their own membership state. */
export async function fetchTeams(): Promise<Team[]> {
  const { teams } = await call(() => request.get<{ teams: Team[] }>('/teams', { timeout: TIMEOUT_MS }));
  return teams ?? [];
}

/** One team's standings. `teamId` omitted means the built-in Global team. */
export function fetchBoard(teamId?: string | null): Promise<Board> {
  return call(() =>
    request.get<Board>('/teams/board', { params: { team: teamId ?? undefined }, timeout: TIMEOUT_MS }));
}

/** Start sharing progress with a team. Returns the team with `joined` updated. */
export async function joinTeam(teamId?: string | null): Promise<Team> {
  const { team } = await call(() =>
    request.post<{ team: Team }>('/teams/join', { team: teamId ?? null }, { timeout: TIMEOUT_MS }));
  return team;
}

/** Stop sharing — the membership, and everything it held, is deleted. */
export async function leaveTeam(teamId?: string | null): Promise<Team> {
  const { team } = await call(() =>
    request.post<{ team: Team }>('/teams/leave', { team: teamId ?? null }, { timeout: TIMEOUT_MS }));
  return team;
}

/**
 * Create a team you own and are the first member of. Pro only — the server
 * decides that, so a non-Pro caller gets a 403 with the reason whatever the UI
 * happens to be showing. Invite-only unless `isPublic`.
 */
export async function createTeam(input: {
  name: string;
  description?: string;
  isPublic?: boolean;
}): Promise<Team> {
  const { team } = await call(() =>
    request.post<{ team: Team }>('/teams', { ...input }, { timeout: TIMEOUT_MS }));
  return team;
}

/** New invite code for a team you own. Every link handed out before stops working. */
export async function rotateInvite(teamId: string): Promise<Team> {
  const { team } = await call(() =>
    request.post<{ team: Team }>('/teams/rotate-invite', { team: teamId }, { timeout: TIMEOUT_MS }));
  return team;
}

/** Which team a code belongs to, without joining it. */
export async function previewCode(code: string): Promise<TeamPreview> {
  const { preview } = await call(() =>
    request.get<{ preview: TeamPreview }>('/teams/preview', { params: { code }, timeout: TIMEOUT_MS }));
  return preview;
}

/** Join with an invite code — the only way into a private team. */
export async function joinByCode(code: string): Promise<Team> {
  const { team } = await call(() =>
    request.post<{ team: Team }>('/teams/join-by-code', { code }, { timeout: TIMEOUT_MS }));
  return team;
}

/**
 * The link an owner shares. Matches the router basename, as collectionShareUrl
 * does, and lands on the dashboard where the board lives.
 */
export function teamInviteUrl(code: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  return `${window.location.origin}${base}/dashboard?team=${code}`;
}
