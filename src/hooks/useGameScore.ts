import { create } from 'zustand';

const POINTS_KEY = 'voca-game-points';
const BEST_KEY = 'voca-game-best-streak';

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
    // Base 10 points, +2 per current streak (combo bonus, capped at 10x).
    const gain = 10 + Math.min(s.streak, 10) * 2;
    const points = s.points + gain;
    const best = Math.max(s.best, newStreak);
    save(POINTS_KEY, points);
    save(BEST_KEY, best);
    return { points, streak: newStreak, best, lastGain: gain, winId: s.winId + 1 };
  }),

  breakStreak: () => set({ streak: 0 }),

  reset: () => {
    save(POINTS_KEY, 0);
    save(BEST_KEY, 0);
    set({ points: 0, streak: 0, best: 0, lastGain: 0 });
  },
}));
