// Client for the `hunts` edge function — a teacher's treasure hunt, and the
// students racing it. Routes only; the rules live server-side in
// supabase/functions/_shared/hunts.ts.
//
// The student routes pass `allowAnon`: a class opening a link on their phones
// won't have accounts. A student is known by the token `join` hands back,
// kept on this device (huntSession below) — never by an id they send.
//
// Nothing here is quiet. A hunt is other people's live race, so there is no
// local copy to fall back on: a failure is shown, and the next poll retries.

import { request } from './api';
import type { DraftStation } from './hunt';

export type HuntMode = 'qr' | 'world';
export type HuntStatus = 'lobby' | 'live' | 'ended';
export type Phase = 'find' | 'solve' | 'final' | 'done';

export interface HuntSummary {
  id: string;
  code: string;
  title: string;
  mode: HuntMode;
  status: HuntStatus;
  stations: number;
  teamNames: [string, string];
  durationMin: number;
  need: number;
  startedAt: string | null;
  endsAt: string | null;
  createdAt: string;
  playerCount: number | null;
}

/** A team's place in the race — the same numbers on both screens. */
export interface TeamProgress {
  phase: Phase;
  /** Stations completed. */
  position: number;
  station: number | null;
  need: number;
  solved: number;
  /** Letters collected (a count; the student's own team gets the letters). */
  letters: number;
  finishedAt: string | null;
}

export interface Outcome {
  over: boolean;
  winner: 0 | 1 | null;
}

export interface Board {
  hunt: HuntSummary & { treasure: string };
  stations: { index: number; card: string; place: string | null; clue: string; letter: string }[];
  teams: (TeamProgress & {
    team: 0 | 1;
    name: string;
    players: { id: string; name: string }[];
    order: number[];
  })[];
  feed: { at: string; team: 0 | 1; kind: 'found' | 'solve' | 'miss' | 'finish'; station: number; player: string | null }[];
  outcome: Outcome;
}

export interface PublicQuestion {
  type: 'definition' | 'sentence' | 'listen' | 'unscramble' | 'spell' | 'image' | 'match' | 'custom';
  prompt: string;
  /** Choices to tap — or, for `match`, the bank of words to place. */
  options: string[] | null;
  /** `image`: the key to fetch its picture with (fetchHuntImage). */
  image: string | null;
  /** `match`: the meanings, each to be given a word from `options`. */
  slotPrompts: string[] | null;
  say: string | null;
  scrambled: string | null;
  length: number | null;
}

export interface Play {
  hunt: {
    id: string;
    code: string;
    title: string;
    mode: HuntMode;
    status: HuntStatus;
    stations: number;
    teamNames: [string, string];
    endsAt: string | null;
  };
  me: { id: string; name: string; team: 0 | 1 };
  teammates: string[];
  team: Omit<TeamProgress, 'letters'> & {
    iSolved: boolean;
    clue: string | null;
    place: string | null;
    /** Collected letters, alphabetical — the anagram to solve at the final. */
    letters: string[];
    treasureLength: number;
    question: PublicQuestion | null;
    cooldownUntil: string | null;
  };
  rival: TeamProgress & { name: string };
  outcome: Outcome;
  /** For the countdown: the device's clock may be off from the server's. */
  serverTime: string;
}

export interface Preview {
  title: string;
  mode: HuntMode;
  status: HuntStatus;
  teamNames: [string, string];
  playerCount: number;
}

export interface NewHunt {
  title: string;
  mode: HuntMode;
  treasure: string;
  stations: DraftStation[];
  /** Picture questions' pictures, by key (data: URIs). */
  images: Record<string, string>;
  need: number;
  durationMin: number;
  teamNames: [string, string];
}

// ── Teacher ──

export async function listHunts(): Promise<HuntSummary[]> {
  return (await request.get<{ hunts: HuntSummary[] }>('/hunts')).hunts;
}

export async function createHunt(h: NewHunt): Promise<HuntSummary> {
  return (await request.post<{ hunt: HuntSummary }>('/hunts', h, { timeout: 15000 })).hunt;
}

export async function deleteHunt(id: string): Promise<void> {
  await request.delete('/hunts', { params: { id } });
}

export async function fetchBoard(id: string, signal?: AbortSignal): Promise<Board> {
  return (await request.get<{ board: Board }>('/hunts/board', { params: { id }, signal })).board;
}

export async function startHunt(id: string): Promise<Board> {
  return (await request.post<{ board: Board }>('/hunts/start', { id })).board;
}

export async function endHunt(id: string): Promise<Board> {
  return (await request.post<{ board: Board }>('/hunts/end', { id })).board;
}

export async function movePlayer(id: string, player: string, team: 0 | 1): Promise<Board> {
  return (await request.post<{ board: Board }>('/hunts/move', { id, player, team })).board;
}

// ── Student ──

export async function previewHunt(code: string): Promise<Preview> {
  return (await request.get<{ preview: Preview }>('/hunts/preview', { params: { code }, allowAnon: true })).preview;
}

export async function joinHunt(code: string, name: string): Promise<{ token: string; play: Play }> {
  return request.post<{ token: string; play: Play }>('/hunts/join', { code, name }, { allowAnon: true });
}

export async function fetchPlay(token: string, signal?: AbortSignal): Promise<Play> {
  return (await request.get<{ play: Play }>('/hunts/play', { params: { token }, allowAnon: true, signal })).play;
}

export type FoundResult = 'found' | 'already' | 'notYet' | 'unknown';

export async function reportFound(token: string, card: string): Promise<{ result: FoundResult; play: Play }> {
  return request.post<{ result: FoundResult; play: Play }>('/hunts/found', { token, card }, { allowAnon: true });
}

/** A word or phrase — or, for a matching question, one word per meaning, in order. */
export async function submitAnswer(token: string, answer: string | string[]): Promise<{ correct: boolean; play: Play }> {
  return request.post<{ correct: boolean; play: Play }>('/hunts/answer', { token, answer }, { allowAnon: true });
}

/** A picture question's picture, as a data: URI. */
export async function fetchHuntImage(token: string, key: string): Promise<string> {
  return (await request.get<{ image: string }>('/hunts/image', { params: { token, key }, allowAnon: true, timeout: 15000 })).image;
}

// ── This device's place in a hunt ──

const KEY = (code: string) => `voca-hunt:${code.toUpperCase()}`;
const LAST = 'voca-hunt:last';

/** The token this device joined `code` with, if it has. */
export function huntToken(code: string): string | null {
  try {
    return localStorage.getItem(KEY(code));
  } catch {
    return null;
  }
}

export function saveHuntToken(code: string, token: string) {
  try {
    localStorage.setItem(KEY(code), token);
    localStorage.setItem(LAST, code.toUpperCase());
  } catch { /* private mode: the student stays joined for this page only */ }
}

export function forgetHunt(code: string) {
  try {
    localStorage.removeItem(KEY(code));
    if (localStorage.getItem(LAST) === code.toUpperCase()) localStorage.removeItem(LAST);
  } catch { /* nothing stored */ }
}

/** The student link for a hunt, optionally straight to a card (the QR's target). */
export function huntLink(code: string, card?: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${window.location.origin}${base}/hunt/${code}${card ? `?card=${card}` : ''}`;
}
