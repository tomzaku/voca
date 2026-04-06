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

/**
 * Start filling the queue up to QUEUE_SIZE in parallel.
 * Safe to call frequently — skips if already at capacity.
 */
export function fillPrefetchQueue(
  knownWords: Set<string>,
  skippedWords: Set<string>,
  currentWord?: string,
): void {
  const needed = QUEUE_SIZE - queue.length - inFlight.size;
  if (needed <= 0) return;

  // Build exclusion set: current word + already queued/in-flight
  const exclude = new Set<string>(getPrefetchedWords());
  if (currentWord) exclude.add(currentWord);

  for (let i = 0; i < needed; i++) {
    const { word, level } = pickNextWord(knownWords, skippedWords, exclude);

    // pickNextWord may return a word already excluded when the list is nearly exhausted
    if (exclude.has(word)) break;
    exclude.add(word);
    inFlight.add(word);

    generateWordData(word, level)
      .then((data) => {
        inFlight.delete(word);
        // Guard against duplicates from concurrent calls
        if (!queue.find((q) => q.word === word)) {
          queue.push({ word, level, data });
        }
      })
      .catch(() => {
        inFlight.delete(word);
      });
  }
}
