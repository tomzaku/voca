import { buildMcq, loadQuizData, shuffle } from '../../lib/quizEngine';
import { WORD_LIST } from '../../lib/wordService';
import type { DuelQuestion } from '../../lib/wordDuel';

/** Definition questions for a game between two players — a definition, four
 *  words — from the host's own words where there are enough (Word Duel, Word
 *  Caro). A few spare words are tried, as not every word has a definition. */
export async function duelQuestions(wordPool: string[], count: number): Promise<DuelQuestion[]> {
  const pool = shuffle(wordPool.length >= count ? wordPool : WORD_LIST.map((w) => w.word)).slice(0, count * 2);
  const { dataMap } = await loadQuizData(pool);
  const all = WORD_LIST.map((w) => w.word);
  const qs = pool
    .map((w) => dataMap[w] && buildMcq('definition', w, dataMap[w], shuffle(all.filter((x) => x !== w)).slice(0, 3)))
    .filter((q) => !!q)
    .slice(0, count)
    .map((q) => ({ word: q.word, prompt: q.prompt, options: q.options }));
  if (qs.length < 3) throw new Error('not enough questions');
  return qs;
}
