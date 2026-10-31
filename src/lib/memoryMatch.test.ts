import { describe, expect, it } from 'vitest';
import { flip, initialMemory, layMemory, parseLayout, type MemoryCard } from './memoryMatch';

// An unshuffled layout: word 0, meaning 0, word 1, meaning 1, …
const cards: MemoryCard[] = [0, 1, 2, 3].flatMap((pair) => [
  { pair, kind: 'word' as const, text: `w${pair}` },
  { pair, kind: 'meaning' as const, text: `m${pair}` },
]);

describe('flip', () => {
  it('a word and its meaning are a pair: yours, and you go again', () => {
    let s = flip(initialMemory(cards), 0, 0);
    expect(s.open).toBe(0);
    s = flip(s, 0, 1);
    expect(s.owner[0]).toBe(0);
    expect(s.owner[1]).toBe(0);
    expect(s.pairs).toEqual([1, 0]);
    expect(s.turn).toBe(0);
  });

  it('a miss is shown, then the turn passes', () => {
    const s = flip(flip(initialMemory(cards), 0, 0), 0, 3);
    expect(s.missed).toEqual([0, 3]);
    expect(s.owner.every((o) => o === null)).toBe(true);
    expect(s.turn).toBe(1);
  });

  it('ignores flips out of turn, of found cards, and of the card already open', () => {
    const s0 = initialMemory(cards);
    expect(flip(s0, 1, 0)).toBe(s0);
    const s1 = flip(s0, 0, 0);
    expect(flip(s1, 0, 0)).toBe(s1);
    const s2 = flip(s1, 0, 1);
    expect(flip(s2, 0, 1)).toBe(s2);
  });

  it('ends when every pair is found', () => {
    let s = initialMemory(cards);
    for (let i = 0; i < cards.length; i++) s = flip(s, 0, i);
    expect(s.over).toBe(true);
    expect(s.pairs).toEqual([4, 0]);
  });
});

describe('layout', () => {
  it('lays out each word with its meaning, and checks what arrives', () => {
    const laid = layMemory([{ word: 'apple', meaning: 'a fruit' }, { word: 'river', meaning: 'flowing water' }]);
    expect(laid).toHaveLength(4);
    expect(parseLayout(laid)).toEqual(laid);
    expect(parseLayout([...laid.slice(0, 3), { ...laid[0] }])).toBeNull();
    expect(parseLayout('nope')).toBeNull();
  });
});
