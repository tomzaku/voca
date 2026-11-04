import { useCallback, useEffect, useRef, useState } from 'react';
import { preloadTts, speakText, stopSpeaking, warmSpeech } from '../lib/tts';

// Playing a two-person script, headless — Daily Dialogue and IELTS Speaking
// on the Speak page, and the world's role-plays at Đông Ba market. A script can be
// listened to with two voices, or role-played: the learner takes one side,
// and playback stops on each of those lines so they say it first.

export type Speaker = 'a' | 'b';
/** `listen` plays everything; a speaker means "I'm playing this side". */
export type Mode = 'listen' | Speaker;

export interface ScriptLine {
  speaker: Speaker;
  text: string;
  voice: string;
}

/** How many lines to fetch ahead of the one playing. */
const WARM_AHEAD = 2;

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'waiting';

/**
 * Plays a script line by line. With `pauseOn`, it stops on that speaker's
 * lines (`waiting`) until `resume()` — the learner says the line first. Each
 * run carries a token so a stop, or a newer run, ends an older loop at its
 * next step even if its last `speakText` never settles.
 */
export function useScriptPlayer(lines: ScriptLine[], pauseOn: Speaker | null, onFinish: () => void) {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [index, setIndex] = useState(-1);
  const runRef = useRef(0);
  const resumeRef = useRef<(() => void) | null>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; });

  const stop = useCallback(() => {
    runRef.current++;
    resumeRef.current?.();
    stopSpeaking();
    setStatus('idle');
    setIndex(-1);
  }, []);

  // A new script or role invalidates whatever was playing.
  useEffect(() => stop, [lines, pauseOn, stop]);

  useEffect(() => {
    const id = setTimeout(() => preloadTts(), 1500);
    return () => clearTimeout(id);
  }, []);

  /** Fetch the next lines this run will read, while line `i` plays — on the
   *  cloud voice each one is otherwise a ~1–3 s round trip when its turn
   *  comes. The learner's own lines are skipped: they say those. */
  const warmAfter = useCallback((i: number) => {
    let ahead = 0;
    for (let j = i + 1; j < lines.length && ahead < WARM_AHEAD; j++) {
      if (pauseOn && lines[j].speaker === pauseOn) continue;
      warmSpeech(lines[j].text, { voice: lines[j].voice });
      ahead++;
    }
  }, [lines, pauseOn]);

  const say = useCallback(async (i: number, token: number) => {
    setIndex(i);
    setStatus('loading');
    await speakText(lines[i].text, {
      voice: lines[i].voice,
      onStart: () => { if (runRef.current === token) setStatus('playing'); },
    }).catch(() => {});
  }, [lines]);

  const playFrom = useCallback(async (from: number) => {
    resumeRef.current?.();
    const token = ++runRef.current;
    for (let i = from; i < lines.length; i++) {
      if (runRef.current !== token) return;
      if (pauseOn && lines[i].speaker === pauseOn) {
        setIndex(i);
        setStatus('waiting');
        await new Promise<void>((r) => { resumeRef.current = r; });
        resumeRef.current = null;
        continue;
      }
      warmAfter(i);
      await say(i, token);
    }
    if (runRef.current !== token) return;
    setStatus('idle');
    setIndex(-1);
    finishRef.current();
  }, [lines, pauseOn, say, warmAfter]);

  /** One line on its own — tapping a bubble. */
  const playLine = useCallback(async (i: number) => {
    resumeRef.current?.();
    const token = ++runRef.current;
    await say(i, token);
    if (runRef.current !== token) return;
    setStatus('idle');
    setIndex(-1);
  }, [say]);

  const resume = useCallback(() => resumeRef.current?.(), []);

  return { status, index, playFrom, playLine, resume, stop, running: status !== 'idle' };
}
export type ScriptPlayer = ReturnType<typeof useScriptPlayer>;
