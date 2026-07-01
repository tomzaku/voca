import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WordProgress, WordStatus } from '../types';
import { supabase } from '../lib/supabase';

interface VocabularyState {
  progress: Record<string, WordProgress>;
  /** Set the learning outcome (known / skipped). Preserves the saved flag. */
  markWord: (word: string, status: WordStatus, userId?: string) => void;
  /** Save/unsave a word. Preserves the learning status. */
  setBookmarked: (word: string, bookmarked: boolean, userId?: string) => void;
  /** Clear the learning outcome (remove from known / don't-know lists). */
  clearStatus: (word: string, userId?: string) => void;
  /** Delete the word from every list. */
  removeWord: (word: string, userId?: string) => void;
  getStatus: (word: string) => WordStatus | null;
  isBookmarked: (word: string) => boolean;
  knownWords: () => Set<string>;
  skippedWords: () => Set<string>;
  bookmarkedWords: () => WordProgress[];
  wordsByStatus: (status: WordStatus) => WordProgress[];
  loadFromRemote: (userId: string) => Promise<void>;
}

const byRecent = (a: WordProgress, b: WordProgress) => b.seenAt.localeCompare(a.seenAt);

export const useVocabularyStore = create<VocabularyState>()(
  persist(
    (set, get) => ({
      progress: {},

      markWord: (word, status, userId) => {
        const prev = get().progress[word];
        const entry: WordProgress = {
          word,
          status,
          bookmarked: prev?.bookmarked ?? false,
          seenAt: new Date().toISOString(),
        };
        set((s) => ({ progress: { ...s.progress, [word]: entry } }));
        if (userId) syncWordToRemote(userId, entry);
      },

      setBookmarked: (word, bookmarked, userId) => {
        const prev = get().progress[word];
        // Unsaving a word that has no learning status leaves nothing to track.
        if (!bookmarked && !prev?.status) {
          get().removeWord(word, userId);
          return;
        }
        const entry: WordProgress = {
          word,
          status: prev?.status,
          bookmarked,
          seenAt: prev?.seenAt ?? new Date().toISOString(),
        };
        set((s) => ({ progress: { ...s.progress, [word]: entry } }));
        if (userId) syncWordToRemote(userId, entry);
      },

      clearStatus: (word, userId) => {
        const prev = get().progress[word];
        if (!prev) return;
        // If it isn't saved either, drop the word entirely.
        if (!prev.bookmarked) {
          get().removeWord(word, userId);
          return;
        }
        const entry: WordProgress = { word, status: undefined, bookmarked: true, seenAt: prev.seenAt };
        set((s) => ({ progress: { ...s.progress, [word]: entry } }));
        if (userId) syncWordToRemote(userId, entry);
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

      isBookmarked: (word) => Boolean(get().progress[word]?.bookmarked),

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
          .filter((e) => e.bookmarked)
          .sort(byRecent);
      },

      wordsByStatus: (status) => {
        return Object.values(get().progress)
          .filter((e) => e.status === status)
          .sort(byRecent);
      },

      loadFromRemote: async (userId) => {
        if (!supabase) return;
        const { data } = await supabase
          .from('user_word_progress')
          .select('word, status, bookmarked, learned_at')
          .eq('user_id', userId);

        if (!data) return;
        const remote: Record<string, WordProgress> = {};
        for (const row of data) {
          remote[row.word as string] = {
            word: row.word as string,
            status: (row.status as WordStatus | null) ?? undefined,
            bookmarked: Boolean(row.bookmarked),
            seenAt: row.learned_at as string,
          };
        }
        // Merge: remote wins for conflicts (each remote row carries both fields).
        set((s) => ({ progress: { ...s.progress, ...remote } }));
      },
    }),
    {
      name: 'voca-progress',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

function syncWordToRemote(userId: string, entry: WordProgress) {
  if (!supabase) return;
  supabase
    .from('user_word_progress')
    .upsert({
      user_id: userId,
      word: entry.word,
      status: entry.status ?? null,
      bookmarked: entry.bookmarked ?? false,
      learned_at: entry.seenAt,
    })
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
