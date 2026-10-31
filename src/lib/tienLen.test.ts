import { describe, expect, it } from 'vitest';
import { beats, cardName, classify, dealTl, passTl, playTl, type TlCard, type TlState } from './tienLen';

/** A card from its name: "3s", "Th", "2h". */
const c = (name: string): TlCard => '3456789TJQKA2'.indexOf(name[0]) * 4 + 'scdh'.indexOf(name[1]);
const cs = (names: string) => names.split(' ').map(c);
const combo = (names: string) => classify(cs(names))!;

describe('classify', () => {
  it('knows every combination', () => {
    expect(combo('7d').type).toBe('single');
    expect(combo('7d 7h').type).toBe('pair');
    expect(combo('7d 7h 7s').type).toBe('triple');
    expect(combo('7d 7h 7s 7c').type).toBe('quad');
    expect(combo('9s Td Jc Qh').type).toBe('run');
    expect(combo('3s 3c 4d 4h 5s 5h').type).toBe('pairs');
  });
  it('refuses what is not one', () => {
    expect(classify(cs('7d 8h'))).toBeNull();
    expect(classify(cs('Qs Kd As 2h'))).toBeNull();     // no 2 in a run
    expect(classify(cs('3s 3c 5d 5h 6s 6h'))).toBeNull(); // pairs must follow on
    expect(classify([])).toBeNull();
  });
  it('names cards the way the card face draws them', () => {
    expect(cardName(c('Th'))).toBe('Th');
    expect(cardName(c('2s'))).toBe('2s');
  });
});

describe('beats', () => {
  it('same kind and size, higher at the top — suits break ties', () => {
    expect(beats(combo('8s'), combo('7h'))).toBe(true);
    expect(beats(combo('7h'), combo('7d'))).toBe(true);    // ♥ over ♦
    expect(beats(combo('7c'), combo('7d'))).toBe(false);
    expect(beats(combo('2s'), combo('Ah'))).toBe(true);
    expect(beats(combo('5s 6s 7d'), combo('4h 5h 6h'))).toBe(true);
    expect(beats(combo('5s 6s 7d 8d'), combo('4h 5h 6h'))).toBe(false);
  });
  it('chops a 2, a pair of 2s and the chops themselves', () => {
    const pairs3 = combo('3s 3c 4d 4h 5s 5h'), quad = combo('9s 9c 9d 9h'), pairs4 = combo('3s 3c 4d 4h 5s 5h 6s 6c');
    expect(beats(pairs3, combo('2h'))).toBe(true);
    expect(beats(pairs3, combo('Ah'))).toBe(false);        // only a 2 is chopped
    expect(beats(quad, combo('2s 2h'))).toBe(true);
    expect(beats(pairs3, combo('2s 2h'))).toBe(false);
    expect(beats(quad, pairs3)).toBe(true);
    expect(beats(pairs4, quad)).toBe(true);
    expect(beats(quad, pairs4)).toBe(false);
  });
});

describe('a deal', () => {
  const seeded = (seed = 5) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  it('deals 13 each; the lowest card leads the first deal', () => {
    const s = dealTl(null, seeded());
    expect(s.hands[0]).toHaveLength(13);
    expect(s.hands[1]).toHaveLength(13);
    expect(s.hands[s.turn][0]).toBe(Math.min(s.hands[0][0], s.hands[1][0]));
  });

  it('play, beat, pass: the last to play leads again', () => {
    const base = dealTl(null, seeded());
    const s: TlState = { ...base, hands: [cs('3s 9d Kh'), cs('5c Jd 2h')], turn: 0 };
    let t = playTl(s, 0, cs('3s'));
    expect(t.turn).toBe(1);
    expect(playTl(t, 1, cs('5c 5c'))).toBe(t);              // not in hand twice / not a play
    t = playTl(t, 1, cs('5c'));
    t = passTl(t, 0);
    expect(t.table).toBeNull();
    expect(t.turn).toBe(1);
    expect(passTl(t, 1)).toBe(t);                          // can't pass when leading
  });

  it('emptying your hand wins the deal; three deals win the game', () => {
    const base = dealTl(null, seeded());
    const s: TlState = { ...base, hands: [cs('3s'), cs('5c Jd')], turn: 0, wins: [2, 0] };
    const t = playTl(s, 0, cs('3s'));
    expect(t.dealWinner).toBe(0);
    expect(t.wins).toEqual([3, 0]);
    expect(t.over).toBe(true);
    const next = dealTl({ ...t, over: false, wins: [1, 0] }, seeded(9));
    expect(next.turn).toBe(0);                             // the winner leads
    expect(next.deal).toBe(t.deal + 1);
  });
});
