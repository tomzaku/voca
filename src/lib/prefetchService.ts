import { generateWordData, pickNextWord } from './wordService';
import type { VocabularyWord } from '../types';

// ─── Module-level queue (survives re-renders) ────────────────────────

const QUEUE_SIZE = 3;

interface Queued {
  word: string;
  level: VocabularyWord['level'];
  data: VocabularyWord;
}

const queue: Queued[] = [];
const inFlight = new Set<string>(); // words currently being fetched

// ─── Public API ──────────────────────────────────────────────────────

/** Take the next word from the queue. Returns null if queue is empty. */
export function dequeue(): Queued | null {
  return queue.shift() ?? null;
}

/** Words already queued or in-flight — exclude these when picking words elsewhere. */
export function getPrefetchedWords(): Set<string> {
  return new Set([...queue.map((q) => q.word), ...inFlight]);
}

/** Drain and reset everything (e.g. on logout). */
export function clearPrefetchQueue(): void {
  queue.length = 0;
  inFlight.clear();
}

let filling = false;

/**
 * Fill the queue up to QUEUE_SIZE, fetching ONE word at a time. Sequential on
 * purpose: parallel prefetch bursts trip provider rate limits (Gemini free-tier
 * RPM), causing 429s on the word the user is actually waiting for.
 * Safe to call frequently — only a single fill loop runs at a time.
 */
export function fillPrefetchQueue(
  knownWords: Set<string>,
  skippedWords: Set<string>,
  currentWord?: string,
): void {
  if (filling) return;
  filling = true;

  (async () => {
    try {
      while (queue.length + inFlight.size < QUEUE_SIZE) {
        const exclude = new Set<string>(getPrefetchedWords());
        if (currentWord) exclude.add(currentWord);

        const { word, level } = pickNextWord(knownWords, skippedWords, exclude);
        // pickNextWord may return an excluded word when the list is nearly exhausted
        if (exclude.has(word)) break;

        inFlight.add(word);
        try {
          const data = await generateWordData(word, level);
          if (!queue.find((q) => q.word === word)) {
            queue.push({ word, level, data });
          }
        } catch {
          inFlight.delete(word);
          break; // provider trouble — stop prefetching, retry on next fill call
        }
        inFlight.delete(word);
      }
    } finally {
      filling = false;
    }
  })();
}
