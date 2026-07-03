import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WordProgress, WordStatus } from '../types';
import { supabase } from '../lib/supabase';
import { gradeReview } from '../lib/srs';

interface VocabularyState {
  progress: Record<string, WordProgress>;
  /** Set the learning outcome (known / skipped). Preserves the saved flag. */
  markWord: (word: string, status: WordStatus, userId?: string) => void;
  /** Count one viewing of a word (opened on the flashcard). Leaves status/SR intact. */
  recordView: (word: string, userId?: string) => void;
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
        // "known" is a successful review, "skipped" (incl. giving up) a lapse.
        const srs = gradeReview(prev, status === 'known' ? 'good' : 'again');
        const entry: WordProgress = {
          word,
          status,
          bookmarked: prev?.bookmarked ?? false,
          seenAt: new Date().toISOString(),
          views: prev?.views ?? 0, // views count opens, not judgments (see recordView)
          ...srs,
        };
        set((s) => ({ progress: { ...s.progress, [word]: entry } }));
        if (userId) syncWordToRemote(userId, entry);
      },

      recordView: (word, userId) => {
        const prev = get().progress[word];
        const entry: WordProgress = {
          word,
          status: prev?.status,
          bookmarked: prev?.bookmarked ?? false,
          seenAt: new Date().toISOString(),
          reps: prev?.reps,
          lapses: prev?.lapses,
          interval: prev?.interval,
          ease: prev?.ease,
          dueAt: prev?.dueAt,
          lastReviewedAt: prev?.lastReviewedAt,
          mastered: prev?.mastered,
          views: (prev?.views ?? 0) + 1,
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
          .select('word, status, bookmarked, learned_at, reps, lapses, srs_interval, ease, due_at, last_reviewed_at, mastered, views')
          .eq('user_id', userId);

        if (!data) return;
        const remote: Record<string, WordProgress> = {};
        for (const row of data) {
          const r = row as Record<string, unknown>;
          remote[r.word as string] = {
            word: r.word as string,
            status: (r.status as WordStatus | null) ?? undefined,
            bookmarked: Boolean(r.bookmarked),
            seenAt: r.learned_at as string,
            reps: (r.reps as number | null) ?? undefined,
            lapses: (r.lapses as number | null) ?? undefined,
            interval: (r.srs_interval as number | null) ?? undefined,
            ease: (r.ease as number | null) ?? undefined,
            dueAt: (r.due_at as string | null) ?? undefined,
            lastReviewedAt: (r.last_reviewed_at as string | null) ?? undefined,
            mastered: (r.mastered as boolean | null) ?? undefined,
            views: (r.views as number | null) ?? undefined,
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
      reps: entry.reps ?? 0,
      lapses: entry.lapses ?? 0,
      srs_interval: entry.interval ?? 0,
      ease: entry.ease ?? 2.5,
      due_at: entry.dueAt ?? null,
      last_reviewed_at: entry.lastReviewedAt ?? null,
      mastered: entry.mastered ?? false,
      views: entry.views ?? 0,
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
