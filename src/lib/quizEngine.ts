// The rules of a vocabulary quiz, with no UI attached: which questions a word
// list becomes, what counts as a right answer, and how an answer is written to
// progress. The app's Quiz page (QuizRunner) and the world's Quiz Arena each
// draw their own screen and run their own flow — the arena adds lives and
// combos — but both play by these rules, so a fix here reaches both.

import { generateWordData, WORD_LIST } from './wordService';
import type { QuestionType, QuizConfig } from './quizConfig';
import type { MiniWordData } from './quizShare';
import type { AnswerVia, WordStatus } from '../types';

/** Single-word question types (everything except the multi-word 'match'). */
export type McqType = Exclude<QuestionType, 'match'>;

export interface McqQuestion {
  kind: 'mcq';
  type: McqType;
  word: string;
  prompt: string;
  options: string[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface QuizPair {
  word: string;
  definition: string;
}

export interface MatchQuestion {
  kind: 'match';
  pairs: QuizPair[];
}

export type Question = McqQuestion | MatchQuestion;

/** One word's outcome from an answered question, ready for the progress store. */
export interface WordResult {
  word: string;
  ok: boolean;
  via: AnswerVia;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The sentence with the word blanked out, or null if it doesn't contain it. */
export function blankSentence(sentence: string, word: string): string | null {
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  return re.test(sentence) ? sentence.replace(re, '_____') : null;
}

/** Map a question type to the answer-log label the progress store understands. */
export function viaFor(type: McqType): 'choice' | 'gap' | 'listen' {
  return type === 'sentence' ? 'gap' : type === 'listen' ? 'listen' : 'choice';
}

export function buildMcq(type: McqType, word: string, data: MiniWordData, wrong: string[]): McqQuestion | null {
  const base = {
    kind: 'mcq' as const,
    word,
    options: shuffle([word, ...wrong]),
    synonyms: data.synonyms,
    antonyms: data.antonyms,
  };
  if (type === 'sentence') {
    for (const ex of data.examples ?? []) {
      const blanked = blankSentence(ex, word);
      if (blanked) return { ...base, type, prompt: blanked };
    }
    return null; // no usable example — the caller falls back to a definition
  }
  if (type === 'listen') return { ...base, type, prompt: word };
  return { ...base, type, prompt: data.definition };
}

/**
 * A mixed question list from a config. Every loaded word is asked exactly
 * once; a 'match' board takes 3–5 words at a time, and a word whose chosen
 * type can't be built (no example to blank) falls back to its definition.
 */
export function buildQuiz(config: QuizConfig, loaded: string[], dataMap: Record<string, MiniWordData>): Question[] {
  const wrongPool = shuffle(WORD_LIST.map((w) => w.word).filter((w) => !loaded.includes(w)));
  const distractors = (word: string) =>
    shuffle([...loaded.filter((w) => w !== word), ...wrongPool]).slice(0, 3);

  const types = config.types;
  const mcqTypes = types.filter((t): t is McqType => t !== 'match');
  const pickMcqType = (): McqType => (mcqTypes.length ? mcqTypes[Math.floor(Math.random() * mcqTypes.length)] : 'definition');

  const pool = shuffle([...loaded]);
  const qs: Question[] = [];
  while (pool.length) {
    const t = types[Math.floor(Math.random() * types.length)];
    if (t === 'match' && pool.length >= 3) {
      const n = Math.min(pool.length, 3 + Math.floor(Math.random() * 3)); // 3–5
      const pairs = pool.splice(0, n).map((w) => ({ word: w, definition: dataMap[w].definition }));
      qs.push({ kind: 'match', pairs });
    } else {
      const word = pool.shift()!;
      const mt = t === 'match' ? pickMcqType() : t;
      const q = buildMcq(mt, word, dataMap[word], distractors(word))
        ?? buildMcq('definition', word, dataMap[word], distractors(word))!;
      qs.push(q);
    }
  }
  return qs;
}

/**
 * Word data for a quiz, cache-first (no AI for words already seen). Words that
 * fail to load are left out; `preloaded` (a shared quiz's snapshot) skips
 * fetching entirely.
 */
export async function loadQuizData(
  words: string[],
  preloaded?: Record<string, MiniWordData>,
): Promise<{ dataMap: Record<string, MiniWordData>; loaded: string[] }> {
  let dataMap: Record<string, MiniWordData>;
  if (preloaded) {
    dataMap = preloaded;
  } else {
    dataMap = {};
    await Promise.all(words.map(async (w) => {
      try {
        const d = await generateWordData(w);
        dataMap[w] = { definition: d.definition, examples: d.examples ?? [], synonyms: d.synonyms, antonyms: d.antonyms };
      } catch { /* skip words we can't load */ }
    }));
  }
  return { dataMap, loaded: words.filter((w) => dataMap[w]) };
}

export function gradeMcq(q: McqQuestion, picked: string): WordResult {
  return { word: q.word, ok: picked === q.word, via: viaFor(q.type) };
}

/**
 * Each pair is graded on its own: a board with one bad link shouldn't mark the
 * other words wrong. 'meaning' — the learner connected the word to its
 * definition, the same question as the notification review.
 */
export function gradeMatch(q: MatchQuestion, links: Record<string, string>): WordResult[] {
  return q.pairs.map((p) => ({ word: p.word, ok: links[p.word] === p.word, via: 'meaning' }));
}

type MarkWord = (word: string, status: WordStatus, userId?: string, mistakes?: number, via?: AnswerVia) => void;

/** Write answered words to progress — the same grades wherever the quiz ran. */
export function recordResults(markWord: MarkWord, results: WordResult[], userId?: string) {
  for (const r of results) markWord(r.word, r.ok ? 'known' : 'skipped', userId, 0, r.via);
}
