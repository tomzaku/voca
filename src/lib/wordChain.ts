// Word Chain's rules (nối từ), with no UI attached. Players take turns to say
// a word that starts with the last letter of the one before — "apple",
// "elephant", "tiger"… A word must be at least three letters, in the game's
// dictionary (the bundled CEFR list, ~8500 common words), and not used yet
// this game. A bad word, or none in time, costs a life and the turn passes
// with the same letter to start from. Lose every life and you lose.
//
// Both players replay the same words through these functions with the same
// dictionary, so they always agree on what counted.

export const CHAIN_LIVES = 3;
export const CHAIN_SECONDS = 20;
export const CHAIN_MIN = 3;

export type ChainVerdict = 'ok' | 'letter' | 'unknown' | 'used' | 'short' | 'time';

export interface ChainState {
  /** The words that counted, oldest first. */
  words: string[];
  /** What the next word must start with. */
  letter: string;
  /** Whose turn: 0 the host, 1 the guest. */
  turn: 0 | 1;
  lives: [number, number];
  /** Turns taken — a word sent for another turn is ignored. */
  moves: number;
  loser: 0 | 1 | null;
  /** The last turn's word and how it went, to show. */
  last: { player: 0 | 1; word: string | null; verdict: ChainVerdict } | null;
}

/** As typed → as judged: lower case, letters only. */
export const normalizeWord = (w: string) => w.toLowerCase().trim().replace(/[^a-z]/g, '');

export function initialChain(first: string): ChainState {
  const w = normalizeWord(first);
  return { words: [w], letter: w.slice(-1), turn: 0, lives: [CHAIN_LIVES, CHAIN_LIVES], moves: 0, loser: null, last: null };
}

export function checkChainWord(raw: string | null, state: ChainState, dict: Set<string>): ChainVerdict {
  if (raw === null) return 'time';
  const w = normalizeWord(raw);
  if (w.length < CHAIN_MIN) return 'short';
  if (!w.startsWith(state.letter)) return 'letter';
  if (state.words.includes(w)) return 'used';
  if (!dict.has(w)) return 'unknown';
  return 'ok';
}

/** One turn: the word sent (null: the time ran out). */
export function playChain(state: ChainState, raw: string | null, dict: Set<string>): ChainState {
  if (state.loser !== null) return state;
  const verdict = checkChainWord(raw, state, dict);
  const player = state.turn;
  const word = raw === null ? null : normalizeWord(raw).slice(0, 30);
  const lives: [number, number] = [...state.lives];
  let { words, letter } = state;
  if (verdict === 'ok') { words = [...words, word!]; letter = word!.slice(-1); }
  else lives[player] -= 1;
  return {
    words, letter, lives,
    turn: player === 0 ? 1 : 0,
    moves: state.moves + 1,
    loser: lives[player] <= 0 ? player : null,
    last: { player, word, verdict },
  };
}

/** The dictionary: single words only, at least the minimum length. */
export function chainDictionary(words: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const w of words) if (/^[a-z]+$/.test(w) && w.length >= CHAIN_MIN) out.add(w);
  return out;
}
