import { create } from 'zustand';
import { computeGain } from '../lib/companion';
import { useCompanion } from './useCompanion';

const POINTS_KEY = 'voca-game-points';
const BEST_KEY = 'voca-game-best-streak';
const SHIELD_KEY = 'voca-game-shield-date';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(key: string): number {
  try {
    const v = parseInt(localStorage.getItem(key) ?? '', 10);
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}

function save(key: string, value: number) {
  try { localStorage.setItem(key, String(value)); } catch { /* ignore */ }
}

interface GameScoreState {
  points: number;
  streak: number;
  best: number;
  /** Points awarded by the most recent win — drives the floating "+N" flair. */
  lastGain: number;
  /** Bumped on every win so the UI can re-trigger the float animation. */
  winId: number;
  win: () => void;
  breakStreak: () => void;
  reset: () => void;
}

export const useGameScore = create<GameScoreState>((set) => ({
  points: load(POINTS_KEY),
  streak: 0,
  best: load(BEST_KEY),
  lastGain: 0,
  winId: 0,

  win: () => set((s) => {
    const newStreak = s.streak + 1;
    // Base 10 points + a streak combo bonus, both shaped by the companion perk.
    const gain = computeGain(s.streak, useCompanion.getState().animalId);
    const points = s.points + gain;
    const best = Math.max(s.best, newStreak);
    save(POINTS_KEY, points);
    save(BEST_KEY, best);
    return { points, streak: newStreak, best, lastGain: gain, winId: s.winId + 1 };
  }),

  breakStreak: () => set((s) => {
    // Turtle's "Resilience": absorb one streak-reset per day instead of losing it.
    if (useCompanion.getState().animalId === 'turtle') {
      let lastShield = '';
      try { lastShield = localStorage.getItem(SHIELD_KEY) ?? ''; } catch { /* ignore */ }
      if (lastShield !== today()) {
        try { localStorage.setItem(SHIELD_KEY, today()); } catch { /* ignore */ }
        return s; // streak preserved
      }
    }
    return { streak: 0 };
  }),

  reset: () => {
    save(POINTS_KEY, 0);
    save(BEST_KEY, 0);
    set({ points: 0, streak: 0, best: 0, lastGain: 0 });
  },
}));
