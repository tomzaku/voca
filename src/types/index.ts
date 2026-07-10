export interface VocabularyWord {
  word: string;            // stable identity (the English seed) — used for progress/selection
  headword?: string;       // the word to display/guess, in the learn language (falls back to `word`)
  phonetics?: Record<string, string>; // IPA keyed by locale, e.g. { "en-US": "…", "en-GB": "…" }
  partOfSpeech?: string;
  definition: string;
  examples: string[];
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[]; // common natural word pairings (e.g. "make a decision")
  wordFamily?: { word: string; pos: string }[]; // related forms (decide → decision/noun)
  translation?: string; // the word rendered in the user's mother language
  level: 'beginner' | 'intermediate' | 'advanced';
  hints?: string[]; // legacy — no longer shown in UI
  imageKeywords: string[];
}

// A word's learning outcome. Saving (bookmarking) is tracked separately via the
// `bookmarked` flag so a word can be both "known" and "saved" at the same time.
// 'skipped' = couldn't guess it (gave up) — repeats until learned.
// 'dismissed' = the Skip button — "don't show me this word again".
export type WordStatus = 'known' | 'skipped' | 'dismissed';

/** One recorded answer: when it happened and whether it was correct. */
export interface ReviewEvent {
  at: string;   // ISO datetime
  ok: boolean;  // true = answered correctly
}

export interface WordProgress {
  word: string;
  status?: WordStatus;
  bookmarked?: boolean;
  seenAt: string;
  // ── Spaced repetition (FSRS) ── all optional so pre-SRS data still loads.
  reps?: number;          // successful reviews in a row
  lapses?: number;        // times forgotten
  interval?: number;      // days until next due
  stability?: number;     // FSRS memory stability (days to 90% recall)
  difficulty?: number;    // FSRS difficulty, 1..10
  ease?: number;          // legacy SM-2 ease factor (kept so old data round-trips)
  dueAt?: string;         // ISO — when the word should resurface
  lastReviewedAt?: string;
  mastered?: boolean;     // graduated out of active rotation
  views?: number;         // total times reviewed (how many times you've seen it)
  // ── Lifetime answer tally (drives the correct/incorrect chart) ──
  correct?: number;       // rounds solved (or marked "Know it")
  wrong?: number;         // wrong attempts across all rounds, incl. giving up
  // ── Answer log — datetime of each correct/incorrect answer (last 50) ──
  history?: ReviewEvent[];
}
