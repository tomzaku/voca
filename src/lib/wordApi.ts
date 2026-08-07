// Word-data client. Talks to the cache-first `word` edge function, which returns
// a ready vocabulary object (usually from the shared cache, no AI). Kept separate
// from the AI action client (aiProviders.ts) because this is a data lookup that
// only sometimes generates.

import { request } from './api';
import type { VocabularyWord } from '../types';

export interface WordDataParams {
  word: string;
  learnLang: string;
  motherLang: string;
}

/**
 * One shape either way: `word` is null when the lookup isn't a real word, and
 * `suggestions` carries the "did you mean" spellings — empty on a hit.
 */
export interface WordDataResult {
  word: VocabularyWord | null;
  suggestions: string[];
}

/** Generation can take a while, and the caller may cancel it. */
const TIMEOUT_MS = 60_000;

/** Throws ApiError with the server's message — a failed lookup is worth showing. */
export function fetchWordData(
  params: WordDataParams,
  signal?: AbortSignal,
): Promise<WordDataResult> {
  return request.post<WordDataResult>('/word', params, { signal, timeout: TIMEOUT_MS });
}
