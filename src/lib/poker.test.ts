import { describe, expect, it } from 'vitest';
import { BIG_BLIND, SMALL_BLIND, START_STACK, act, bestHand, legal, newGame, viewFor, type PokerState } from './poker';

/** A fixed shuffle, so hands can be set up: deck.pop() deals from the end. */
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const chips = (s: PokerState) => s.stacks[0] + s.stacks[1] + s.bets[0] + s.bets[1] + s.pot;

describe('bestHand', () => {
  const name = (cards: string) => bestHand(cards.split(' ')).name;
  it('names every kind of hand', () => {
    expect(name('Ah Kh Qh Jh Th 2c 3d')).toBe('Royal flush');
    expect(name('9s 8s 7s 6s 5s Ac Ad')).toBe('Straight flush');
    expect(name('7c 7d 7h 7s Kd 2c 3d')).toBe('Four of a kind');
    expect(name('7c 7d 7h Ks Kd 2c 3d')).toBe('Full house');
    expect(name('2h 9h Jh 4h Kh Ac Ad')).toBe('Flush');
    expect(name('Ac 2d 3h 4s 5c Kd Qd')).toBe('Straight');
    expect(name('7c 7d 7h Ks Qd 2c 3d')).toBe('Three of a kind');
    expect(name('7c 7d Kh Ks Qd 2c 3d')).toBe('Two pair');
    expect(name('7c 7d Kh Js Qd 2c 3d')).toBe('Pair');
    expect(name('7c 9d Kh Js Qd 2c 3d')).toBe('High card');
  });
  it('ranks a wheel below a six-high straight, and breaks ties on kickers', () => {
    const wheel = bestHand('Ac 2d 3h 4s 5c'.split(' ')).score, six = bestHand('2d 3h 4s 5c 6d'.split(' ')).score;
    expect(six[1]).toBeGreaterThan(wheel[1]);
    const ak = bestHand('Ah Ad Kc 7s 3d'.split(' ')).score, aq = bestHand('As Ac Qc 7d 3h'.split(' ')).score;
    expect(ak[2]).toBeGreaterThan(aq[2]);
  });
  it('works with six cards (the turn)', () => {
    expect(bestHand('7c 7d 7h Ks Kd 2c'.split(' ')).name).toBe('Full house');
  });
});

describe('a hand', () => {
  it('deals two cards each and posts the blinds, the dealer to act', () => {
    const s = newGame(seeded());
    expect(s.holes[0]).toHaveLength(2);
    expect(s.bets[s.dealer]).toBe(SMALL_BLIND);
    expect(s.bets[s.dealer === 0 ? 1 : 0]).toBe(BIG_BLIND);
    expect(s.toAct).toBe(s.dealer);
    expect(chips(s)).toBe(START_STACK * 2);
  });

  it('a fold gives the pot to the other player', () => {
    const s = newGame(seeded());
    const r = act(s, s.dealer, { type: 'fold' });
    expect(r.result?.winners).toEqual([s.dealer === 0 ? 1 : 0]);
    expect(r.stacks[s.dealer]).toBe(START_STACK - SMALL_BLIND);
    expect(chips(r)).toBe(START_STACK * 2);
  });

  it('the big blind gets its option; then flop, turn, river, showdown', () => {
    let s = newGame(seeded());
    const d = s.dealer, bb = d === 0 ? 1 : 0;
    s = act(s, d, { type: 'call' });
    expect(s.toAct).toBe(bb);
    expect(s.street).toBe('preflop');
    s = act(s, bb, { type: 'check' });
    expect(s.street).toBe('flop');
    expect(s.board).toHaveLength(3);
    expect(s.toAct).toBe(bb);          // out of position acts first after the flop
    for (const street of ['turn', 'river', 'showdown']) {
      s = act(act(s, bb, { type: 'check' }), d, { type: 'check' });
      expect(s.street).toBe(street);
    }
    expect(s.board).toHaveLength(5);
    expect(s.result?.showdown).toBe(true);
    expect(s.result?.names.every((n) => typeof n === 'string')).toBe(true);
    expect(chips(s)).toBe(START_STACK * 2);
  });

  it('refuses moves out of turn and raises below the minimum', () => {
    const s = newGame(seeded());
    const bb = s.dealer === 0 ? 1 : 0;
    expect(act(s, bb, { type: 'check' })).toBe(s);
    expect(act(s, s.dealer, { type: 'check' })).toBe(s);           // there's a blind to call
    expect(act(s, s.dealer, { type: 'raise', to: 30 })).toBe(s);   // min raise is to 40
    expect(act(s, s.dealer, { type: 'raise', to: 40 }).bets[s.dealer]).toBe(40);
  });

  it('a re-raise must be at least the last raise', () => {
    let s = newGame(seeded());
    const d = s.dealer, bb = d === 0 ? 1 : 0;
    s = act(s, d, { type: 'raise', to: 100 });                    // a raise of 80
    expect(legal(s, bb).minTo).toBe(180);
    expect(act(s, bb, { type: 'raise', to: 150 })).toBe(s);
  });

  it('all in and called: the board runs out to a showdown', () => {
    let s = newGame(seeded(7));
    const d = s.dealer, bb = d === 0 ? 1 : 0;
    s = act(s, d, { type: 'raise', to: START_STACK });
    expect(s.last?.action).toBe('allin');
    s = act(s, bb, { type: 'call' });
    expect(s.board).toHaveLength(5);
    expect(s.result?.showdown).toBe(true);
    expect(chips(s)).toBe(START_STACK * 2);
    expect(s.over).toBe(s.stacks.includes(0));
  });

  it('a short all-in call: the part of the bet it can\'t match goes back', () => {
    const base = newGame(seeded(3));
    const d = base.dealer, bb = d === 0 ? 1 : 0;
    // The big blind has only 300 in all (20 of it posted).
    const s0: PokerState = { ...base, stacks: d === 0 ? [base.stacks[0], 280] : [280, base.stacks[1]] };
    let s = act(s0, d, { type: 'raise', to: START_STACK });
    s = act(s, bb, { type: 'call' });
    expect(s.result?.showdown).toBe(true);
    // 300 each went in: the pot was 600, whoever won it.
    const winner = s.result!.winners;
    if (winner.length === 1) expect(s.stacks[winner[0]]).toBe(winner[0] === d ? START_STACK - 300 + 600 : 600);
    expect(s.stacks[0] + s.stacks[1]).toBe(START_STACK + 300);
  });

  it('a view hides the other player\'s cards until a showdown', () => {
    const s = newGame(seeded());
    const v = viewFor(s, 0);
    expect(v.holes[0]).toHaveLength(2);
    expect(v.holes[1]).toEqual([]);
    expect('deck' in v).toBe(false);
  });
});
