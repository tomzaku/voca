// Tiến lên's rules (thirteen, as it's played in the south), for two players,
// with no UI attached. Each player gets 13 cards; the rest stay in the deck.
// Cards rank 3 (lowest) up to A, then 2 (highest); suits ♠ < ♣ < ♦ < ♥.
//
// Whoever leads plays any combination: a single, a pair, three or four of a
// kind, a run of three or more (sảnh — no 2s in it), or three or more pairs
// in a row (đôi thông). The other player must beat it with the same kind and
// size, higher at the top — or pass, and the one who played last leads
// again. Some combinations chop a 2 (chặt heo): three pairs in a row or four
// of a kind beat a single 2, four of a kind or four pairs in a row beat a
// pair of 2s, and so on up. Empty your hand first to win the deal; first to
// three deals wins. The lowest card starts the first deal, and the winner
// of each deal leads the next.
//
// As in poker, the host's side deals and runs the game, and sends each
// player only their own hand (`viewFor`).

export const HAND_SIZE = 13;
export const DEALS_TO_WIN = 3;

export type Seat = 0 | 1;
/** A card is 0–51: rank × 4 + suit — so the order of the numbers is the order of the cards. */
export type TlCard = number;

const RANK_CHARS = '3456789TJQKA2';
const SUIT_CHARS = 'scdh';
export const rankOf = (c: TlCard) => Math.floor(c / 4);
export const isTwo = (c: TlCard) => rankOf(c) === 12;
/** As the shared card face draws it: "3s", "Th", "2h". */
export const cardName = (c: TlCard) => RANK_CHARS[rankOf(c)] + SUIT_CHARS[c % 4];

export type ComboType = 'single' | 'pair' | 'triple' | 'quad' | 'run' | 'pairs';
export interface Combo { type: ComboType; size: number; top: TlCard }

/** What a set of cards is as a play, or null if it's not one. */
export function classify(cards: TlCard[]): Combo | null {
  const c = [...cards].sort((a, b) => a - b);
  const n = c.length;
  if (n === 0 || new Set(c).size !== n) return null;
  const ranks = c.map(rankOf);
  const top = c[n - 1];
  const same = ranks.every((r) => r === ranks[0]);
  if (n === 1) return { type: 'single', size: 1, top };
  if (same && n === 2) return { type: 'pair', size: 2, top };
  if (same && n === 3) return { type: 'triple', size: 3, top };
  if (same && n === 4) return { type: 'quad', size: 4, top };
  const noTwos = ranks.every((r) => r !== 12);
  if (n >= 3 && noTwos && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1)) return { type: 'run', size: n, top };
  if (n >= 6 && n % 2 === 0 && noTwos) {
    const ok = Array.from({ length: n / 2 }, (_, i) => ranks[2 * i] === ranks[2 * i + 1] && (i === 0 || ranks[2 * i] === ranks[2 * i - 2] + 1)).every(Boolean);
    if (ok) return { type: 'pairs', size: n, top };
  }
  return null;
}

/** Whether `play` beats what's on the table (`table`: null when leading). */
export function beats(play: Combo, table: Combo | null): boolean {
  if (!table) return true;
  if (play.type === table.type && play.size === table.size) return play.top > table.top;
  const two = isTwo(table.top);
  // Chopping: what beats a 2, a pair of 2s, and the chops themselves.
  if (table.type === 'single' && two) return play.type === 'quad' || (play.type === 'pairs' && play.size >= 6);
  if (table.type === 'pair' && two) return play.type === 'quad' || (play.type === 'pairs' && play.size >= 8);
  if (table.type === 'pairs' && table.size === 6) return play.type === 'quad' || (play.type === 'pairs' && play.size >= 8);
  if (table.type === 'quad') return play.type === 'pairs' && play.size >= 8;
  return false;
}

export interface TlState {
  deal: number;
  hands: [TlCard[], TlCard[]];
  /** What's on the table to beat, and who played it — null when leading. */
  table: { cards: TlCard[]; combo: Combo; by: Seat } | null;
  turn: Seat;
  wins: [number, number];
  /** The last deal's winner, while the next is coming. */
  dealWinner: Seat | null;
  last: { seat: Seat; pass: boolean } | null;
  over: boolean;
}

function cryptoRandom() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

/** A new deal: 13 cards each; the lowest card starts the first, the last winner the rest. */
export function dealTl(prev: TlState | null, random: () => number = cryptoRandom): TlState {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const hands: [TlCard[], TlCard[]] = [deck.slice(0, HAND_SIZE).sort((a, b) => a - b), deck.slice(HAND_SIZE, HAND_SIZE * 2).sort((a, b) => a - b)];
  const turn: Seat = prev?.dealWinner ?? (hands[0][0] < hands[1][0] ? 0 : 1);
  return { deal: (prev?.deal ?? 0) + 1, hands, table: null, turn, wins: prev?.wins ?? [0, 0], dealWinner: null, last: null, over: false };
}

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

/** Play cards from `seat`'s hand. Anything not allowed leaves the state as it was. */
export function playTl(s: TlState, seat: Seat, cards: TlCard[]): TlState {
  if (s.over || s.dealWinner !== null || s.turn !== seat) return s;
  const hand = s.hands[seat];
  if (!cards.every((c) => hand.includes(c))) return s;
  const combo = classify(cards);
  if (!combo || !beats(combo, s.table?.combo ?? null)) return s;
  const hands: [TlCard[], TlCard[]] = [s.hands[0].slice(), s.hands[1].slice()];
  hands[seat] = hand.filter((c) => !cards.includes(c));
  const sorted = [...cards].sort((a, b) => a - b);
  if (hands[seat].length === 0) {
    const wins: [number, number] = [...s.wins];
    wins[seat] += 1;
    return { ...s, hands, table: { cards: sorted, combo, by: seat }, wins, dealWinner: seat, last: { seat, pass: false }, over: wins[seat] >= DEALS_TO_WIN };
  }
  return { ...s, hands, table: { cards: sorted, combo, by: seat }, turn: other(seat), last: { seat, pass: false } };
}

/** Pass: the table clears and the other player — who played last — leads. */
export function passTl(s: TlState, seat: Seat): TlState {
  if (s.over || s.dealWinner !== null || s.turn !== seat || !s.table) return s;
  return { ...s, table: null, turn: other(seat), last: { seat, pass: true } };
}

/** One player's view: their own hand, and only how many cards the other holds. */
export type TlView = Omit<TlState, 'hands'> & { you: Seat; hand: TlCard[]; counts: [number, number] };

export function tlViewFor(s: TlState, seat: Seat): TlView {
  const { hands, ...rest } = s;
  return { ...rest, you: seat, hand: hands[seat].slice(), counts: [hands[0].length, hands[1].length] };
}

const isCard = (c: unknown): c is TlCard => Number.isInteger(c) && (c as number) >= 0 && (c as number) < 52;

/** A view as the host sent it, or null if it isn't one. */
export function parseTlView(raw: unknown): TlView | null {
  const v = raw as TlView | null;
  if (!v || typeof v !== 'object' || !Array.isArray(v.hand) || !v.hand.every(isCard) || v.hand.length > HAND_SIZE) return null;
  if (!Array.isArray(v.counts) || !Array.isArray(v.wins)) return null;
  if (v.table && (!Array.isArray(v.table.cards) || !v.table.cards.every(isCard) || !classify(v.table.cards))) return null;
  return v;
}
