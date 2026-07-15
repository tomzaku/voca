import { generateWordData, pickNextWords } from './wordService';
import type { VocabularyWord } from '../types';

// ─── Module-level queue (survives re-renders) ────────────────────────

const QUEUE_SIZE = 3;

interface Queued {
  word: string;
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
 * Fill the queue up to QUEUE_SIZE. The words are picked in ONE batch (a single
 * server-side `pick` call against synced progress, local fallback), then their
 * data is fetched one at a time — sequential on purpose: parallel prefetch
 * bursts trip provider rate limits (Gemini free-tier RPM), causing 429s on the
 * word the user is actually waiting for.
 * Safe to call frequently — only a single fill loop runs at a time.
 * (The known/skipped sets are unused since selection reads the progress store,
 * but the signature is kept for the existing call sites.)
 */
export function fillPrefetchQueue(
  _knownWords: Set<string>,
  _skippedWords: Set<string>,
  currentWord?: string,
): void {
  if (filling) return;
  filling = true;

  (async () => {
    try {
      const need = QUEUE_SIZE - queue.length - inFlight.size;
      if (need <= 0) return;

      const exclude = new Set<string>(getPrefetchedWords());
      if (currentWord) exclude.add(currentWord);
      const picks = await pickNextWords(exclude, need);

      for (const { word } of picks) {
        if (exclude.has(word)) continue; // near-exhausted list may repeat
        inFlight.add(word);
        try {
          const data = await generateWordData(word);
          if (!queue.find((q) => q.word === word)) {
            queue.push({ word, data });
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
