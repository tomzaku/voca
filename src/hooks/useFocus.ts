import { create } from 'zustand';
import {
  initialFocus, pause, reset, setMode, setPreset, skip, start, tick, type FocusMode, type FocusState, type PhaseKind,
} from '../lib/focusTimer';

// The Focus Zone's timer, kept on this device (localStorage) so it carries on
// while its screen is closed and across a reload. The rules live in
// lib/focusTimer; this only holds the state and saves it.

const KEY = 'voca-focus';

function load(): FocusState {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initialFocus(now), ...(JSON.parse(raw) as Partial<FocusState>) };
  } catch { /* ignore */ }
  return initialFocus(now);
}

interface FocusStore {
  timer: FocusState;
  /** Rain over Ngự Bình while you focus — sound and sight. */
  rain: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setMode: (mode: FocusMode) => void;
  setPreset: (preset: number) => void;
  setNote: (note: string) => void;
  setRain: (on: boolean) => void;
  /** Move a running pomodoro on; returns the phase that just ended, if any. */
  tick: () => PhaseKind | null;
}

export const useFocus = create<FocusStore>((set, get) => {
  const apply = (f: (s: FocusState, now: number) => FocusState) => {
    const timer = f(get().timer, Date.now());
    try { localStorage.setItem(KEY, JSON.stringify(timer)); } catch { /* ignore */ }
    set({ timer });
  };
  return {
    timer: load(),
    rain: false,
    start: () => apply(start),
    pause: () => apply(pause),
    reset: () => apply(reset),
    skip: () => apply(skip),
    setMode: (mode) => apply((s, now) => setMode(s, mode, now)),
    setPreset: (preset) => apply((s, now) => setPreset(s, preset, now)),
    setNote: (note) => apply((s) => ({ ...s, note: note.slice(0, 120) })),
    setRain: (rain) => set({ rain }),
    tick: () => {
      const { state, finished } = tick(get().timer, Date.now());
      if (finished) apply(() => state);
      return finished;
    },
  };
});
