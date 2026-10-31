import { describe, expect, it } from 'vitest';
import { CARO_BIG, caroLine, caroQuestion, initialCaro, playCaro } from './wordCaro';

const q = (word: string) => ({ word, prompt: `means ${word}`, options: [word, 'other', 'more', 'less'] });
const QS = Array.from({ length: 12 }, (_, i) => q(`w${i}`));
/** Play cells in turn, each answered right (true) or wrong (false). */
function play(moves: [number, boolean][]) {
  let s = initialCaro();
  for (const [cell, right] of moves) s = playCaro(s, { cell, option: right ? QS[s.moves].word : 'other' }, QS[s.moves]).state;
  return s;
}

describe('playCaro', () => {
  it('a right answer takes the square, a wrong one leaves it open; the turn passes either way', () => {
    const s = play([[4, true], [0, false]]);
    expect(s.board[4]).toBe('x');
    expect(s.board[0]).toBeNull();
    expect(s.turn).toBe('x');
    expect(s.moves).toBe(2);
  });

  it('no answer in time counts as wrong', () => {
    const s = playCaro(initialCaro(), { cell: 0, option: null }, QS[0]).state;
    expect(s.board[0]).toBeNull();
  });

  it('three in a row wins, and lights the line', () => {
    const s = play([[0, true], [3, true], [1, true], [4, true], [2, true]]);
    expect(s.winner).toBe('x');
    expect(s.line).toEqual([0, 1, 2]);
  });

  it('ignores a taken square and moves after the end', () => {
    const s = play([[0, true]]);
    expect(playCaro(s, { cell: 0, option: QS[1].word }, QS[1]).state).toBe(s);
    const won = play([[0, true], [3, true], [1, true], [4, true], [2, true]]);
    expect(playCaro(won, { cell: 8, option: QS[5].word }, QS[5]).state).toBe(won);
  });

  it('out of questions: more squares wins', () => {
    const s = play([[0, true], ...Array.from({ length: 11 }, (_, i) => [1 + (i % 8), false] as [number, boolean])]);
    expect(s.winner).toBe('x');
  });
});

describe('caroLine', () => {
  it('finds diagonals both ways', () => {
    expect(caroLine(['o', null, null, null, 'o', null, null, null, 'o'])?.cells).toEqual([0, 4, 8]);
    expect(caroLine([null, null, 'x', null, 'x', null, 'x', null, null])?.cells).toEqual([2, 4, 6]);
    expect(caroLine(['x', 'o', 'x', null, null, null, null, null, null])).toBeNull();
  });
});

describe('the big board', () => {
  it('needs five in a row on 7×7, and asks the questions round again', () => {
    let s = initialCaro(7);
    // ✕ answers right along the top row; ◯ answers wrong below.
    for (let k = 0; k < 9; k++) {
      const cell = k % 2 === 0 ? k / 2 : 14 + k;
      const q = caroQuestion(QS, s.moves)!;
      s = playCaro(s, { cell, option: k % 2 === 0 ? q.word : 'other' }, q, CARO_BIG).state;
    }
    expect(s.winner).toBe('x');
    expect(s.line).toEqual([0, 1, 2, 3, 4]);
    expect(caroQuestion(QS, 13)).toBe(QS[1]);
  });

  it('four in a row is not enough there', () => {
    expect(caroLine(['x', 'x', 'x', 'x', null, null, null, ...Array(42).fill(null)], 7, 5)).toBeNull();
  });
});
