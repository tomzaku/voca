// The quiz's shareable configuration. Questions are *built from* a QuizConfig,
// so a config fully describes a quiz's setup (which words, which question types,
// when answers show, any time limit) — the unit we can later encode into a
// link/code to share a quiz with others.

export type QuestionType = 'definition' | 'sentence' | 'listen' | 'match';

/** All types, in display order. */
export const QUESTION_TYPES: QuestionType[] = ['definition', 'sentence', 'listen', 'match'];

export const QUESTION_TYPE_META: Record<QuestionType, { label: string; hint: string; ask: string }> = {
  definition: { label: 'Definition', hint: 'Match a meaning to its word', ask: 'Which word matches this definition?' },
  sentence: { label: 'Sentence', hint: 'Fill the blank in a sentence', ask: 'Which word completes this sentence?' },
  listen: { label: 'Listen', hint: 'Hear a word and pick it', ask: 'Which word did you hear?' },
  match: { label: 'Match', hint: 'Connect 3–5 words to meanings', ask: 'Connect each word to its meaning' },
};

/** When correct answers are shown: after each question, or all at the end. */
export type RevealMode = 'each' | 'end';

/** Suggested seconds per word — the basis for the auto time limit. */
export const SECONDS_PER_WORD = 20;

export interface QuizConfig {
  /** Schema version, so shared codes stay readable as the format evolves. */
  version: 1;
  /** The words the quiz draws from. */
  words: string[];
  /** Which question types are in play — questions are a random mix of these. */
  types: QuestionType[];
  /** Reveal answers after each question, or all at the end on the results screen. */
  reveal: RevealMode;
  /** Total time limit in seconds for the whole quiz (0 = untimed). */
  durationSec: number;
}

export function makeQuizConfig(
  words: string[],
  types: QuestionType[],
  reveal: RevealMode,
  durationSec: number,
): QuizConfig {
  return { version: 1, words, types, reveal, durationSec };
}

/** Compact, URL-safe encoding of a config — the seed of "share this quiz". */
export function encodeQuizConfig(config: QuizConfig): string {
  const json = JSON.stringify(config);
  // UTF-8 safe base64, then made URL-safe.
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Parse a code produced by encodeQuizConfig. Returns null on anything invalid.
 *  Missing newer fields fall back to sensible defaults for forward-compat. */
export function decodeQuizConfig(code: string): QuizConfig | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json) as Partial<QuizConfig>;
    if (
      parsed?.version !== 1 ||
      !Array.isArray(parsed.words) ||
      !Array.isArray(parsed.types) ||
      !parsed.words.every((w) => typeof w === 'string') ||
      !parsed.types.every((t) => (QUESTION_TYPES as string[]).includes(t))
    ) {
      return null;
    }
    return {
      version: 1,
      words: parsed.words,
      types: parsed.types,
      reveal: parsed.reveal === 'each' ? 'each' : 'end',
      durationSec: typeof parsed.durationSec === 'number' && parsed.durationSec > 0 ? parsed.durationSec : 0,
    };
  } catch {
    return null;
  }
}
