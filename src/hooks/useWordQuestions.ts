import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQuestions, type WordQuestion } from '../lib/questionsApi';

/**
 * Word questions for a world game, from the server (lib/questionsApi): made
 * from the collection you're studying at the moment they're fetched, with
 * the answer sealed until you choose. Fetched when the game opens and again
 * whenever the batch runs out, so a collection you switch to shows up in the
 * next batch. `next()` is null while there are none (still loading, or the
 * server had none to give) — callers carry on without a question.
 */
export function useWordQuestions(batch: number) {
  const queue = useRef<WordQuestion[]>([]);
  const loading = useRef(false);
  const [ready, setReady] = useState(false);

  const refill = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    const got = await fetchQuestions(batch);
    queue.current.push(...got);
    loading.current = false;
    setReady(queue.current.length > 0);
  }, [batch]);

  useEffect(() => { void refill(); }, [refill]);

  const next = useCallback((): WordQuestion | null => {
    const q = queue.current.shift() ?? null;
    if (queue.current.length <= 1) void refill();
    setReady(queue.current.length > 0);
    return q;
  }, [refill]);

  return { next, ready };
}
