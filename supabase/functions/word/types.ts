// The shapes the `word` function passes around. Types only — the runtime helpers
// that turn untrusted model output into these live in sanitize.ts.

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface FamilyEntry {
  word: string;
  pos: string;
}

export interface IdiomEntry {
  idiom: string;
  meaning: string; // short plain-English meaning
  example?: string;
}

export interface WordData {
  word?: string;
  phonetics?: Record<string, string>; // keyed by locale, e.g. { "en-US": "…", "en-GB": "…" }
  partOfSpeech?: string;
  definition?: string;
  shortDefinition?: string; // one-liner in simple English — shared with the Pro mind map
  translation?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  wordFamily?: FamilyEntry[]; // related forms across parts of speech
  idioms?: IdiomEntry[]; // popular idioms containing the word (English generation only)
  level?: string;
  imageKeywords?: string[];
}

/** The model's answer when the word it was asked about isn't real. */
export interface Verdict {
  valid: false;
  suggestions: string[]; // what it was likely meant to be, closest first
}

/** A generation either produced word data, or judged the word not to be real. */
export type Generated = WordData | Verdict;
