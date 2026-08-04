// The flash card's picture: the word's doodle, reusing the mind map's
// generation pipeline and its per-word cache (see src/lib/doodles.ts).
//
// Three tiers, cheapest first:
//   1. localStorage — instant, no network, no cost.
//   2. One batched server lookup (`cachedOnly`) — free, never generates.
//   3. Generation — draws every uncached word in the batch as ONE sheet.
//
// Tier 3 always carries the words coming up next, so it fires roughly once
// every DOODLE_SHEET_SIZE cards and the cards in between are cache hits — the
// same trick that makes doodles affordable on the mind map. Nothing here
// blocks the card: the hook returns null until an image exists, so the card
// renders immediately and the doodle fades in whenever it's ready.

import { useEffect, useState } from 'react';
import { DOODLE_BATCH_MAX, doodleKey, fetchDoodles, readLocalDoodle } from '../lib/doodles';
import { pickNextWords } from '../lib/wordService';
import { getPrefetchedData, getPrefetchedWords } from '../lib/prefetchService';
import type { VocabularyWord } from '../types';

/** What the sheet action wants for one word. Sending the definition matters:
 *  without it the sketch is drawn from the bare word and can land on the wrong
 *  sense. Words we haven't loaded yet have none — the server fills those in
 *  from `word_cache` where it can. */
function sheetItem(w: VocabularyWord): { word: string; definition: string } {
  return { word: w.word, definition: w.shortDefinition || w.definition };
}

// Words we've already looked up and found nothing for, so stepping back and
// forth through the history strip doesn't re-run the lookup every time. A
// generated doodle lands in localStorage, and tier 1 runs before this check,
// so a word that later gets drawn still shows up.
const missed = new Set<string>();
// One generation at a time per tab: sheets are the expensive call, and two
// overlapping ones would draw overlapping words.
let generating = false;

/**
 * The doodle for `wordData`, or null while there isn't one (yet or at all).
 *
 * `isPro` gates every network tier, not just generation: the whole
 * `mindmap_doodle_sheet` action is Pro-only server-side, so for anyone else a
 * request could only come back 403. Locally cached doodles still show.
 */
export function useWordDoodle(
  wordData: VocabularyWord | null,
  isPro: boolean,
): string | null {
  const [doodle, setDoodle] = useState<string | null>(null);

  useEffect(() => {
    if (!wordData) {
      setDoodle(null);
      return;
    }
    const key = doodleKey(wordData.word);

    // Tier 1, synchronous: no flash of empty space for a word already drawn.
    const local = readLocalDoodle(key);
    setDoodle(local);
    if (local || !isPro || missed.has(key)) return;

    // The current word plus whatever is already loaded and waiting — all with
    // real definitions, and free to work out (no extra request). Words we hold
    // locally are left out: asking would only send their image back over the
    // wire again, and every slot saved is one the server can fill with a word
    // that actually needs drawing.
    const undrawn = (word: string) => !readLocalDoodle(doodleKey(word));
    const loaded = [
      sheetItem(wordData),
      ...getPrefetchedData()
        .filter((w) => w.word !== wordData.word && undrawn(w.word))
        .map(sheetItem),
    ];

    let cancelled = false;
    void (async () => {
      try {
        // Tier 2: free, so it's worth asking about the queued words too.
        const cached = await fetchDoodles(loaded, { cachedOnly: true });
        if (cancelled) return;
        if (cached[key]) {
          setDoodle(cached[key]);
          return;
        }

        // Tier 3: the paid path. One image costs the same whether it holds 16
        // doodles or 1, so the goal is a FULL sheet. We offer far more
        // candidates than fit (DOODLE_BATCH_MAX) because word selection is
        // driven by learning progress and knows nothing about doodles — plenty
        // of the words it returns already have one. The server drops those and
        // draws the first DOODLE_SHEET_SIZE that don't, so the sheet comes out
        // full instead of nearly empty. Working the candidates out costs a
        // `pick` call, which is why it happens here and not on the free path.
        if (!generating) {
          generating = true;
          try {
            const exclude = new Set([wordData.word, ...getPrefetchedWords()]);
            const upcoming = await pickNextWords(exclude, DOODLE_BATCH_MAX - loaded.length)
              .catch(() => []); // selection failed — still worth drawing this word
            const drawn = await fetchDoodles([
              ...loaded,
              ...upcoming.filter((p) => undrawn(p.word)).map((p) => ({ word: p.word })),
            ]);
            if (!drawn[key]) missed.add(key);
            // A late arrival is dropped on purpose — the user has moved on, and
            // it's cached now, so it's there next time the word comes up.
            if (!cancelled && drawn[key]) setDoodle(drawn[key]);
          } finally {
            generating = false;
          }
        }
      } catch (err) {
        // Offline, rate-limited, or generation failed — the card simply has no
        // picture. Marked as missed so it isn't retried all session.
        missed.add(key);
        console.warn(`[doodle] flash card: ${(err as Error).message}`);
      }
    })();

    return () => { cancelled = true; };
  }, [wordData, isPro]);

  return doodle;
}
