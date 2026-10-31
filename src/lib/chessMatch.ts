// Chess between two players in the world: the rules are chess.js's; this is
// what goes over the wire and what comes back checked. The host (who asked)
// tosses for colours and sends the toss; each move goes as from, to and —
// for a pawn reaching the end — what it becomes. A move from the other side
// is only played if it's legal on the board here.

import { Chess, type Square } from 'chess.js';

export type Side = 'w' | 'b';

export interface ChessStart { hostWhite: boolean }
export interface ChessMove { from: string; to: string; promotion?: string }

const SQUARE = /^[a-h][1-8]$/;

/** The toss as the host sent it, or null. */
export function parseStart(raw: unknown): ChessStart | null {
  const o = raw as Record<string, unknown> | null;
  return o && typeof o.hostWhite === 'boolean' ? { hostWhite: o.hostWhite } : null;
}

/** A move as the other side sent it, or null if it isn't one. */
export function parseMove(raw: unknown): ChessMove | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o.from !== 'string' || typeof o.to !== 'string' || !SQUARE.test(o.from) || !SQUARE.test(o.to)) return null;
  if (o.promotion !== undefined && !(typeof o.promotion === 'string' && /^[qrbn]$/.test(o.promotion))) return null;
  return { from: o.from, to: o.to, ...(o.promotion ? { promotion: o.promotion as string } : {}) };
}

/** Which side I play. */
export const mySide = (host: boolean, start: ChessStart): Side => (host === start.hostWhite ? 'w' : 'b');

/** Play a move if it's legal; false (and the board untouched) if not. A pawn
 *  reaching the end becomes a queen unless told otherwise. */
export function play(game: Chess, move: ChessMove): boolean {
  try {
    const piece = game.get(move.from as Square);
    const lastRank = move.to[1] === '8' || move.to[1] === '1';
    game.move({ from: move.from, to: move.to, promotion: move.promotion ?? (piece?.type === 'p' && lastRank ? 'q' : undefined) });
    return true;
  } catch {
    return false;
  }
}

/** Where the piece on `square` may go. */
export const targets = (game: Chess, square: string): string[] =>
  game.moves({ square: square as Square, verbose: true }).map((m) => m.to);

export type Outcome = { kind: 'playing' } | { kind: 'checkmate'; winner: Side } | { kind: 'draw'; why: 'stalemate' | 'repetition' | 'material' | 'fifty' };

export function outcome(game: Chess): Outcome {
  if (game.isCheckmate()) return { kind: 'checkmate', winner: game.turn() === 'w' ? 'b' : 'w' };
  if (game.isStalemate()) return { kind: 'draw', why: 'stalemate' };
  if (game.isThreefoldRepetition()) return { kind: 'draw', why: 'repetition' };
  if (game.isInsufficientMaterial()) return { kind: 'draw', why: 'material' };
  if (game.isDraw()) return { kind: 'draw', why: 'fifty' };
  return { kind: 'playing' };
}
