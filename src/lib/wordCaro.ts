// Word Caro's rules, with no UI attached: tic-tac-toe where a square is won
// by answering its word question. On your turn you pick an open square and
// get the next question (a definition, four words); answer right and the
// square is yours, wrong — or too late — and it stays open. The turn passes
// either way. Three in a row wins; a full board, or running out of
// questions, goes to whoever holds more squares.
//
// Both players replay the same moves through these functions, so the board
// can't drift apart: a move is only a square and the word picked.

import type { DuelQuestion } from './wordDuel';

export const CARO_SIZE = 3;
export const CARO_LINE = 3;
export const CARO_SECONDS = 15;
/** Questions the host sends: enough for a board answered badly. */
export const CARO_QUESTIONS = 12;

export type Mark = 'x' | 'o';
export interface CaroMove { cell: number; option: string | null }
export interface CaroState {
  board: (Mark | null)[];
  turn: Mark;
  /** Moves made — and so which question the next square asks. */
  moves: number;
  winner: Mark | 'draw' | null;
  /** The winning line's squares, to light up. */
  line: number[] | null;
}

export function initialCaro(size = CARO_SIZE): CaroState {
  return { board: Array(size * size).fill(null), turn: 'x', moves: 0, winner: null, line: null };
}

/** The first run of `need` same marks in a row, column or diagonal. */
export function caroLine(board: (Mark | null)[], size = CARO_SIZE, need = CARO_LINE): { mark: Mark; cells: number[] } | null {
  const at = (r: number, c: number) => (r >= 0 && c >= 0 && r < size && c < size ? board[r * size + c] : null);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const m = at(r, c);
    if (!m) continue;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells: number[] = [];
      for (let k = 0; k < need && at(r + dr * k, c + dc * k) === m; k++) cells.push((r + dr * k) * size + c + dc * k);
      if (cells.length === need) return { mark: m, cells };
    }
  }
  return null;
}

/** Play a move: `question` is the one this move was asked (questions[moves]).
 *  An impossible move (game over, square taken) leaves the state as it was. */
export function playCaro(state: CaroState, move: CaroMove, question: DuelQuestion | undefined, questions: number, size = CARO_SIZE): { state: CaroState; correct: boolean } {
  if (state.winner || !Number.isInteger(move.cell) || move.cell < 0 || move.cell >= state.board.length || state.board[move.cell]) {
    return { state, correct: false };
  }
  const correct = !!question && move.option === question.word;
  const board = state.board.slice();
  if (correct) board[move.cell] = state.turn;
  const moves = state.moves + 1;
  const won = caroLine(board, size);
  let winner: CaroState['winner'] = won?.mark ?? null;
  if (!winner && (board.every((c) => c) || moves >= questions)) {
    const x = board.filter((c) => c === 'x').length, o = board.filter((c) => c === 'o').length;
    winner = x > o ? 'x' : o > x ? 'o' : 'draw';
  }
  return { state: { board, turn: state.turn === 'x' ? 'o' : 'x', moves, winner, line: won?.cells ?? null }, correct };
}
