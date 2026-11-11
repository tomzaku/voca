import { useCallback, useEffect, useRef, useState } from 'react';
import { scorePronunciation, type PronunciationResult } from '../lib/pronunciation';
import { stopSpeaking } from '../lib/tts';

export type CheckPhase = 'idle' | 'recording' | 'working' | 'denied' | 'error';

/** A single word is well under this; it's the stop for a forgotten tap. */
const MAX_MS = 4000;

/**
 * Record one try at a word and score its sounds on the device. Not built on
 * useVoiceRecorder: that one exists to produce a transcript (and would load
 * Whisper to get one), while this only needs the audio.
 */
export function usePronunciationCheck(ipas: string[]) {
  const [phase, setPhase] = useState<CheckPhase>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  /** True when the last try produced no usable sound at all. */
  const [empty, setEmpty] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);
  const ipasRef = useRef(ipas);
  useEffect(() => { ipasRef.current = ipas; });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const score = useCallback(async (blob: Blob) => {
    setPhase('working');
    try {
      const r = await scorePronunciation(blob, ipasRef.current, (p) => {
        if (!aliveRef.current) return;
        setProgress(p);
      });
      if (!aliveRef.current) return;
      setProgress(null);
      setResult(r);
      setEmpty(!r);
      setPhase('idle');
    } catch (err) {
      console.warn('[voca] pronunciation scoring failed:', err);
      if (aliveRef.current) { setProgress(null); setPhase('error'); }
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!aliveRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size > 0 && aliveRef.current) void score(blob);
        else if (aliveRef.current) setPhase('idle');
      };
      recorderRef.current = rec;
      rec.start();
      setResult(null);
      setEmpty(false);
      setPhase('recording');
      timerRef.current = setTimeout(stop, MAX_MS);
    } catch (err) {
      console.warn('[voca] microphone unavailable:', err);
      if (aliveRef.current) setPhase('denied');
    }
  }, [score, stop]);

  return { phase, progress, result, empty, start, stop };
}
