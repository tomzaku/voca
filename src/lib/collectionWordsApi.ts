// Client for `ai-collection-words` — Pro generates a collection's word list
// from a topic without the ChatGPT round trip.
//
//   POST /ai-collection-words { topic, count } → { words }
//
// Loud: the user pressed a button and is waiting, so a failure is a toast.

import { request } from './api';
import { AI_TIMEOUT_MS } from './aiProviders';

export async function generateCollectionWords(topic: string, count: number): Promise<string[]> {
  const res = await request.post<{ words: string[] }>('/ai-collection-words', { topic, count }, { timeout: AI_TIMEOUT_MS });
  return res.words;
}
