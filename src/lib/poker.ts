// Heads-up Texas Hold'em, with no UI attached — play chips only, nothing
// real at stake. Two players, 1000 chips each, blinds 10/20; the dealer posts
// the small blind and acts first before the flop, last after it, and the
// button moves every hand. No-limit: a raise is at least the size of the
// last one (or the big blind), and anyone may go all in. Play runs until
// someone has no chips left.
//
// In a match the host's side runs this and sends each player their view —
// their own cards, never the other's until a showdown (`viewFor`). The guest
// only sends what they do; the host checks it here like its own.

export const START_STACK = 1000;
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;

export type Seat = 0 | 1;
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
/** A card: rank (2–9, T, J, Q, K, A) then suit (s, h, d, c) — "Ah", "Td". */
export type Card = string;

export type PokerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** Bet or raise to this much in front of you on this street. */
  | { type: 'raise'; to: number };

export interface HandResult {
  /** One winner, or both on a split pot. */
  winners: Seat[];
  /** Chips won — each, on a split. */
  amount: number;
  /** Each player's best hand, at a showdown. */
  names: [string | null, string | null];
  showdown: boolean;
}

export interface PokerState {
  hand: number;
  dealer: Seat;
  deck: Card[];
  holes: [Card[], Card[]];
  board: Card[];
  stacks: [number, number];
  /** In front of each player on this street, not yet in the pot. */
  bets: [number, number];
  pot: number;
  street: Street;
  toAct: Seat | null;
  /** The last raise's size: the next must be at least this. */
  lastRaise: number;
  /** Who has acted since the last bet or raise. */
  acted: [boolean, boolean];
  last: { seat: Seat; action: PokerAction['type'] | 'allin'; amount: number } | null;
  result: HandResult | null;
  /** Someone is out of chips: the game is over. */
  over: boolean;
}

const RANKS = '23456789TJQKA';
const SUITS = 'shdc';
const other = (s: Seat): Seat => (s === 0 ? 1 : 0);
export const rankOf = (c: Card) => RANKS.indexOf(c[0]) + 2;

/** A fresh deck, shuffled with the given random source (crypto by default). */
export function shuffledDeck(random: () => number = cryptoRandom): Card[] {
  const deck = [...RANKS].flatMap((r) => [...SUITS].map((s) => r + s));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function cryptoRandom() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

// ── Hands ──

export const HAND_NAMES = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];

/** Five cards' strength: its category, then the ranks that break ties. */
function score5(cards: Card[]): number[] {
  const ranks = cards.map(rankOf).sort((a, b) => b - a);
  const flush = cards.every((c) => c[1] === cards[0][1]);
  const unique = [...new Set(ranks)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks.join() === '14,5,4,3,2') straightHigh = 5;          // the wheel, A-2-3-4-5
  }
  if (flush && straightHigh) return [8, straightHigh];
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const byGroup = groups.map((g) => g[0]);
  const shape = groups.map((g) => g[1]).join('');
  if (shape === '41') return [7, ...byGroup];
  if (shape === '32') return [6, ...byGroup];
  if (flush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];
  if (shape === '311') return [3, ...byGroup];
  if (shape === '221') return [2, ...byGroup];
  if (shape === '2111') return [1, ...byGroup];
  return [0, ...ranks];
}

const compare = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  return 0;
};

/** Every way to choose `k` of `items`. */
function choose<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...choose(rest, k - 1).map((c) => [first, ...c]), ...choose(rest, k)];
}

/** The best five of the cards given (five to seven), and its name. */
export function bestHand(cards: Card[]): { score: number[]; name: string } {
  let score = score5(cards.slice(0, 5));
  for (const five of choose(cards, 5)) {
    const s = score5(five);
    if (compare(s, score) > 0) score = s;
  }
  const name = score[0] === 8 && score[1] === 14 ? 'Royal flush' : HAND_NAMES[score[0]];
  return { score, name };
}

// ── Play ──

export function newGame(random?: () => number): PokerState {
  return dealHand({
    hand: 0, dealer: 1, deck: [], holes: [[], []], board: [], stacks: [START_STACK, START_STACK], bets: [0, 0], pot: 0,
    street: 'preflop', toAct: null, lastRaise: BIG_BLIND, acted: [false, false], last: null, result: null, over: false,
  }, random);
}

/** The next hand: the button moves, cards are dealt, the blinds go in. */
export function dealHand(prev: PokerState, random?: () => number): PokerState {
  if (prev.over) return prev;
  const dealer = other(prev.dealer);
  const deck = shuffledDeck(random);
  const holes: [Card[], Card[]] = [[deck.pop()!, deck.pop()!], [deck.pop()!, deck.pop()!]];
  const s: PokerState = {
    ...prev, hand: prev.hand + 1, dealer, deck, holes, board: [], stacks: [...prev.stacks], bets: [0, 0], pot: 0,
    street: 'preflop', toAct: dealer, lastRaise: BIG_BLIND, acted: [false, false], last: null, result: null,
  };
  const post = (seat: Seat, amount: number) => { const a = Math.min(amount, s.stacks[seat]); s.stacks[seat] -= a; s.bets[seat] += a; };
  post(dealer, SMALL_BLIND);
  post(other(dealer), BIG_BLIND);
  return settle(s);
}

/** What `seat` may do now — from the whole game or a player's view of it. */
export function legal(s: Pick<PokerState, 'bets' | 'stacks' | 'toAct' | 'result' | 'lastRaise'>, seat: Seat) {
  const toCall = Math.max(0, s.bets[other(seat)] - s.bets[seat]);
  const mine = s.toAct === seat && !s.result;
  const maxTo = s.bets[seat] + s.stacks[seat];
  const minTo = Math.min(maxTo, s.bets[other(seat)] + Math.max(s.lastRaise, BIG_BLIND));
  return {
    toCall: Math.min(toCall, s.stacks[seat]),
    canCheck: mine && toCall === 0,
    canCall: mine && toCall > 0,
    // No raising into someone already all in.
    canRaise: mine && s.stacks[seat] > toCall && s.stacks[other(seat)] > 0,
    minTo, maxTo,
  };
}

/** Play an action for `seat`. Anything not allowed leaves the state as it was. */
export function act(state: PokerState, seat: Seat, action: PokerAction): PokerState {
  if (state.toAct !== seat || state.result) return state;
  const l = legal(state, seat);
  const s: PokerState = { ...state, stacks: [...state.stacks], bets: [...state.bets], acted: [...state.acted] };
  const put = (amount: number) => { s.stacks[seat] -= amount; s.bets[seat] += amount; };
  switch (action.type) {
    case 'fold': {
      s.last = { seat, action: 'fold', amount: 0 };
      return award(s, [other(seat)], false);
    }
    case 'check':
      if (!l.canCheck) return state;
      s.acted[seat] = true;
      s.last = { seat, action: 'check', amount: 0 };
      break;
    case 'call':
      if (!l.canCall) return state;
      put(l.toCall);
      s.acted[seat] = true;
      s.last = { seat, action: s.stacks[seat] === 0 ? 'allin' : 'call', amount: s.bets[seat] };
      break;
    case 'raise': {
      if (!l.canRaise || !Number.isFinite(action.to)) return state;
      const to = Math.floor(Math.min(action.to, l.maxTo));
      // Below the minimum is only allowed as an all in.
      if (to < l.minTo && to < l.maxTo) return state;
      if (to <= s.bets[other(seat)]) return state;
      const size = to - s.bets[other(seat)];
      if (size >= s.lastRaise) s.lastRaise = size;
      put(to - s.bets[seat]);
      s.acted = [false, false];
      s.acted[seat] = true;
      s.last = { seat, action: s.stacks[seat] === 0 ? 'allin' : 'raise', amount: to };
      break;
    }
    default:
      return state;
  }
  s.toAct = other(seat);
  return settle(s);
}

/** After a move: on to the next street, or the showdown, once the betting is done. */
function settle(s: PokerState): PokerState {
  const [a, b] = s.bets;
  const smaller: Seat = a <= b ? 0 : 1;
  const done = (a === b && (s.acted[0] || s.stacks[0] === 0) && (s.acted[1] || s.stacks[1] === 0))
    || (a !== b && s.stacks[smaller] === 0);
  if (!done) {
    // Whoever's turn it is can't act if they're all in with nothing to call.
    if (s.toAct !== null && s.stacks[s.toAct] === 0) s.toAct = other(s.toAct);
    return s;
  }
  // An uncalled part of a bet goes back.
  if (a !== b) {
    const big = other(smaller);
    const extra = s.bets[big] - s.bets[smaller];
    s.bets[big] -= extra;
    s.stacks[big] += extra;
  }
  s.pot += s.bets[0] + s.bets[1];
  s.bets = [0, 0];
  s.acted = [false, false];
  s.lastRaise = BIG_BLIND;
  const deck = s.deck.slice();
  const deal = (n: number) => { for (let i = 0; i < n; i++) s.board = [...s.board, deck.pop()!]; };
  // Someone all in: no more betting — run the board out.
  const allIn = s.stacks[0] === 0 || s.stacks[1] === 0;
  const next: Record<Street, Street> = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown', showdown: 'showdown' };
  do {
    s.street = next[s.street];
    if (s.street === 'flop') deal(3);
    else if (s.street === 'turn' || s.street === 'river') deal(1);
  } while (allIn && s.street !== 'showdown');
  s.deck = deck;
  if (s.street === 'showdown') return showdown(s);
  s.toAct = other(s.dealer);   // after the flop, the big blind goes first
  return s;
}

function showdown(s: PokerState): PokerState {
  const h0 = bestHand([...s.holes[0], ...s.board]), h1 = bestHand([...s.holes[1], ...s.board]);
  const c = compare(h0.score, h1.score);
  const r = award(s, c > 0 ? [0] : c < 0 ? [1] : [0, 1], true);
  r.result!.names = [h0.name, h1.name];
  return r;
}

function award(s: PokerState, winners: Seat[], shown: boolean): PokerState {
  const pot = s.pot + s.bets[0] + s.bets[1];
  const stacks: [number, number] = [...s.stacks];
  const each = Math.floor(pot / winners.length);
  for (const w of winners) stacks[w] += each;
  // An odd chip on a split goes to the player out of position.
  if (winners.length === 2 && pot % 2) stacks[other(s.dealer)] += 1;
  return {
    ...s, stacks, bets: [0, 0], pot: 0, toAct: null, street: shown ? 'showdown' : s.street,
    result: { winners, amount: each, names: [null, null], showdown: shown },
    over: stacks[0] === 0 || stacks[1] === 0,
  };
}

/** What one player may see: everything but the deck, and the other's cards
 *  only at a showdown. */
export type PokerView = Omit<PokerState, 'deck'> & { you: Seat };

export function viewFor(s: PokerState, seat: Seat): PokerView {
  const { deck: _deck, ...rest } = s;
  void _deck;
  const holes: [Card[], Card[]] = [s.holes[0].slice(), s.holes[1].slice()];
  if (!s.result?.showdown) holes[other(seat)] = [];
  return { ...rest, holes, you: seat };
}

const isCard = (c: unknown): c is Card => typeof c === 'string' && c.length === 2 && RANKS.includes(c[0]) && SUITS.includes(c[1]);

/** A view as the host sent it, or null if it isn't one. */
export function parseView(raw: unknown): PokerView | null {
  const v = raw as PokerView | null;
  if (!v || typeof v !== 'object' || !Array.isArray(v.holes) || !Array.isArray(v.board) || !Array.isArray(v.stacks) || !Array.isArray(v.bets)) return null;
  if (!v.board.every(isCard) || v.board.length > 5 || !v.holes.every((h) => Array.isArray(h) && h.length <= 2 && h.every(isCard))) return null;
  if (![...v.stacks, ...v.bets, v.pot, v.hand].every((n) => Number.isFinite(n) && n >= 0)) return null;
  return v;
}
