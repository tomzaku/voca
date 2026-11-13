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
//
// `stopOnSilence` ends a recording by itself once you've finished — for
// hands-free turns, where there's no stop button to press (video karaoke).
// It listens to the mic's loudness: the first moments set the room's own
// noise, anything well above it is a voice, and once a voice has been heard a
// long enough quiet stretch stops the recording. If no voice comes at all it
// gives up, and the transcript is empty. `level` is that loudness, 0–1.

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

export interface SilenceStop {
  /** Quiet for this long after a voice has been heard ends the recording. */
  quietMs: number;
  /** No voice at all for this long, and it gives up. */
  noVoiceMs: number;
}

/** How long the start of a recording is taken as the room's own noise. */
const CALIBRATE_MS = 300;
/** A voice is at least this loud (RMS), however quiet the room… */
const MIN_VOICE_RMS = 0.02;
/** …and this many times louder than the room. */
const VOICE_OVER_ROOM = 2.5;
/** Someone who starts singing at once mustn't be taken for the room. */
const MAX_ROOM_RMS = 0.03;

/**
 * `maxMs` is a hard stop, so a forgotten tap can't record forever; a
 * recording can ask for its own with `start({ maxMs })`.
 * `onTranscript` gets the text of each recording (possibly empty).
 */
export function useVoiceRecorder({ maxMs, onTranscript, onAudio, keepAudio = false, stopOnSilence }: {
  maxMs: number;
  onTranscript: (text: string) => void;
  /** The finished recording, as soon as it stops — before the transcript. */
  onAudio?: (blob: Blob) => void;
  keepAudio?: boolean;
  stopOnSilence?: SilenceStop;
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
  /** The mic's loudness while recording, 0–1 (only with `stopOnSilence`). */
  const [level, setLevel] = useState(0);
  const meterRef = useRef<{ ctx: AudioContext; timer: number } | null>(null);
  const silenceRef = useRef(stopOnSilence);
  useEffect(() => { silenceRef.current = stopOnSilence; });
  const stopMeter = useCallback(() => {
    const m = meterRef.current;
    meterRef.current = null;
    if (!m) return;
    clearInterval(m.timer);
    void m.ctx.close();
    if (aliveRef.current) setLevel(0);
  }, []);
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
      stopMeter();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      const l = liveRef.current;
      if (l) { l.recording = false; l.rec?.abort(); }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [stopMeter]);

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
    stopMeter();
    const l = liveRef.current;
    if (l?.recording) { l.recording = false; try { l.rec?.stop(); } catch { /* already stopped */ } }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, [stopMeter]);

  /** Watch the mic's loudness and stop when the voice has ended — see the header. */
  const watchSilence = useCallback((stream: MediaStream, opts: SilenceStop) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      // Started outside a tap (a karaoke turn opens by itself), a browser may
      // hand back a suspended context — silent, so it would hear no voice.
      if (ctx.state !== 'running') void ctx.resume().catch(() => {});
      const buf = new Float32Array(analyser.fftSize);
      const t0 = performance.now();
      let room = 0;
      let voiced = false;
      let quietSince = 0;
      let shown = 0;
      const timer = window.setInterval(() => {
        // Still suspended: it hears nothing, so it decides nothing — the
        // recording's hard stop ends it instead.
        if (ctx.state !== 'running') return;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        const lvl = Math.min(1, rms * 6);
        // Only a visible change re-renders.
        if (Math.abs(lvl - shown) > 0.04) { shown = lvl; setLevel(lvl); }
        if (now - t0 < CALIBRATE_MS) { room = Math.min(MAX_ROOM_RMS, Math.max(room, rms)); return; }
        if (rms > Math.max(MIN_VOICE_RMS, room * VOICE_OVER_ROOM)) {
          voiced = true;
          quietSince = 0;
        } else if (voiced) {
          quietSince ||= now;
          if (now - quietSince >= opts.quietMs) stop();
        } else if (now - t0 >= opts.noVoiceMs) stop();
      }, 50);
      meterRef.current = { ctx, timer };
    } catch { /* no meter — the hard stop still ends it */ }
  }, [stop]);

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

  const start = useCallback(async (opts?: { maxMs?: number }) => {
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
        stopMeter();
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
      stopTimerRef.current = setTimeout(stop, opts?.maxMs ?? maxMs);
      if (silenceRef.current) watchSilence(stream, silenceRef.current);
    } catch (err) {
      if (!aliveRef.current) return;
      console.warn('[voca] microphone unavailable:', err);
      setPhase('denied');
    }
  }, [handleAudio, stop, maxMs, startLive, keepAudio, setUrl, stopMeter, watchSilence]);

  return { phase, modelProgress, live, level, audioUrl, start, stop };
}
