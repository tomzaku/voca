import { useCallback, useEffect, useRef, useState } from 'react';
import { FATAL_ERRORS, joinResults, liveRecognition, type LiveRecognition } from '../lib/liveSpeech';
import { transcribeBlob } from '../lib/whisperStt';
import { stopSpeaking } from '../lib/tts';

// Record from the microphone and turn it into text, headless. Where the
// browser can recognise speech itself (Chrome, Edge, Safari — lib/liveSpeech)
// that's what does it: the words show as you say them (`live`) and the
// answer is there the moment you stop. Otherwise — Firefox, or a browser that
// has the API but can't reach its service (Brave) — the recording goes to
// Whisper on the device (lib/whisperStt): free, private and offline once
// cached, but a ~40MB first download (`modelProgress`) and nothing to see
// until you stop. The audio is always recorded, so a live recogniser that
// fails mid-answer still leaves Whisper something to work on.
// The flash card's Speak game, the world's chè stall, Shadowing and the
// speaking page's answers record through this; each decides what a transcript
// means. `keepAudio` also hands back the recording itself (`audioUrl`), for
// hearing yourself.

export type RecorderPhase =
  | 'idle'
  | 'requesting'  // waiting on the microphone permission prompt
  | 'recording'
  | 'thinking'    // decoding + transcribing (may include the model download)
  | 'denied'      // permission refused — a dead end the caller has to explain
  | 'unsupported';

/** Sessions in a row that may end without hearing a word before we stop
 *  restarting — a silent pause ends one every few seconds, so this allows a
 *  long think without spinning forever on a recogniser that's broken. */
const MAX_MISSES = 12;

const supported = () =>
  // Both are needed: Safari gates getUserMedia on a secure context, and
  // MediaRecorder is absent on some older mobile browsers even when it isn't.
  typeof MediaRecorder !== 'undefined' && typeof navigator?.mediaDevices !== 'undefined';

/**
 * `maxMs` is a hard stop, so a forgotten tap can't record forever.
 * `onTranscript` gets the text of each recording (possibly empty).
 */
export function useVoiceRecorder({ maxMs, onTranscript, onAudio, keepAudio = false }: {
  maxMs: number;
  onTranscript: (text: string) => void;
  /** The finished recording, as soon as it stops — before the transcript. */
  onAudio?: (blob: Blob) => void;
  keepAudio?: boolean;
}) {
  const [phase, setPhase] = useState<RecorderPhase>(() => (supported() ? 'idle' : 'unsupported'));
  /** The last recording, playable (only with `keepAudio`); revoked when replaced. */
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const setUrl = useCallback((url: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setAudioUrl(url);
  }, []);
  const [modelProgress, setModelProgress] = useState(0);
  /** What the live recogniser has heard so far ('' without one). */
  const [live, setLive] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The live recogniser for this recording: what it heard, whether it broke,
  // and a promise that settles once it has delivered its last words.
  const liveRef = useRef<{ rec: LiveRecognition | null; text: string; failed: boolean; ended: Promise<void>; recording: boolean } | null>(null);
  // Guards every setState after an await — callers unmount mid-transcription.
  const aliveRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);
  const onAudioRef = useRef(onAudio);
  useEffect(() => { onTranscriptRef.current = onTranscript; onAudioRef.current = onAudio; });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      const l = liveRef.current;
      if (l) { l.recording = false; l.rec?.abort(); }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const handleAudio = useCallback(async (blob: Blob) => {
    setPhase('thinking');
    // The live recogniser heard it: its last words arrive just after stop().
    const l = liveRef.current;
    liveRef.current = null;
    if (l && !l.failed) {
      await Promise.race([l.ended, new Promise((r) => setTimeout(r, 2000))]);
      if (!l.failed) {
        if (!aliveRef.current) return;
        setPhase('idle');
        onTranscriptRef.current(l.text);
        return;
      }
    }
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
    const l = liveRef.current;
    if (l?.recording) { l.recording = false; try { l.rec?.stop(); } catch { /* already stopped */ } }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  /** Start the browser's recogniser alongside the recording, if it has one.
   *  A recogniser session doesn't last a whole answer: Chrome ends one after
   *  a pause or about a minute, and may close it with a `network` error. So
   *  while we're still recording, each ending starts a fresh one (the same
   *  object won't always restart), keeping what was heard so far. Only when
   *  that keeps failing — or the browser says no for good — is it marked
   *  failed, and Whisper transcribes the whole recording instead; giving up
   *  quietly used to freeze the words mid-answer and drop the rest. */
  const startLive = useCallback(() => {
    const Rec = liveRecognition();
    if (!Rec) return;
    let done = () => {};
    const l: { rec: LiveRecognition | null; text: string; failed: boolean; recording: boolean; ended: Promise<void> } = {
      rec: null, text: '', failed: false, recording: true, ended: new Promise<void>((r) => { done = r; }),
    };
    // What earlier sessions heard: each new one starts its own result list.
    let before = '';
    // Restarts in a row with nothing heard between them.
    let misses = 0;

    const listen = (): boolean => {
      let rec: LiveRecognition;
      try { rec = new Rec(); } catch { return false; }
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        misses = 0;
        l.text = [before, joinResults(e.results)].filter(Boolean).join(' ');
        if (aliveRef.current) setLive(l.text);
      };
      rec.onerror = (e) => { if (FATAL_ERRORS.has(e.error)) l.failed = true; };
      rec.onend = () => {
        if (l.rec !== rec) return;
        if (l.recording && !l.failed) {
          before = l.text;
          if (misses++ < MAX_MISSES) {
            // A beat before the next session: an immediate start can be refused.
            setTimeout(() => {
              if (!l.recording) { done(); return; }
              if (!listen()) { l.failed = true; done(); }
            }, misses > 1 ? 300 : 0);
            return;
          }
          l.failed = true;
        }
        done();
      };
      try { rec.start(); } catch { return false; }
      l.rec = rec;
      return true;
    };
    if (listen()) liveRef.current = l;
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
        if (keepAudio && blob.size > 0 && aliveRef.current) setUrl(URL.createObjectURL(blob));
        if (blob.size > 0 && aliveRef.current) onAudioRef.current?.(blob);
        if (blob.size > 0) void handleAudio(blob);
        else if (aliveRef.current) setPhase('idle');
      };
      recorder.start();
      setLive('');
      if (keepAudio) setUrl(null);
      startLive();
      setPhase('recording');
      stopTimerRef.current = setTimeout(stop, maxMs);
    } catch (err) {
      if (!aliveRef.current) return;
      console.warn('[voca] microphone unavailable:', err);
      setPhase('denied');
    }
  }, [handleAudio, stop, maxMs, startLive, keepAudio, setUrl]);

  return { phase, modelProgress, live, audioUrl, start, stop };
}
