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

/**
 * One part of speech of a word, as the client sees it. `senses` on a response
 * lists them all, primary first — and is empty when the word has only one.
 */
export interface Sense {
  partOfSpeech: string;
  phonetics?: Record<string, string>;
  definition: string;
  shortDefinition?: string;
  translation?: string;
  /** Several languages at once — only the backfill asks for these; never sent to clients. */
  translations?: Record<string, string>;
  examples: string[];
}

export interface WordData {
  // The resolved English seed key, used only to store/find the row — the
  // language the search term was actually typed in (English, mother tongue, or
  // learn language) is settled by the same call that produces the rest of this
  // data. Stripped before the response reaches the client.
  seedWord?: string;
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
  // The model's other parts of speech (generation only; see generate.ts).
  otherSenses?: Sense[];
  // Every part of speech, primary first; [] when there's only one. Response only.
  senses?: Sense[];
}

/** The model's answer when the word it was asked about isn't real. */
export interface Verdict {
  valid: false;
  suggestions: string[]; // what it was likely meant to be, closest first
}

/** A generation either produced word data, or judged the word not to be real. */
export type Generated = WordData | Verdict;
