import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeBlob } from '../lib/whisperStt';
import { stopSpeaking } from '../lib/tts';

// Record from the microphone and turn it into text, headless. Transcription is
// Whisper running on-device (lib/whisperStt), so it costs no AI credits, sends
// no audio anywhere, and works offline once the model is cached — but that
// model is a ~40MB first download, which is why `modelProgress` is exposed.
// The flash card's Speak game and the world's Cồn Hến stall both record
// through this; each decides what a transcript means.

export type RecorderPhase =
  | 'idle'
  | 'requesting'  // waiting on the microphone permission prompt
  | 'recording'
  | 'thinking'    // decoding + transcribing (may include the model download)
  | 'denied'      // permission refused — a dead end the caller has to explain
  | 'unsupported';

const supported = () =>
  // Both are needed: Safari gates getUserMedia on a secure context, and
  // MediaRecorder is absent on some older mobile browsers even when it isn't.
  typeof MediaRecorder !== 'undefined' && typeof navigator?.mediaDevices !== 'undefined';

/**
 * `maxMs` is a hard stop, so a forgotten tap can't record forever.
 * `onTranscript` gets the text of each recording (possibly empty).
 */
export function useVoiceRecorder({ maxMs, onTranscript }: { maxMs: number; onTranscript: (text: string) => void }) {
  const [phase, setPhase] = useState<RecorderPhase>(() => (supported() ? 'idle' : 'unsupported'));
  const [modelProgress, setModelProgress] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards every setState after an await — callers unmount mid-transcription.
  const aliveRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleAudio = useCallback(async (blob: Blob) => {
    setPhase('thinking');
    try {
      const text = await transcribeBlob(blob, (p) => {
        if (aliveRef.current) setModelProgress(p);
      });
      if (!aliveRef.current) return;
      setPhase('idle');
      onTranscriptRef.current(text);
    } catch (err) {
      if (!aliveRef.current) return;
      console.warn('[voca] transcription failed:', err);
      setPhase('idle');
      onTranscriptRef.current('');
    }
  }, []);

  const stop = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    // Don't record our own read-aloud.
    stopSpeaking();
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // Release the mic immediately — a live indicator lingering after the
        // recording is over is alarming, and rightly so.
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size > 0) void handleAudio(blob);
        else if (aliveRef.current) setPhase('idle');
      };
      recorder.start();
      setPhase('recording');
      stopTimerRef.current = setTimeout(stop, maxMs);
    } catch (err) {
      if (!aliveRef.current) return;
      console.warn('[voca] microphone unavailable:', err);
      setPhase('denied');
    }
  }, [handleAudio, stop, maxMs]);

  return { phase, modelProgress, start, stop };
}
