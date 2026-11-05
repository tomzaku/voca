import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findEpisodeAudio, lineAt, type EpisodeAudio } from '../lib/podcastAudio';
import { getTtsSpeed, getTtsVoice } from './useTtsSettings';
import { recordedFolder, stopSpeaking } from '../lib/tts';
import { useScriptPlayer, type ScriptLine } from './useScriptPlayer';

// A podcast episode played from its one-file recording (lib/podcastAudio):
// streamed start to finish with no gap between sentences, while the timed
// transcript says which sentence to light up — and tapping a sentence seeks
// to it. `audio` stays null until a recording is found, and for good when
// there isn't one (or this device reads in another voice); the caller then
// plays sentence by sentence with useScriptPlayer, as before.
//
// Its own <audio> element, not tts.ts's shared one: an episode is minutes
// long and seeks, and every Play is a tap, so iOS lets it start.

export function useEpisodePlayer(sentences: string[], onFinish: () => void) {
  // Remembered with the sentences it's for, so another script never plays it.
  const [found, setFound] = useState<{ for: string[]; audio: EpisodeAudio | null } | null>(null);
  const audio = found?.for === sentences ? found.audio : null;
  const [index, setIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);
  const elRef = useRef<HTMLAudioElement | null>(null);
  // Where a one-sentence play (playLine) pauses; null plays on to the end.
  const untilRef = useRef<number | null>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; });

  useEffect(() => {
    const folder = recordedFolder();
    if (!folder) return;
    const ctrl = new AbortController();
    void findEpisodeAudio(sentences, folder, ctrl.signal).then((a) => {
      if (!ctrl.signal.aborted) setFound({ for: sentences, audio: a });
    });
    return () => ctrl.abort();
  }, [sentences]);

  // Follow the playhead every frame while playing: timeupdate alone fires a
  // few times a second, and the highlight would trail the voice.
  useEffect(() => {
    const el = elRef.current;
    if (!running || !el || !audio) return;
    let frame = 0;
    const tick = () => {
      if (untilRef.current !== null && el.currentTime >= untilRef.current) {
        untilRef.current = null;
        el.pause();
        setRunning(false);
        setIndex(-1);
        return;
      }
      setIndex(lineAt(audio.lines, el.currentTime));
      setTime(Math.floor(el.currentTime * 4) / 4);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [running, audio]);

  const element = useCallback(() => {
    if (elRef.current) return elRef.current;
    const el = new Audio();
    el.preload = 'auto';
    el.onended = () => {
      // The last sentence tapped on its own isn't the episode played through.
      const single = untilRef.current !== null;
      untilRef.current = null;
      setRunning(false);
      setIndex(-1);
      setTime(0);
      if (!single) finishRef.current();
    };
    // Paused from outside — a call, the lock-screen control.
    el.onpause = () => { if (!el.ended) setRunning(false); };
    el.onplay = () => setRunning(true);
    return elRef.current = el;
  }, []);

  /** Jump to `seconds` and play from there. */
  const playAt = useCallback((seconds: number, until: number | null = null) => {
    if (!audio) return;
    untilRef.current = until;
    stopSpeaking();
    const el = element();
    if (el.src !== audio.src) el.src = audio.src;
    // Seeking before the file's length is known is ignored on iOS.
    if (el.readyState >= 1) el.currentTime = seconds;
    else el.addEventListener('loadedmetadata', () => { el.currentTime = seconds; }, { once: true });
    el.defaultPlaybackRate = el.playbackRate = getTtsSpeed();
    setIndex(lineAt(audio.lines, seconds));
    setTime(seconds);
    setRunning(true);
    // Synchronously inside the tap, so iOS allows it.
    el.play().catch(() => setRunning(false));
  }, [audio, element]);

  const playFrom = useCallback((i: number) => playAt(audio?.lines[i]?.start ?? 0), [audio, playAt]);

  /** Sentence `i` on its own, then pause. */
  const playLine = useCallback((i: number) => {
    const line = audio?.lines[i];
    if (line) playAt(line.start, line.end);
  }, [audio, playAt]);

  const stop = useCallback(() => {
    untilRef.current = null;
    elRef.current?.pause();
    setRunning(false);
    setIndex(-1);
  }, []);

  // Leaving the episode ends it.
  useEffect(() => () => {
    const el = elRef.current;
    if (!el) return;
    el.onpause = el.onended = el.onplay = null;
    el.pause();
    el.removeAttribute('src');
    el.load();
  }, []);

  return { audio, index, running, time, playFrom, playLine, playAt: (seconds: number) => playAt(seconds), stop };
}

/**
 * A podcast's sentences, played from the episode's recording when there is
 * one and read sentence by sentence (useScriptPlayer) when there isn't — one
 * player either way, for the world's theatre and the Listen page alike.
 */
export function usePodcastPlayer(sentences: string[], onFinish: () => void) {
  const lines = useMemo<ScriptLine[]>(() => {
    const voice = getTtsVoice();
    return sentences.map((text) => ({ speaker: 'a', text, voice }));
  }, [sentences]);
  const script = useScriptPlayer(lines, null, onFinish);
  const episode = useEpisodePlayer(sentences, onFinish);
  // The recording once it's found — unless Play was pressed before it was,
  // and that sentence-by-sentence read is still going.
  const recorded = episode.audio && !script.running ? episode.audio : null;
  const active = recorded ? episode : script;
  return {
    recorded,
    index: active.index,
    running: active.running,
    /** Waiting for a sentence's audio; a recording streams, so never. */
    loading: !recorded && script.status === 'loading',
    time: episode.time,
    playFrom: (i: number) => void active.playFrom(i),
    /** Just sentence `i`, then stop — tapping a sentence. */
    playLine: (i: number) => void active.playLine(i),
    playAt: episode.playAt,
    stop: active.stop,
  };
}
