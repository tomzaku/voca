import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { mySide, outcome, parseMove, parseStart, play, targets } from './chessMatch';

describe('what comes over the wire', () => {
  it('takes a toss and a move, and nothing else', () => {
    expect(parseStart({ hostWhite: true })).toEqual({ hostWhite: true });
    expect(parseStart({ hostWhite: 'yes' })).toBeNull();
    expect(parseMove({ from: 'e2', to: 'e4' })).toEqual({ from: 'e2', to: 'e4' });
    expect(parseMove({ from: 'e7', to: 'e8', promotion: 'n' })).toEqual({ from: 'e7', to: 'e8', promotion: 'n' });
    expect(parseMove({ from: 'e9', to: 'e4' })).toBeNull();
    expect(parseMove({ from: 'e2', to: 'e4', promotion: 'k' })).toBeNull();
  });

  it('gives each player a side from the toss', () => {
    expect(mySide(true, { hostWhite: true })).toBe('w');
    expect(mySide(false, { hostWhite: true })).toBe('b');
    expect(mySide(false, { hostWhite: false })).toBe('w');
  });
});

describe('playing', () => {
  it('plays legal moves and turns away the rest', () => {
    const g = new Chess();
    expect(play(g, { from: 'e2', to: 'e4' })).toBe(true);
    expect(play(g, { from: 'e4', to: 'e5' })).toBe(false);   // black to move
    expect(targets(g, 'g8').sort()).toEqual(['f6', 'h6']);
  });

  it('makes a queen of a pawn at the end', () => {
    const g = new Chess('8/4P3/8/8/8/8/k7/4K3 w - - 0 1');
    expect(play(g, { from: 'e7', to: 'e8' })).toBe(true);
    expect(g.get('e8')).toMatchObject({ type: 'q', color: 'w' });
  });

  it('knows checkmate and stalemate', () => {
    const g = new Chess();
    for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) play(g, { from, to });
    expect(outcome(g)).toEqual({ kind: 'checkmate', winner: 'b' });
    expect(outcome(new Chess('k7/8/1Q6/8/8/8/8/7K b - - 0 1'))).toEqual({ kind: 'draw', why: 'stalemate' });
  });
});
