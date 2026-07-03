export interface VocabularyWord {
  word: string;            // stable identity (the English seed) — used for progress/selection
  headword?: string;       // the word to display/guess, in the learn language (falls back to `word`)
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  examples: string[];
  synonyms?: string[];
  antonyms?: string[];
  translation?: string; // the word rendered in the user's mother language
  level: 'beginner' | 'intermediate' | 'advanced';
  hints?: string[]; // legacy — no longer shown in UI
  imageKeywords: string[];
}

// A word's learning outcome. Saving (bookmarking) is tracked separately via the
// `bookmarked` flag so a word can be both "known" and "saved" at the same time.
export type WordStatus = 'known' | 'skipped';

export interface WordProgress {
  word: string;
  status?: WordStatus;
  bookmarked?: boolean;
  seenAt: string;
  // ── Spaced repetition (SM-2-lite) ── all optional so pre-SRS data still loads.
  reps?: number;          // successful reviews in a row
  lapses?: number;        // times forgotten
  interval?: number;      // days until next due
  ease?: number;          // SM-2 ease factor (default 2.5)
  dueAt?: string;         // ISO — when the word should resurface
  lastReviewedAt?: string;
  mastered?: boolean;     // graduated out of active rotation
  views?: number;         // total times reviewed (how many times you've seen it)
}
