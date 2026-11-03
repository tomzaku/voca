import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQuestions, type WordQuestion } from '../lib/questionsApi';
import { useCollections } from './useCollections';

/**
 * Word questions for a world game, from the server (lib/questionsApi): made
 * from the collection you're studying at the moment they're fetched, with
 * the answer sealed until you choose. Fetched when the game opens and again
 * whenever the batch runs out. Switching collections (say from a question
 * that was too hard) throws the queued ones away, so the next question is
 * already from the new list. `next()` is null while there are none (still
 * loading, or the server had none to give) — callers carry on without a
 * question.
 */
export function useWordQuestions(batch: number) {
  const queue = useRef<WordQuestion[]>([]);
  const loading = useRef(false);
  // Bumped on a switch: a fetch still in flight from the old list is dropped.
  const generation = useRef(0);
  const [ready, setReady] = useState(false);
  const activeId = useCollections((s) => s.activeId);

  const refill = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    let got: WordQuestion[];
    let gen: number;
    // Fetched again if the list changed while this one was on its way.
    do {
      gen = generation.current;
      got = await fetchQuestions(batch);
    } while (gen !== generation.current);
    loading.current = false;
    queue.current.push(...got);
    setReady(queue.current.length > 0);
  }, [batch]);

  useEffect(() => {
    generation.current += 1;
    queue.current = [];
    void refill();
  }, [refill, activeId]);

  const next = useCallback((): WordQuestion | null => {
    const q = queue.current.shift() ?? null;
    if (queue.current.length <= 1) void refill();
    setReady(queue.current.length > 0);
    return q;
  }, [refill]);

  return { next, ready };
}
