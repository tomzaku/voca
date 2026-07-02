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
}
