// The rules of the Listen page's drills, with no UI: how a dictation is
// graded and how a comprehension clip is scored. The Listen page and the
// world's listening activities both grade through this, and share how a
// recording is split up and voiced.

import { numberWords, ordinalWords } from './spokenNumbers';

/** A dictation passes at this accuracy (%). */
export const DICTATION_PASS = 90;

/** Words without punctuation or case — "Well done!" typed as "well done"
 *  still matches; this is a dictation drill, not a punctuation test. */
export function normalizeWords(s: string): string[] {
  // Curly quotes too: captions write "it’s", recognisers "it's".
  return s.toLowerCase().replace(/[.,!?;:"'()‘’“”]/g, '').trim().split(/\s+/).filter(Boolean);
}

/** Spellings that are the same spoken word. */
const ALIASES: Record<string, string> = { ok: 'okay', mr: 'mister', vs: 'versus' };

/**
 * One written word as the words it's *said* as. Speech recognition writes
 * "three" as "3" and "twenty-five" as "25" — and a learner typing a dictation
 * may do either — so both sides are compared in spoken form.
 */
function spokenForms(token: string): string[] {
  if (ALIASES[token]) return [ALIASES[token]];
  const ord = token.match(/^(\d+)(st|nd|rd|th)$/);
  if (ord) return ordinalWords(Number(ord[1]));
  if (/^\d+$/.test(token) && token.length <= 12) return numberWords(Number(token));
  // "3:30", "4pm", "twenty-five": split letters from digits and on hyphens.
  const parts = token.split(/-|(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)/).filter(Boolean);
  return parts.length > 1 ? parts.flatMap(spokenForms) : [token];
}

/** The text as display words, each with the spoken words it compares as. */
function tokenize(s: string): { word: string; spoken: string[] }[] {
  const prepared = s.toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, '$1')        // 1,000 → 1000
    .replace(/(\d)\.(\d)/g, '$1 point $2')       // 3.5 → 3 point 5
    .replace(/(\d):(\d)/g, '$1 $2')               // 3:30 → 3 30
    .replace(/%/g, ' percent');
  return normalizeWords(prepared).map((word) => ({ word, spoken: spokenForms(word) }));
}

export interface DictationGrade {
  /** The sentence's words, each marked heard right or not. */
  words: { word: string; ok: boolean }[];
  accuracy: number;
  passed: boolean;
}

/**
 * Grade a typed (or spoken) dictation by aligning it with the sentence
 * (longest common subsequence), so one missed or extra word costs that word
 * only — not every word after it. Extra words still count against the score.
 *
 * Alignment runs on spoken forms ("25" → twenty five), so a number written as
 * digits on one side and words on the other still matches; a sentence word is
 * right when every word it's said as was heard.
 */
export function gradeDictation(sentence: string, typed: string): DictationGrade {
  const targetWords = tokenize(sentence);
  const target = targetWords.flatMap((w, i) => w.spoken.map((s) => ({ s, i })));
  const said = tokenize(typed).flatMap((w) => w.spoken);
  const n = target.length, m = said.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = target[i].s === said[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ok = new Array<boolean>(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (target[i].s === said[j]) { ok[i] = true; i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  const matched = ok.filter(Boolean).length;
  const accuracy = Math.max(n, m) ? Math.round((matched / Math.max(n, m)) * 100) : 0;
  const words = targetWords.map(({ word }, wi) => ({
    word,
    ok: target.every((t, ti) => t.i !== wi || ok[ti]),
  }));
  return { words, accuracy, passed: accuracy >= DICTATION_PASS };
}

/** Right answers in a comprehension set; unanswered questions count wrong. */
export function scoreAnswers(questions: { correctIndex: number }[], answers: (number | null)[]): number {
  return questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0);
}

// splitSentences lives with the rest of how speech is cut (speechChunks), so
// the podcast recorder splits a script exactly as the player does.
export { splitSentences } from './speechChunks';

/** One voice per speaker, handed out from `pool` in the order speakers first
 *  speak — so each keeps the same voice for the whole recording, however
 *  many there are. */
export function assignVoices(speakers: string[], pool: readonly string[]): Record<string, string> {
  const voice: Record<string, string> = {};
  let n = 0;
  for (const s of speakers) {
    if (!(s in voice)) voice[s] = pool[n++ % pool.length];
  }
  return voice;
}
