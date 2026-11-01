// Building a treasure hunt from a word list: one station per letter of the
// treasure word, each a pool of questions of one kind. Pure — the create page
// loads the word data and passes it in; the server validates whatever arrives
// (supabase/functions/_shared/hunts.ts), so nothing here is trusted.
//
// Each station holds a question per word, so teammates get different ones and
// a miss moves a student on to a fresh question instead of letting them guess
// through the same four options.

import type { MiniWordData } from './quizShare';
import { blankSentence } from './quizEngine';

export type HuntQuestionType = 'definition' | 'sentence' | 'listen' | 'unscramble' | 'spell';

export interface DraftQuestion {
  type: HuntQuestionType;
  prompt: string;
  options?: string[];
  say?: string;
  scrambled?: string;
  answer: string;
}

export interface DraftStation {
  type: HuntQuestionType;
  /** Where the card is hidden (classroom) — the teacher's words. */
  clue: string;
  /** The landmark that opens it (world). */
  place: string | null;
  questions: DraftQuestion[];
}

/** The station kinds, in the order a hunt cycles through them. */
export const HUNT_TYPES: HuntQuestionType[] = ['definition', 'unscramble', 'sentence', 'listen', 'spell'];

/**
 * Landmarks a world hunt can use: named places in the city that the map lights
 * up as you reach them, close enough together to walk between in a lesson.
 */
export const HUNT_PLACES = [
  'ngoMon', 'thaiHoa', 'kyDai', 'phuVanLau', 'truongTien', 'dongBa',
  'quocHoc', 'thienMu', 'gaHue', 'foodMarket', 'conHen', 'tangThuLau',
] as const;

export const TREASURE_IDEAS = ['GOLD', 'GEMS', 'CROWN', 'PEARL', 'JEWEL', 'PIRATE', 'DIAMOND', 'TREASURE'];

export const MIN_WORDS = 4;
export const MAX_WORDS = 30;
/** Questions per station. More than any team needs; the rest are for misses. */
export const QUESTIONS_PER_STATION = 8;

type Rand = () => number;

function shuffleWith<T>(arr: T[], rand: Rand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A single word of letters only — the kind you can unscramble or spell. */
export function isPlainWord(w: string): boolean {
  return /^[a-z]{3,}$/i.test(w);
}

/** The word's letters, upper-case and shuffled — never left in the word's own order. */
export function scramble(word: string, rand: Rand = Math.random): string {
  const letters = word.toUpperCase().split('');
  if (new Set(letters).size < 2) return letters.join('');
  for (let i = 0; i < 20; i++) {
    const s = shuffleWith(letters, rand).join('');
    if (s !== word.toUpperCase()) return s;
  }
  // A stubborn rand: rotate by one, which always differs for 2+ distinct letters.
  return [...letters.slice(1), letters[0]].join('');
}

/**
 * One question about `word`, or null when this kind can't be made from it — a
 * gap-fill with no example sentence containing the word, a phrase to unscramble.
 */
export function buildQuestion(
  type: HuntQuestionType,
  word: string,
  data: MiniWordData,
  wrong: string[],
  rand: Rand = Math.random,
): DraftQuestion | null {
  const options = () => shuffleWith([word, ...wrong.filter((w) => w !== word).slice(0, 3)], rand);
  switch (type) {
    case 'definition':
      return data.definition ? { type, prompt: data.definition, options: options(), answer: word } : null;
    case 'sentence': {
      for (const ex of data.examples ?? []) {
        const blanked = blankSentence(ex, word);
        if (blanked) return { type, prompt: blanked, options: options(), answer: word };
      }
      return null;
    }
    case 'listen':
      return { type, prompt: '', say: word, options: options(), answer: word };
    case 'unscramble':
      return isPlainWord(word) ? { type, prompt: data.definition, scrambled: scramble(word, rand), answer: word } : null;
    case 'spell':
      return isPlainWord(word) ? { type, prompt: '', say: word, answer: word } : null;
  }
}

export interface BuildOptions {
  words: string[];
  data: Record<string, MiniWordData>;
  /** One station per letter of the treasure word. */
  count: number;
  /** Station kinds to cycle through. Defaults to all of them. */
  types?: HuntQuestionType[];
  /** Words to draw wrong options from, beyond the hunt's own. */
  extraWrong?: string[];
  /** World mode: the landmark of each station. */
  places?: string[];
  /** Classroom mode: where each card is hidden. */
  clues?: string[];
  rand?: Rand;
}

/**
 * The stations, each a pool of one kind of question over the hunt's words. A
 * word a kind can't use falls back to its definition, so every station has a
 * full pool whatever the word list looks like.
 */
export function buildStations(o: BuildOptions): DraftStation[] {
  const rand = o.rand ?? Math.random;
  const words = o.words.filter((w) => o.data[w]);
  if (words.length < MIN_WORDS) throw new Error(`A hunt needs at least ${MIN_WORDS} words.`);
  const types = o.types?.length ? o.types : HUNT_TYPES;
  const wrongPool = [...new Set([...words, ...(o.extraWrong ?? [])])];

  return Array.from({ length: o.count }, (_, i) => {
    const type = types[i % types.length];
    const questions: DraftQuestion[] = [];
    for (const word of shuffleWith(words, rand)) {
      if (questions.length >= QUESTIONS_PER_STATION) break;
      const wrong = shuffleWith(wrongPool.filter((w) => w !== word), rand);
      const q = buildQuestion(type, word, o.data[word], wrong, rand)
        ?? buildQuestion('definition', word, o.data[word], wrong, rand);
      if (q) questions.push(q);
    }
    return {
      type,
      clue: o.clues?.[i]?.trim() ?? '',
      place: o.places?.[i] ?? null,
      questions,
    };
  });
}

/** `n` different landmarks for a world hunt, in a random order. */
export function pickPlaces(n: number, rand: Rand = Math.random): string[] {
  return shuffleWith([...HUNT_PLACES], rand).slice(0, n);
}

/**
 * Whole seconds until `iso` on the server's clock — a phone set two minutes
 * fast would otherwise show the cooldown already over, or the hunt ending early.
 */
export function secondsUntil(iso: string | null, skewMs: number, now: number): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t - (now + skewMs)) / 1000));
}

/** "4:05" — a countdown's face. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Words from the teacher's text box: one per line or comma, de-duplicated, lower-case, capped. */
export function parseWords(text: string): string[] {
  return [...new Set(text.split(/[\n,;]+/).map((w) => w.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_WORDS);
}

/** Identifies a question as a student sees it — a new one remounts its screen (clean box, fresh audio). */
export function questionKey(q: { type: string; prompt: string; say: string | null; scrambled: string | null }): string {
  return `${q.type}|${q.prompt}|${q.say ?? ''}|${q.scrambled ?? ''}`;
}
