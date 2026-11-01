// A treasure hunt's questions, before the server has them: generated from a
// word list, shown to the teacher one card at a time, edited, removed and
// added to — then dealt round the stations. Pure; the create page loads the
// word data and pictures and passes them in. The server validates whatever
// arrives (supabase/functions/_shared/hunts.ts), so nothing here is trusted.

import type { MiniWordData } from './quizShare';
import { blankSentence } from './quizEngine';

export type HuntQuestionType =
  | 'definition' | 'sentence' | 'listen' | 'unscramble' | 'spell' | 'image' | 'match' | 'custom';

/** The kinds the app can make from a word — every kind but the teacher's own. */
export type WordQuestionType = Exclude<HuntQuestionType, 'custom'>;

/** In the order the generator cycles through them, and the picker lists them. */
export const HUNT_TYPES: WordQuestionType[] = ['definition', 'sentence', 'listen', 'unscramble', 'spell', 'image', 'match'];

export interface DraftQuestion {
  type: HuntQuestionType;
  prompt: string;
  options?: string[];
  say?: string;
  scrambled?: string;
  answer: string;
  /** Other answers that count too (typed questions only). */
  accept?: string[];
  /** `image`: key into the hunt's pictures. */
  image?: string;
  /** `match`: the meanings, and the word that belongs with each. */
  slotPrompts?: string[];
  slots?: string[];
}

/** A question on the teacher's list: a stable id for React, and the word it was made from. */
export interface EditableQuestion extends DraftQuestion {
  id: string;
  word?: string;
}

export interface DraftStation {
  type: HuntQuestionType;
  /** Where the card is hidden (classroom) — the teacher's words. */
  clue: string;
  /** The landmark that opens it (world). */
  place: string | null;
  questions: DraftQuestion[];
}

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
/** The most questions one press of Generate makes — a set, not a bank. */
export const MAX_GENERATE = 30;
/** The most a hunt holds altogether, generated and added. */
export const MAX_QUESTIONS = 60;
/** The server's cap on one station's pool. */
export const MAX_STATION_QUESTIONS = 12;
export const MAX_WRONG = 3;
/** Words on one matching board. */
export const MATCH_SIZE = 4;
export const MAX_PAIRS = 6;

type Rand = () => number;

function shuffleWith<T>(arr: T[], rand: Rand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A short random id from [a-z0-9] — a question's, or a picture's key (the server checks the shape). */
export function newKey(rand: Rand = Math.random, length = 12): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => abc[Math.floor(rand() * abc.length)]).join('');
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

/** What building a question can draw on. */
export interface Ctx {
  data: Record<string, MiniWordData>;
  /** Words to take wrong answers from — the hunt's own first, then any others. */
  wrongPool: string[];
  /** Pictures by word (data: URIs), for picture questions. */
  pictures?: Record<string, string>;
  rand?: Rand;
}

/** A built question, and the picture it needs saving under its key, if any. */
export interface Built {
  question: EditableQuestion;
  picture?: { key: string; data: string };
}

/**
 * One question of `type` about `word`, or null when that kind can't be made
 * from it — a gap-fill with no example sentence containing the word, a phrase
 * to unscramble, a picture question for a word with no picture.
 */
export function makeQuestion(type: WordQuestionType, word: string, ctx: Ctx): Built | null {
  const rand = ctx.rand ?? Math.random;
  const data = ctx.data[word];
  if (!data) return null;
  const others = shuffleWith(ctx.wrongPool.filter((w) => w.toLowerCase() !== word.toLowerCase()), rand);
  const options = () => shuffleWith([word, ...others.slice(0, MAX_WRONG)], rand);
  const base = { id: newKey(rand), word, answer: word };
  switch (type) {
    case 'definition':
      return data.definition ? { question: { ...base, type, prompt: data.definition, options: options() } } : null;
    case 'sentence':
      for (const ex of data.examples ?? []) {
        const blanked = blankSentence(ex, word);
        if (blanked) return { question: { ...base, type, prompt: blanked, options: options() } };
      }
      return null;
    case 'listen':
      return { question: { ...base, type, prompt: '', say: word, options: options() } };
    case 'unscramble':
      return isPlainWord(word) ? { question: { ...base, type, prompt: data.definition, scrambled: scramble(word, rand) } } : null;
    case 'spell':
      return isPlainWord(word) ? { question: { ...base, type, prompt: '', say: word } } : null;
    case 'image': {
      const picture = ctx.pictures?.[word];
      if (!picture) return null;
      const key = newKey(rand);
      return { question: { ...base, type, prompt: '', image: key, options: options() }, picture: { key, data: picture } };
    }
    case 'match': {
      // This word and up to three others the hunt has meanings for.
      const partners = others.filter((w) => ctx.data[w]?.definition).slice(0, MATCH_SIZE - 1);
      if (!data.definition || partners.length < 1) return null;
      const set = shuffleWith([word, ...partners], rand);
      return {
        question: {
          ...base,
          type,
          prompt: '',
          slotPrompts: set.map((w) => ctx.data[w].definition),
          slots: set,
          options: shuffleWith(set, rand),
          answer: set.join(' · '),
        },
      };
    }
  }
}

/**
 * Up to `count` questions, cycling the chosen kinds over the words so each
 * word turns up in different kinds. A kind that can't use a word falls back to
 * its meaning, so the set comes out full whatever the word list looks like.
 */
export function generateQuestions(o: {
  words: string[];
  types: WordQuestionType[];
  count: number;
} & Ctx): Built[] {
  const rand = o.rand ?? Math.random;
  const words = shuffleWith(o.words.filter((w) => o.data[w]), rand);
  if (!words.length || !o.types.length) return [];
  const count = Math.min(o.count, MAX_GENERATE);
  const out: Built[] = [];
  for (let i = 0; i < count; i++) {
    const type = o.types[i % o.types.length];
    // The word moves on every question, and shifts by one each lap of the
    // kinds — so a word comes round again in a different kind.
    const word = words[(i + Math.floor(i / o.types.length)) % words.length];
    const built = makeQuestion(type, word, { ...o, rand }) ?? makeQuestion('definition', word, { ...o, rand });
    if (built) out.push(built);
  }
  return out;
}

// ── Editing ────────────────────────────────────────────────────────────────

/** A question as the edit form holds it — one shape for every kind. */
export interface QuestionForm {
  prompt: string;
  answer: string;
  wrong: string[];
  accept: string[];
  pairs: { prompt: string; word: string }[];
}

/** Kinds where the student reads a prompt the teacher can edit. */
export const HAS_PROMPT: HuntQuestionType[] = ['definition', 'sentence', 'unscramble', 'custom'];
/** Kinds answered by picking from options. */
export const HAS_WRONG: HuntQuestionType[] = ['definition', 'sentence', 'listen', 'image', 'custom'];

export function toForm(q: DraftQuestion): QuestionForm {
  const key = (s: string) => s.trim().toLowerCase();
  return {
    prompt: q.prompt,
    answer: q.type === 'match' ? '' : q.answer,
    wrong: q.type === 'match' ? [] : (q.options ?? []).filter((o) => key(o) !== key(q.answer)),
    accept: q.accept ?? [],
    pairs: (q.slotPrompts ?? []).map((prompt, i) => ({ prompt, word: q.slots?.[i] ?? '' })),
  };
}

/**
 * The edited question. Blank wrong answers are dropped, repeats too (the
 * first spelling wins), and a `custom` question with none left becomes one
 * students type. Options are re-shuffled so the answer isn't always first.
 */
export function fromForm(prev: EditableQuestion, f: QuestionForm, rand: Rand = Math.random): EditableQuestion {
  const key = (s: string) => s.trim().toLowerCase();
  const answer = f.answer.trim();
  const wrong: string[] = [];
  for (const w of f.wrong.map((x) => x.trim())) {
    if (w && key(w) !== key(answer) && !wrong.some((x) => key(x) === key(w))) wrong.push(w);
  }
  wrong.splice(MAX_WRONG);
  const base: EditableQuestion = { id: prev.id, word: prev.word, type: prev.type, prompt: '', answer };
  switch (prev.type) {
    case 'definition':
    case 'sentence':
      return { ...base, prompt: f.prompt.trim(), options: shuffleWith([answer, ...wrong], rand) };
    case 'listen':
      return { ...base, say: answer, options: shuffleWith([answer, ...wrong], rand) };
    case 'image':
      return { ...base, image: prev.image, options: shuffleWith([answer, ...wrong], rand) };
    case 'unscramble':
      return { ...base, prompt: f.prompt.trim(), scrambled: scramble(answer, rand) };
    case 'spell':
      return { ...base, say: answer };
    case 'match': {
      const pairs = f.pairs
        .map((p) => ({ prompt: p.prompt.trim(), word: p.word.trim() }))
        .filter((p) => p.prompt && p.word)
        .slice(0, MAX_PAIRS);
      const slots = pairs.map((p) => p.word);
      return { ...base, slotPrompts: pairs.map((p) => p.prompt), slots, options: shuffleWith(slots, rand), answer: slots.join(' · ') };
    }
    case 'custom': {
      if (wrong.length) return { ...base, prompt: f.prompt.trim(), options: shuffleWith([answer, ...wrong], rand) };
      const accept = f.accept.map((a) => a.trim()).filter((a) => a && key(a) !== key(answer));
      return { ...base, prompt: f.prompt.trim(), ...(accept.length ? { accept } : {}) };
    }
  }
}

/** A blank question of her own, ready for the edit form. */
export function blankCustom(rand: Rand = Math.random): EditableQuestion {
  return { id: newKey(rand), type: 'custom', prompt: '', answer: '' };
}

/**
 * What stops a question being asked, or null if nothing does — the same
 * checks the server makes, said so the teacher can fix them before saving.
 */
export type Problem = 'noPrompt' | 'noAnswer' | 'noWrong' | 'fewPairs' | 'dupWords';

export function problemOf(q: DraftQuestion): Problem | null {
  if (q.type === 'match') {
    const slots = q.slots ?? [];
    if (slots.length < 2) return 'fewPairs';
    if (new Set(slots.map((s) => s.toLowerCase())).size < slots.length) return 'dupWords';
    return null;
  }
  if (!q.answer.trim()) return 'noAnswer';
  if (HAS_PROMPT.includes(q.type) && !q.prompt.trim()) return 'noPrompt';
  if (HAS_WRONG.includes(q.type) && q.type !== 'custom' && (q.options?.length ?? 0) < 2) return 'noWrong';
  return null;
}

// ── Stations ───────────────────────────────────────────────────────────────

/**
 * The questions dealt round the stations like cards: station 1 gets the 1st,
 * the 4th, the 7th… So each gets its share and a mix of kinds, and none is left
 * empty while there are at least as many questions as stations.
 */
export function dealQuestions<T>(questions: T[], count: number): T[][] {
  const out: T[][] = Array.from({ length: count }, () => []);
  questions.forEach((q, i) => out[i % count].push(q));
  return out;
}

/**
 * The stations to send: the askable questions dealt round, each station with
 * its clue (classroom) or landmark (world). The list's own ids and source
 * words stay behind.
 */
export function stationsFromQuestions(
  questions: EditableQuestion[],
  count: number,
  where: { clues?: string[]; places?: string[] } = {},
): DraftStation[] {
  const ready = questions.filter((q) => !problemOf(q));
  if (ready.length < count) throw new Error(`A hunt needs at least ${count} questions — one for each station.`);
  return dealQuestions(ready, count).map((qs, i) => ({
    type: qs[0].type,
    clue: where.clues?.[i]?.trim() ?? '',
    place: where.places?.[i] ?? null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    questions: qs.slice(0, MAX_STATION_QUESTIONS).map(({ id, word, ...q }) => q),
  }));
}

/** Only the pictures some question still uses — removed ones aren't uploaded. */
export function picturesInUse(questions: DraftQuestion[], pictures: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of questions) if (q.image && pictures[q.image]) out[q.image] = pictures[q.image];
  return out;
}

/** `n` different landmarks for a world hunt, in a random order. */
export function pickPlaces(n: number, rand: Rand = Math.random): string[] {
  return shuffleWith([...HUNT_PLACES], rand).slice(0, n);
}

/** Words from the teacher's text box: one per line or comma, de-duplicated, lower-case, capped. */
export function parseWords(text: string): string[] {
  return [...new Set(text.split(/[\n,;]+/).map((w) => w.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_WORDS);
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

/** Identifies a question as a student sees it — a new one remounts its screen (clean box, fresh audio). */
export function questionKey(q: {
  type: string; prompt: string; say: string | null; scrambled: string | null;
  image?: string | null; slotPrompts?: string[] | null;
}): string {
  return `${q.type}|${q.prompt}|${q.say ?? ''}|${q.scrambled ?? ''}|${q.image ?? ''}|${(q.slotPrompts ?? []).join('/')}`;
}
