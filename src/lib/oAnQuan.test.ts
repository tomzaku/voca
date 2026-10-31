import { describe, expect, it } from 'vitest';
import { QUAN_VALUE, canPlay, initialOan, oanResult, playOan, type OanState } from './oAnQuan';

const total = (s: OanState) => s.cells.reduce((a, b) => a + b, 0) + s.score[0] + s.score[1] + (s.quan[0] ? QUAN_VALUE : 0) + (s.quan[1] ? QUAN_VALUE : 0);
const board = (cells: number[], over: Partial<OanState> = {}): OanState => ({ ...initialOan(), cells, ...over });

describe('playOan', () => {
  it('only lets you sow from a filled square in your own row', () => {
    const s = initialOan();
    expect(canPlay(s, 3)).toBe(true);
    expect(canPlay(s, 8)).toBe(false);
    expect(playOan(s, 8, 1).steps).toEqual([]);
  });

  it('sows one stone a square, and keeps every stone and mandarin', () => {
    const { state, steps } = playOan(initialOan(), 1, 1);
    expect(steps.length).toBeGreaterThan(5);
    expect(total(state)).toBe(total(initialOan()));
    expect(state.turn).toBe(1);
  });

  it('captures over an empty square, and again while the pattern holds', () => {
    //               q  1  2  3  4  5  q  7  8  9 10 11
    const s = board([0, 1, 0, 0, 3, 0, 2, 1, 1, 1, 1, 1], { quan: [true, false] });
    // 1 → 2; 3 is empty, 4 has 3 → taken; 5 is empty, 6 has 2 → taken; 7 is filled → stop.
    const { state } = playOan(s, 1, 1);
    expect(state.score[0]).toBe(5);
    expect(state.cells[4]).toBe(0);
    expect(state.cells[6]).toBe(0);
    expect(state.cells[7]).toBe(1);
    // …and with 7 empty too, it carries on and takes 8.
    expect(playOan(board([0, 1, 0, 0, 3, 0, 2, 0, 1, 1, 1, 1], { quan: [true, false] }), 1, 1).state.score[0]).toBe(6);
  });

  it('stops at a mandarin square that is not empty', () => {
    const s = board([0, 0, 0, 0, 0, 1, 0, 2, 2, 2, 2, 2]);
    const { state } = playOan(s, 5, 1);           // 5 → 6 (the mandarin's square); next is 7, filled → pick up and go on
    expect(total(state)).toBe(total(s));
    const t = board([0, 0, 0, 0, 1, 0, 0, 2, 2, 2, 2, 2]);
    const r = playOan(t, 4, 1).state;             // 4 → 5; next is 6, the mandarin → stop
    expect(r.cells[5]).toBe(1);
    expect(r.score[0]).toBe(0);
  });

  it('cannot take a young mandarin (fewer than five stones), but takes a ripe one with its stones', () => {
    //                   q  1  2  3  4  5  q  7  8  9 10 11
    const young = board([2, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0], { turn: 1 });
    expect(playOan(young, 9, 1).state.quan[0]).toBe(true);     // 9 → 10; 11 empty; the mandarin has 2 → no
    const ripe = board([6, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0], { turn: 1 });
    const { state } = playOan(ripe, 9, 1);                       // the mandarin has 6 → taken
    expect(state.quan[0]).toBe(false);
    expect(state.score[1]).toBe(6 + QUAN_VALUE);
  });

  it('re-seeds an empty row from winnings, or ends the game', () => {
    const s = board([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { quan: [true, true], score: [0, 7] });
    const { state } = playOan(s, 1, 1);
    expect(state.turn).toBe(1);
    expect([7, 8, 9, 10, 11].map((i) => state.cells[i])).toEqual([1, 1, 1, 1, 1]);
    expect(state.score[1]).toBe(2);
    const broke = board([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { score: [0, 3] });
    expect(playOan(broke, 1, 1).state.over).toBe(true);
  });

  it('ends when both mandarins are gone, the rows going to their owners', () => {
    const s = board([0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0], { quan: [false, false], score: [20, 20] });
    const { state } = playOan(s, 3, 1);
    expect(state.over).toBe(true);
    expect(state.score[0] + state.score[1]).toBe(43);
    expect(oanResult(state, 0)).toBe(state.score[0] > state.score[1] ? 'won' : state.score[0] < state.score[1] ? 'lost' : 'draw');
  });
});
