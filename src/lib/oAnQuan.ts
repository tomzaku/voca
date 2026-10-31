// Ô ăn quan's rules, with no UI attached — the stone game Vietnamese children
// draw on the ground. Ten small squares in two rows of five, one row each,
// and a big half-moon square at either end holding a mandarin (quan, worth
// 10). Every small square starts with five stones (dân, worth 1).
//
// On your turn, take all the stones from one of your squares and sow them
// one by one, either way round. Then look at the next square:
//  · stones in a small square → take them up and keep sowing;
//  · a mandarin's square, not empty → your turn ends;
//  · empty, and the square after it has stones → capture them, and if the
//    square after that is empty with stones beyond, capture again;
//  · empty, and empty again → your turn ends.
// A mandarin can't be taken while its square holds fewer than five stones
// (quan non). If your row is empty when your turn comes, put one stone back
// in each square from what you've won; if you can't, the game ends. It also
// ends when both mandarins and their squares are gone: the stones left on
// each row go to its owner. Most points wins.
//
// The ring of squares, as indexed here: 0 is the left mandarin, 1–5 the
// host's row left to right, 6 the right mandarin, 7–11 the guest's row from
// right to left — so +1 goes one way round and −1 the other.

export const QUAN_VALUE = 10;
export const START_STONES = 5;
/** Stones a mandarin's square needs before it can be taken. */
export const QUAN_RIPE = 5;

export type Side = 0 | 1;
export type Dir = 1 | -1;

export interface OanState {
  /** Stones in each of the 12 squares. */
  cells: number[];
  /** Whether each mandarin is still on the board: [left (0), right (6)]. */
  quan: [boolean, boolean];
  score: [number, number];
  turn: Side;
  over: boolean;
  /** Moves made — a move sent for another turn is ignored. */
  moves: number;
}

export const isQuanSquare = (i: number) => i === 0 || i === 6;
export const rowOf = (side: Side) => (side === 0 ? [1, 2, 3, 4, 5] : [7, 8, 9, 10, 11]);
const wrap = (i: number) => ((i % 12) + 12) % 12;
const hasQuan = (s: OanState, i: number) => (i === 0 ? s.quan[0] : i === 6 ? s.quan[1] : false);
/** Something to capture, or to stop at, in a square. */
const filled = (s: OanState, i: number) => s.cells[i] > 0 || hasQuan(s, i);

export function initialOan(): OanState {
  const cells = Array.from({ length: 12 }, (_, i) => (isQuanSquare(i) ? 0 : START_STONES));
  return { cells, quan: [true, true], score: [0, 0], turn: 0, over: false, moves: 0 };
}

const clone = (s: OanState): OanState => ({ ...s, cells: s.cells.slice(), quan: [...s.quan], score: [...s.score] });

export function canPlay(s: OanState, square: number): boolean {
  return !s.over && rowOf(s.turn).includes(square) && s.cells[square] > 0;
}

/** Both mandarins gone, their squares empty: the rows go to their owners. */
function finish(s: OanState) {
  for (const side of [0, 1] as Side[]) for (const i of rowOf(side)) { s.score[side] += s.cells[i]; s.cells[i] = 0; }
  s.over = true;
}

/** The turn passes: re-seed an empty row, or end the game if it can't be. */
function nextTurn(s: OanState) {
  if (!s.quan[0] && !s.quan[1] && s.cells[0] === 0 && s.cells[6] === 0) { finish(s); return; }
  s.turn = s.turn === 0 ? 1 : 0;
  const row = rowOf(s.turn);
  if (row.every((i) => s.cells[i] === 0)) {
    if (s.score[s.turn] < row.length) { finish(s); return; }
    s.score[s.turn] -= row.length;
    for (const i of row) s.cells[i] = 1;
  }
}

/**
 * Play a move: sow from `square` going `dir`. Returns the state after, and
 * the states along the way (each stone dropped, each capture) to animate.
 * An impossible move leaves the state as it was, with no steps.
 */
export function playOan(state: OanState, square: number, dir: Dir): { state: OanState; steps: OanState[] } {
  if (!canPlay(state, square) || (dir !== 1 && dir !== -1)) return { state, steps: [] };
  const s = clone(state);
  const steps: OanState[] = [];
  const snap = () => { if (steps.length < 400) steps.push(clone(s)); };
  let pos = square;
  let hand = s.cells[pos];
  s.cells[pos] = 0;
  snap();
  // A guard against a sowing that never settles.
  for (let rounds = 0; rounds < 60; rounds++) {
    while (hand > 0) { pos = wrap(pos + dir); s.cells[pos] += 1; hand -= 1; snap(); }
    const next = wrap(pos + dir);
    if (isQuanSquare(next) && filled(s, next)) break;            // a mandarin's square: stop
    if (s.cells[next] > 0) { pos = next; hand = s.cells[pos]; s.cells[pos] = 0; snap(); continue; }
    // Empty: capture what lies beyond, and again while the pattern holds.
    let gap = next;
    for (;;) {
      const target = wrap(gap + dir);
      if (!filled(s, target)) break;
      if (hasQuan(s, target) && s.cells[target] < QUAN_RIPE) break; // quan non
      s.score[s.turn] += s.cells[target] + (hasQuan(s, target) ? QUAN_VALUE : 0);
      s.cells[target] = 0;
      if (target === 0) s.quan[0] = false;
      if (target === 6) s.quan[1] = false;
      snap();
      gap = wrap(target + dir);
      if (filled(s, gap)) break;
    }
    break;
  }
  s.moves += 1;
  nextTurn(s);
  snap();
  return { state: s, steps };
}

export function oanResult(s: OanState, me: Side): 'won' | 'lost' | 'draw' {
  const them = me === 0 ? 1 : 0;
  return s.score[me] > s.score[them] ? 'won' : s.score[me] < s.score[them] ? 'lost' : 'draw';
}
