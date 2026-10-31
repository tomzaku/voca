// Memory Match's rules (lật thẻ), with no UI attached. Sixteen cards face
// down: eight English words, and a card with each one's meaning. On your
// turn, turn over two. A word and its own meaning are a pair — yours, and
// you go again; anything else is turned back and the turn passes. When every
// pair is found, whoever holds more wins.
//
// The host lays the cards out and sends the layout; after that a move is
// only which card was turned, and both players replay the same moves here.

export const MEMORY_PAIRS = 8;

export type Seat = 0 | 1;
export interface MemoryCard { pair: number; kind: 'word' | 'meaning'; text: string }

export interface MemoryState {
  cards: MemoryCard[];
  /** Who found each card's pair, or null while it's still face down. */
  owner: (Seat | null)[];
  /** The card turned this turn, waiting for its partner. */
  open: number | null;
  /** The last two turned over that didn't match — shown for a moment. */
  missed: [number, number] | null;
  turn: Seat;
  pairs: [number, number];
  /** Cards turned so far: a flip sent for another moment is ignored. */
  flips: number;
  over: boolean;
}

export function initialMemory(cards: MemoryCard[]): MemoryState {
  return { cards, owner: cards.map(() => null), open: null, missed: null, turn: 0, pairs: [0, 0], flips: 0, over: false };
}

/** Lay out the cards for some words and their meanings, shuffled. */
export function layMemory(words: { word: string; meaning: string }[], random: () => number = Math.random): MemoryCard[] {
  const cards = words.slice(0, MEMORY_PAIRS).flatMap((w, pair) => [
    { pair, kind: 'word' as const, text: w.word },
    { pair, kind: 'meaning' as const, text: w.meaning },
  ]);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function canFlip(s: MemoryState, seat: Seat, card: number): boolean {
  return !s.over && s.turn === seat && Number.isInteger(card) && card >= 0 && card < s.cards.length && s.owner[card] === null && s.open !== card;
}

/** Turn a card over. Anything not allowed leaves the state as it was. */
export function flip(s: MemoryState, seat: Seat, card: number): MemoryState {
  if (!canFlip(s, seat, card)) return s;
  const flips = s.flips + 1;
  if (s.open === null) return { ...s, open: card, missed: null, flips };
  const first = s.open;
  if (s.cards[first].pair === s.cards[card].pair) {
    const owner = s.owner.slice();
    owner[first] = owner[card] = seat;
    const pairs: [number, number] = [...s.pairs];
    pairs[seat] += 1;
    return { ...s, owner, open: null, missed: null, pairs, flips, over: owner.every((o) => o !== null) };
  }
  return { ...s, open: null, missed: [first, card], turn: seat === 0 ? 1 : 0, flips };
}

/** The layout as the host sent it, or null if it isn't one. */
export function parseLayout(raw: unknown): MemoryCard[] | null {
  if (!Array.isArray(raw) || raw.length < 4 || raw.length > MEMORY_PAIRS * 2 || raw.length % 2) return null;
  const cards: MemoryCard[] = [];
  for (const c of raw) {
    const { pair, kind, text } = (c ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(pair) || (kind !== 'word' && kind !== 'meaning') || typeof text !== 'string') return null;
    cards.push({ pair: Number(pair), kind, text: text.slice(0, 90) });
  }
  // Every pair once as a word and once as a meaning.
  const seen = new Map<number, Set<string>>();
  for (const c of cards) seen.set(c.pair, (seen.get(c.pair) ?? new Set()).add(c.kind));
  return [...seen.values()].every((k) => k.size === 2) && seen.size * 2 === cards.length ? cards : null;
}
