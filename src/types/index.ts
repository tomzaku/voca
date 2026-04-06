export interface VocabularyWord {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  examples: string[];
  synonyms?: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  hints: string[];
  imageKeywords: string[];
}

export type WordStatus = 'bookmarked' | 'known' | 'skipped';

export interface WordProgress {
  word: string;
  status: WordStatus;
  seenAt: string;
}
