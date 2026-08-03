// Client for the `teams` edge function — the only way in to teams and their
// leaderboards. Everything about who may see or join a team is decided there;
// this file just carries the call.
//
// Unlike pickApi there is no local fallback: a board is other people's data,
// so offline there is simply nothing to show.

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
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

export interface Board {
  team: Team;
  rows: BoardRow[];
  /** The caller's place, even when it falls below the returned rows. */
  myRank: number | null;
  scoring: Scoring;
}

type Action = 'list' | 'board' | 'join' | 'leave';

/** Thrown with the server's message so the UI can show why something failed. */
export class TeamsError extends Error {}

async function call<T>(action: Action, params: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new TeamsError('Teams need an account.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new TeamsError('Please sign in.');

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, params }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new TeamsError("Couldn't reach the server.");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new TeamsError(body?.error || 'Something went wrong.');
  return body as T;
}

/** Teams the user can see, each with their own membership state. */
export async function fetchTeams(): Promise<Team[]> {
  const { teams } = await call<{ teams: Team[] }>('list');
  return teams ?? [];
}

/** One team's standings. `teamId` omitted means the built-in Global team. */
export function fetchBoard(teamId?: string | null): Promise<Board> {
  return call<Board>('board', { team: teamId ?? null });
}

/** Start sharing progress with a team. Returns the team with `joined` updated. */
export async function joinTeam(teamId?: string | null): Promise<Team> {
  const { team } = await call<{ team: Team }>('join', { team: teamId ?? null });
  return team;
}

/** Stop sharing — the membership, and everything it held, is deleted. */
export async function leaveTeam(teamId?: string | null): Promise<Team> {
  const { team } = await call<{ team: Team }>('leave', { team: teamId ?? null });
  return team;
}
