import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WordProgress, WordStatus } from '../types';
import { supabase } from '../lib/supabase';

interface VocabularyState {
  progress: Record<string, WordProgress>;
  markWord: (word: string, status: WordStatus, userId?: string) => void;
  removeWord: (word: string, userId?: string) => void;
  getStatus: (word: string) => WordStatus | null;
  knownWords: () => Set<string>;
  skippedWords: () => Set<string>;
  bookmarkedWords: () => WordProgress[];
  loadFromRemote: (userId: string) => Promise<void>;
}

export const useVocabularyStore = create<VocabularyState>()(
  persist(
    (set, get) => ({
      progress: {},

      markWord: (word, status, userId) => {
        const entry: WordProgress = { word, status, seenAt: new Date().toISOString() };
        set((s) => ({ progress: { ...s.progress, [word]: entry } }));
        if (userId) syncWordToRemote(userId, word, status);
      },

      removeWord: (word, userId) => {
        set((s) => {
          const next = { ...s.progress };
          delete next[word];
          return { progress: next };
        });
        if (userId) removeWordFromRemote(userId, word);
      },

      getStatus: (word) => get().progress[word]?.status ?? null,

      knownWords: () => {
        const entries = Object.values(get().progress);
        return new Set(entries.filter((e) => e.status === 'known').map((e) => e.word));
      },

      skippedWords: () => {
        const entries = Object.values(get().progress);
        return new Set(entries.filter((e) => e.status === 'skipped').map((e) => e.word));
      },

      bookmarkedWords: () => {
        return Object.values(get().progress)
          .filter((e) => e.status === 'bookmarked')
          .sort((a, b) => b.seenAt.localeCompare(a.seenAt));
      },

      loadFromRemote: async (userId) => {
        if (!supabase) return;
        const { data } = await supabase
          .from('user_word_progress')
          .select('word, status, learned_at')
          .eq('user_id', userId);

        if (!data) return;
        const remote: Record<string, WordProgress> = {};
        for (const row of data) {
          remote[row.word as string] = {
            word: row.word as string,
            status: row.status as WordStatus,
            seenAt: row.learned_at as string,
          };
        }
        // Merge: remote wins for conflicts
        set((s) => ({ progress: { ...s.progress, ...remote } }));
      },
    }),
    {
      name: 'voca-progress',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

function syncWordToRemote(userId: string, word: string, status: WordStatus) {
  if (!supabase) return;
  supabase
    .from('user_word_progress')
    .upsert({ user_id: userId, word, status, learned_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.warn('[voca] sync error:', error.message);
    });
}

function removeWordFromRemote(userId: string, word: string) {
  if (!supabase) return;
  supabase
    .from('user_word_progress')
    .delete()
    .eq('user_id', userId)
    .eq('word', word)
    .then(({ error }) => {
      if (error) console.warn('[voca] remove error:', error.message);
    });
}
