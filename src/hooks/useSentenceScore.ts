import { useCallback, useEffect, useRef, useState } from 'react';
import { canScorePronunciation, scoreSentencePronunciation } from '../lib/pronunciation';
import type { SentenceScore } from '../lib/phonemeScore';

export type SentenceScoreState =
  | { status: 'off' }                       // this device doesn't score (see canScorePronunciation)
  | { status: 'idle' }
  | { status: 'working'; progress: number | null }
  | { status: 'done'; result: SentenceScore }
  | { status: 'too-long' }
  | { status: 'empty' }
  | { status: 'error' };

/**
 * Score a spoken sentence sound by sound, on the device. The caller owns the
 * recording (useVoiceRecorder's `onAudio`) and decides what it should have
 * said — a line to shadow, or a free answer's own transcript.
 *
 * Only the newest call's answer lands: a second try while the first is still
 * scoring would otherwise flash the old result in.
 */
export function useSentenceScore() {
  const enabled = canScorePronunciation();
  const [state, setState] = useState<SentenceScoreState>(enabled ? { status: 'idle' } : { status: 'off' });
  const runRef = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const score = useCallback(async (blob: Blob, text: string) => {
    if (!enabled) return;
    const run = ++runRef.current;
    const live = () => aliveRef.current && run === runRef.current;
    setState({ status: 'working', progress: null });
    try {
      const r = await scoreSentencePronunciation(blob, text, (p) => {
        if (live()) setState({ status: 'working', progress: p });
      });
      if (!live()) return;
      setState(r === 'too-long' ? { status: 'too-long' } : r ? { status: 'done', result: r } : { status: 'empty' });
    } catch (err) {
      console.warn('[voca] sentence scoring failed:', err);
      if (live()) setState({ status: 'error' });
    }
  }, [enabled]);

  const reset = useCallback(() => {
    runRef.current++;
    setState(enabled ? { status: 'idle' } : { status: 'off' });
  }, [enabled]);

  return { state, score, reset };
}
