export interface VocabularyWord {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  examples: string[];
  synonyms?: string[];
  antonyms?: string[];
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
