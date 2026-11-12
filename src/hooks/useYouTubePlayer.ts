import { useCallback, useEffect, useRef, useState } from 'react';

// A YouTube video in an element of the page, driven by the IFrame Player API:
// play one stretch of it and stop at its end (a line to shadow), and report
// the time as it plays. The API script is loaded once, on first use.
//
// Stopping at a line's end is polled, not scheduled: the player's clock is
// only readable by asking, and a timer set from the start would drift with
// buffering and playback rate.

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: {
    videoId: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: () => void;
      onStateChange?: (e: { data: number }) => void;
      onError?: (e: { data: number }) => void;
    };
  }) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
const TICK_MS = 80;

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => { apiPromise = null; reject(new Error('YouTube player could not load')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

export type PlayerStatus = 'loading' | 'ready' | 'error';

export function useYouTubePlayer(videoId: string | null, { onTick, onSegmentEnd, onPlay }: {
  /** Every ~80ms while it plays, with the time in seconds. */
  onTick?: (t: number) => void;
  /** A segment from playSegment reached its end and paused there. */
  onSegmentEnd?: () => void;
  /** Playing started — from here or from the player's own controls. */
  onPlay?: (t: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [playing, setPlaying] = useState(false);
  const stopAtRef = useRef<number | null>(null);
  // Latest callbacks, so the player's listeners (bound once) never go stale.
  const cb = useRef({ onTick, onSegmentEnd, onPlay });
  useEffect(() => { cb.current = { onTick, onSegmentEnd, onPlay }; });

  useEffect(() => {
    if (!videoId || !hostRef.current) return;
    let cancelled = false;
    // Status isn't reset here for a new id: the caller keys its component by
    // video, so a new video is a fresh hook starting at 'loading'.
    // The API replaces the element it's given; give it a child so React's own
    // node stays put.
    const mount = document.createElement('div');
    hostRef.current.appendChild(mount);
    // The object comes back at once, but its methods (setPlaybackRate,
    // seekTo…) are only attached when it's ready — so it's handed to the rest
    // of the hook then, and every call before that is a no-op.
    let instance: YTPlayer | null = null;
    loadApi().then((YT) => {
      if (cancelled) return;
      instance = new YT.Player(mount, {
        videoId,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = instance;
            setStatus('ready');
          },
          onError: () => { if (!cancelled) setStatus('error'); },
          onStateChange: (e) => {
            if (cancelled) return;
            const on = e.data === PLAYING;
            setPlaying(on);
            if (on) cb.current.onPlay?.(playerRef.current?.getCurrentTime() ?? 0);
          },
        },
      });
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => {
      cancelled = true;
      stopAtRef.current = null;
      try { instance?.destroy(); } catch { /* already gone, or never ready */ }
      playerRef.current = null;
      mount.remove();
    };
  }, [videoId]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const t = p.getCurrentTime();
      const stopAt = stopAtRef.current;
      if (stopAt !== null && t >= stopAt) {
        stopAtRef.current = null;
        p.pauseVideo();
        cb.current.onSegmentEnd?.();
        // Not a tick: the stop lands a hair into the next line, and the
        // line just played should stay the current one.
        return;
      }
      cb.current.onTick?.(t);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  /** Play from `start` and pause at `end` (or play on, with no end). */
  const playSegment = useCallback((start: number, end: number | null) => {
    const p = playerRef.current;
    if (!p) return;
    stopAtRef.current = end;
    p.seekTo(Math.max(0, start), true);
    p.playVideo();
  }, []);

  /** Keep playing from here, pausing at `end` if given. */
  const resume = useCallback((end: number | null) => {
    stopAtRef.current = end;
    playerRef.current?.playVideo();
  }, []);

  /** Set where an already-playing video should stop (null: don't). */
  const stopAt = useCallback((end: number | null) => { stopAtRef.current = end; }, []);
  const hasStop = useCallback(() => stopAtRef.current !== null, []);

  const pause = useCallback(() => {
    stopAtRef.current = null;
    playerRef.current?.pauseVideo();
  }, []);

  const setRate = useCallback((rate: number) => { playerRef.current?.setPlaybackRate(rate); }, []);
  const time = useCallback(() => playerRef.current?.getCurrentTime() ?? 0, []);

  return { hostRef, status, playing, playSegment, resume, stopAt, hasStop, pause, setRate, time };
}
