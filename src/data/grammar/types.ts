export type GrammarLevel = 'A1' | 'A2' | 'B1' | 'B2';

export interface Text { en: string; vi: string }

export type Drill =
  /** Fill the gap: `prompt` contains `___`, `answer` indexes `options`. */
  | { kind: 'choice'; prompt: string; options: string[]; answer: number }
  /** Tap the wrong word: `wrong` is one word of `sentence` (unique in it,
   *  ignoring punctuation), `correct` the whole sentence put right. */
  | { kind: 'error'; sentence: string; wrong: string; correct: string }
  /** Build the sentence: `chunks` in the right order — shuffled for display. */
  | { kind: 'order'; chunks: string[] };

export interface GrammarLesson {
  id: string;
  level: GrammarLevel;
  /** Iconify id for the lesson's tile — a hint at the topic, not decoration. */
  icon: string;
  title: Text;
  /** One line for the course list. */
  summary: Text;
  /** The form, as formula lines — English, since it's the English form.
   *  ` + ` splits a line into the chips the lesson page draws. */
  pattern: string[];
  rule: Text;
  examples: string[];
  /** Why this trips up Vietnamese speakers, and what to watch for. */
  viNote: Text;
  drills: Drill[];
}
