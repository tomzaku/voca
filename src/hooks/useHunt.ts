// A student's side of a treasure hunt, for whichever screen is showing it —
// the classroom page (/hunt/:code) or the world's HUD. Holds this device's
// token, keeps the team's state fresh by polling, and carries the three
// things a student does: join, find a station, answer.
//
// Polling rather than a realtime channel: a class is a few dozen phones and a
// race moves in steps of seconds, so a GET every few seconds is plenty, and it
// needs no subscription to clean up when a phone sleeps.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import {
  fetchHuntImage,
  fetchPlay,
  forgetHunt,
  huntToken,
  joinHunt,
  reportFound,
  saveHuntToken,
  submitAnswer,
  type FoundResult,
  type Play,
} from '../lib/huntsApi';

const POLL_MS = 3000;
/** Slower once the race is over — only a late finish can still change it. */
const POLL_OVER_MS = 15000;

export type Feedback =
  | { kind: 'correct' | 'wrong'; at: number }
  | { kind: 'found'; result: FoundResult; at: number };

export interface HuntHandle {
  token: string | null;
  play: Play | null;
  /** Server clock minus device clock — pass to secondsUntil. */
  skewMs: number;
  /** The first load hasn't come back yet. */
  loading: boolean;
  error: string | null;
  busy: boolean;
  feedback: Feedback | null;
  join: (name: string) => Promise<boolean>;
  found: (card: string) => Promise<FoundResult | null>;
  answer: (text: string | string[]) => Promise<boolean | null>;
  /** A picture question's picture — fetched once, then kept for the page's life. */
  image: (key: string) => Promise<string>;
  leave: () => void;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function useHunt(code: string | null): HuntHandle {
  const [token, setToken] = useState<string | null>(() => (code ? huntToken(code) : null));
  const [play, setPlayState] = useState<Play | null>(null);
  // How far the server's clock is ahead of this device's, for countdowns.
  const [skewMs, setSkewMs] = useState(0);
  const setPlay = useCallback((p: Play | null) => {
    setPlayState(p);
    if (p) setSkewMs(Date.parse(p.serverTime) - Date.now());
  }, []);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const over = play?.outcome.over ?? false;

  // A new code (the world switching hunts) is a different student entirely.
  const lastCode = useRef(code);
  useEffect(() => {
    if (lastCode.current === code) return;
    lastCode.current = code;
    const t = code ? huntToken(code) : null;
    setToken(t);
    setPlay(null);
    setLoading(Boolean(t));
    setError(null);
  }, [code, setPlay]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!token || !code) return;
    try {
      setPlay(await fetchPlay(token, signal));
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      // The teacher deleted the hunt, or this device's place in it is gone:
      // forget it so the page offers to join again instead of retrying forever.
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        forgetHunt(code);
        setToken(null);
        setPlay(null);
      }
      setError(message(err));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token, code, setPlay]);

  useEffect(() => {
    if (!token) return;
    let ctrl = new AbortController();
    void refresh(ctrl.signal);
    const id = window.setInterval(() => {
      // A phone in a pocket doesn't need the race.
      if (document.visibilityState !== 'visible') return;
      ctrl.abort();
      ctrl = new AbortController();
      void refresh(ctrl.signal);
    }, over ? POLL_OVER_MS : POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ctrl.abort();
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, over, refresh]);

  const join = useCallback(async (name: string) => {
    if (!code) return false;
    setBusy(true);
    try {
      const r = await joinHunt(code, name);
      saveHuntToken(code, r.token);
      setToken(r.token);
      setPlay(r.play);
      setError(null);
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [code, setPlay]);

  const found = useCallback(async (card: string) => {
    if (!token) return null;
    setBusy(true);
    try {
      const r = await reportFound(token, card);
      setPlay(r.play);
      setFeedback({ kind: 'found', result: r.result, at: Date.now() });
      setError(null);
      return r.result;
    } catch (err) {
      setError(message(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [token, setPlay]);

  const answer = useCallback(async (text: string | string[]) => {
    if (!token) return null;
    setBusy(true);
    try {
      const r = await submitAnswer(token, text);
      setPlay(r.play);
      setFeedback({ kind: r.correct ? 'correct' : 'wrong', at: Date.now() });
      setError(null);
      return r.correct;
    } catch (err) {
      setError(message(err));
      // Whatever went wrong (a cooldown, a station a teammate just finished),
      // the screen should catch up with the race rather than keep a stale question.
      void refresh();
      return null;
    } finally {
      setBusy(false);
    }
  }, [token, refresh, setPlay]);

  // Pictures are fetched by key and never change, so one request each is plenty.
  const pictures = useRef(new Map<string, Promise<string>>());
  const image = useCallback((key: string) => {
    if (!token) return Promise.reject(new Error('Not in a hunt.'));
    let p = pictures.current.get(key);
    if (!p) {
      p = fetchHuntImage(token, key);
      // A failed fetch isn't kept, so the next look tries again.
      p.catch(() => pictures.current.delete(key));
      pictures.current.set(key, p);
    }
    return p;
  }, [token]);

  const leave = useCallback(() => {
    if (code) forgetHunt(code);
    setToken(null);
    setPlay(null);
  }, [code, setPlay]);

  return { token, play, skewMs, loading, error, busy, feedback, join, found, answer, image, leave };
}

/** Re-renders every second while `on` — for countdowns. */
export function useTick(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [on]);
  return now;
}

/**
 * A picture question's picture: null while it loads, '' if it couldn't be
 * fetched (the question's choices still work), else its data: URI.
 */
export function usePicture(key: string | null, load: ((key: string) => Promise<string>) | undefined): string | null {
  const [got, setGot] = useState<{ key: string; src: string } | null>(null);
  useEffect(() => {
    if (!key || !load) return;
    let alive = true;
    load(key).then((src) => alive && setGot({ key, src }), () => alive && setGot({ key, src: '' }));
    return () => { alive = false; };
  }, [key, load]);
  return got && got.key === key ? got.src : null;
}
