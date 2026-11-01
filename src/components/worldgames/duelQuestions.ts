import { buildMcq, loadQuizData, shuffle } from '../../lib/quizEngine';
import { WORD_LIST } from '../../lib/wordService';
import type { DuelQuestion } from '../../lib/wordDuel';
import { doodleKey, lookUpDoodles } from '../../lib/doodles';

/** How long laying out Memory Match waits for doodles before going without. */
const DOODLE_WAIT_MS = 4000;

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

/** Words with a short meaning each, for Memory Match — from the host's own
 *  words where there are enough, the meaning kept to a card's worth. Words
 *  that already have a doodle go first, so more meaning cards are pictures;
 *  the lookup is given a few seconds and never holds the game up. */
export async function memoryWords(wordPool: string[], count: number): Promise<{ word: string; meaning: string }[]> {
  const pool = shuffle(wordPool.length >= count ? wordPool : WORD_LIST.map((w) => w.word)).slice(0, count * 2);
  const { dataMap } = await loadQuizData(pool);
  const out = pool
    .map((w) => {
      const d = dataMap[w];
      const meaning = (d?.definition ?? '').replace(/\s+/g, ' ').trim();
      return meaning ? { word: w, meaning: meaning.length > 70 ? `${meaning.slice(0, 67).trimEnd()}…` : meaning } : null;
    })
    .filter((x): x is { word: string; meaning: string } => !!x);
  const pics = await lookUpDoodles(out.map((w) => w.word), AbortSignal.timeout(DOODLE_WAIT_MS));
  const picked = [...out.filter((w) => pics[doodleKey(w.word)]), ...out.filter((w) => !pics[doodleKey(w.word)])].slice(0, count);
  if (picked.length < 4) throw new Error('not enough words');
  return picked;
}
