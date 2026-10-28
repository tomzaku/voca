// Which Short Conversation questions this learner has practiced or saved.
// Device-local, like the AI practice sessions themselves
// (`useEnglishConversations`) — nothing here is written by the server, so it
// stays in localStorage rather than becoming a resource (see CLAUDE.md). If it
// ever needs to follow a user across devices, that's a new edge function, not
// a table query from here.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface QuestionProgress {
  /** Times marked practiced — answering out loud, or an AI session on it. */
  count: number;
  /** Epoch ms of the last practice; absent once unmarked. */
  practicedAt?: number;
  saved?: boolean;
}

interface SpeakingProgressState {
  questions: Record<string, QuestionProgress>;
  markPracticed: (id: string) => void;
  /** Undo for a mis-tap — clears the practiced state but keeps `saved`. */
  clearPracticed: (id: string) => void;
  toggleSaved: (id: string) => void;
}

export const useSpeakingProgress = create<SpeakingProgressState>()(
  persist(
    (set) => ({
      questions: {},
      markPracticed: (id) =>
        set((s) => {
          const prev = s.questions[id];
          return { questions: { ...s.questions, [id]: { ...prev, count: (prev?.count ?? 0) + 1, practicedAt: Date.now() } } };
        }),
      clearPracticed: (id) =>
        set((s) => {
          const prev = s.questions[id];
          if (!prev) return s;
          return { questions: { ...s.questions, [id]: { saved: prev.saved, count: 0 } } };
        }),
      toggleSaved: (id) =>
        set((s) => {
          const prev = s.questions[id];
          return { questions: { ...s.questions, [id]: { count: prev?.count ?? 0, practicedAt: prev?.practicedAt, saved: !prev?.saved } } };
        }),
    }),
    {
      name: 'voca-speaking-progress',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const isPracticed = (p: QuestionProgress | undefined) => !!p?.practicedAt;
