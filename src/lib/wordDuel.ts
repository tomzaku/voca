// The word duel's rules, with no UI attached. Two players get the same
// questions — a definition, four words — and answer at their own pace: a
// right answer scores 100, plus up to 50 more the quicker it came; a wrong
// one, or none before the time's up, scores nothing. Most points wins.
// Nothing is written to anyone's progress.

export const DUEL_QUESTIONS = 7;
export const DUEL_SECONDS = 12;

export interface DuelQuestion { word: string; prompt: string; options: string[] }

/** Points for an answer `ms` after the question appeared. */
export function duelPoints(correct: boolean, ms: number): number {
  if (!correct) return 0;
  return 100 + Math.round(50 * Math.max(0, 1 - ms / (DUEL_SECONDS * 1000)));
}

export function duelResult(me: number, them: number): 'won' | 'lost' | 'draw' {
  return me > them ? 'won' : me < them ? 'lost' : 'draw';
}

/** The questions as the other player sent them, or null if they're not
 *  questions: each a prompt and two to six options, the word among them. */
export function parseQuestions(raw: unknown): DuelQuestion[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 12) return null;
  const out: DuelQuestion[] = [];
  for (const q of raw) {
    const { word, prompt, options } = (q ?? {}) as Record<string, unknown>;
    if (typeof word !== 'string' || typeof prompt !== 'string' || !Array.isArray(options)) return null;
    const opts = options.filter((o): o is string => typeof o === 'string').map((o) => o.slice(0, 40));
    if (opts.length < 2 || opts.length > 6 || !opts.includes(word)) return null;
    out.push({ word, prompt: prompt.slice(0, 400), options: opts });
  }
  return out;
}
