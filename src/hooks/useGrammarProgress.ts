// The learner's progress through the Grammar course. The device's copy is the
// one the UI reads, so a lesson unlocks the moment it's passed, offline or
// signed out; the `grammar` resource is where it syncs to, and `sync` folds
// the server's copy back in (another device may have got further).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeLocalStorage } from '../lib/safeStorage';
import { fetchGrammarProgress, PASS_SCORE, saveGrammarAttempt, type GrammarProgress } from '../lib/grammarApi';

interface GrammarProgressState {
  records: Record<string, GrammarProgress>;
  /** Grade a finished round locally, then send it to the server. */
  recordAttempt: (lessonId: string, correct: number, total: number) => GrammarProgress;
  sync: () => Promise<void>;
}

/** Two copies of one lesson's record → the one that keeps the most progress. */
function merge(a: GrammarProgress | undefined, b: GrammarProgress): GrammarProgress {
  if (!a) return b;
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const done = [a.completedAt, b.completedAt].filter((d): d is string => !!d).sort()[0] ?? null;
  return {
    lessonId: b.lessonId,
    bestScore: Math.max(a.bestScore, b.bestScore),
    lastScore: newer.lastScore,
    attempts: Math.max(a.attempts, b.attempts),
    completedAt: done,
    updatedAt: newer.updatedAt,
  };
}

export const useGrammarProgress = create<GrammarProgressState>()(
  persist(
    (set, get) => ({
      records: {},
      recordAttempt: (lessonId, correct, total) => {
        const score = Math.round((correct / total) * 100);
        const prev = get().records[lessonId];
        const now = new Date().toISOString();
        const local: GrammarProgress = {
          lessonId,
          bestScore: Math.max(score, prev?.bestScore ?? 0),
          lastScore: score,
          attempts: (prev?.attempts ?? 0) + 1,
          completedAt: prev?.completedAt ?? (score >= PASS_SCORE ? now : null),
          updatedAt: now,
        };
        set((s) => ({ records: { ...s.records, [lessonId]: local } }));
        void saveGrammarAttempt(lessonId, correct, total).then((server) => {
          if (server) set((s) => ({ records: { ...s.records, [lessonId]: merge(s.records[lessonId], server) } }));
        });
        return local;
      },
      sync: async () => {
        const server = await fetchGrammarProgress();
        if (!server) return;
        const byId = new Map(server.map((r) => [r.lessonId, r]));
        // Rounds played while the server couldn't be reached never arrived.
        // Replay each lesson's best as one attempt out of 100: that carries the
        // score (and so the pass) across, at the cost of an attempt count
        // that's one off — the only thing the server can't be told directly.
        const behind = Object.values(get().records).filter((r) => r.bestScore > (byId.get(r.lessonId)?.bestScore ?? -1));
        const pushed = await Promise.all(behind.map((r) => saveGrammarAttempt(r.lessonId, r.bestScore, 100)));
        set((s) => {
          const records = { ...s.records };
          for (const r of [...server, ...pushed]) if (r) records[r.lessonId] = merge(records[r.lessonId], r);
          return { records };
        });
      },
    }),
    {
      name: 'voca-grammar-progress',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ records: s.records }),
    },
  ),
);

export const isCompleted = (r: GrammarProgress | undefined) => !!r?.completedAt;
