// The rules of the Listen page's drills, with no UI: how a dictation is
// graded and how a comprehension clip is scored. The Listen page and the
// world's listening activities both grade through this, and share how a
// recording is split up and voiced.

/** A dictation passes at this accuracy (%). */
export const DICTATION_PASS = 90;

/** Words without punctuation or case — "Well done!" typed as "well done"
 *  still matches; this is a dictation drill, not a punctuation test. */
export function normalizeWords(s: string): string[] {
  return s.toLowerCase().replace(/[.,!?;:"'()]/g, '').trim().split(/\s+/).filter(Boolean);
}

export interface DictationGrade {
  /** The sentence's words, each marked heard right or not. */
  words: { word: string; ok: boolean }[];
  accuracy: number;
  passed: boolean;
}

/**
 * Grade a typed dictation by aligning it with the sentence (longest common
 * subsequence), so one missed or extra word costs that word only — not every
 * word after it. Extra words still count against the score.
 */
export function gradeDictation(sentence: string, typed: string): DictationGrade {
  const target = normalizeWords(sentence);
  const said = normalizeWords(typed);
  const n = target.length, m = said.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = target[i] === said[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ok = new Array<boolean>(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (target[i] === said[j]) { ok[i] = true; i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  const matched = ok.filter(Boolean).length;
  const accuracy = Math.max(n, m) ? Math.round((matched / Math.max(n, m)) * 100) : 0;
  return { words: target.map((word, i) => ({ word, ok: ok[i] })), accuracy, passed: accuracy >= DICTATION_PASS };
}

/** Right answers in a comprehension set; unanswered questions count wrong. */
export function scoreAnswers(questions: { correctIndex: number }[], answers: (number | null)[]): number {
  return questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0);
}

/** A long script as its sentences, so it can be played — and followed — one
 *  sentence at a time. Paragraph breaks end a sentence too. */
export function splitSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((para) => para.match(/[^.!?]+(?:[.!?]+["”’)]*|$)\s*/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
}

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
