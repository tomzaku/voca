import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WordProgress, WordStatus } from '../types';
import { supabase } from '../lib/supabase';
import { gradeReview } from '../lib/srs';

interface VocabularyState {
  progress: Record<string, WordProgress>;
  /** Set the learning outcome (known / skipped / dismissed). Preserves the saved
   *  flag. `mistakes` is how many wrong attempts the round took (games differ in
   *  difficulty, so mistakes are tallied when the word is revealed). */
  markWord: (word: string, status: WordStatus, userId?: string, mistakes?: number) => void;
  /** Count one viewing of a word (opened on the flashcard). Leaves status/SR intact. */
  recordView: (word: string, userId?: string) => void;
  /** Manual triage (collection stats popup): known=true graduates the word out
   *  of rotation (mastered); known=false flags it difficult and due now. Not a
   *  graded review — tallies and the answer log stay untouched. */
  triageWord: (word: string, known: boolean, userId?: string) => void;
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

      markWord: (word, status, userId, mistakes = 0) => {
        const prev = get().progress[word];
        const now = new Date();
        // FSRS grade: a clean solve is 'good', a solve that needed wrong
        // attempts is 'hard' (shorter next interval), giving up is 'again'.
        // "dismissed" (the Skip button) isn't a review — the word just leaves
        // rotation, so its SR fields are kept as-is in case it's restored.
        const srs = status === 'dismissed'
          ? {
              reps: prev?.reps,
              lapses: prev?.lapses,
              interval: prev?.interval,
              stability: prev?.stability,
              difficulty: prev?.difficulty,
              ease: prev?.ease,
              dueAt: prev?.dueAt,
              lastReviewedAt: prev?.lastReviewedAt,
              mastered: prev?.mastered,
            }
          : gradeReview(prev, status === 'known' ? (mistakes > 0 ? 'hard' : 'good') : 'again', now);
        // Lifetime answer tally. In-round wrong attempts arrive via `mistakes`;
        // a failed round without a counted attempt (giving up straight away)
        // still tallies one wrong.
        const correct = (prev?.correct ?? 0) + (status === 'known' ? 1 : 0);
        const wrong = (prev?.wrong ?? 0) + Math.max(mistakes, status === 'skipped' ? 1 : 0);
        // Answer log — the datetime of every correct/incorrect answer (last 50).
        // FSRS reschedules from the real elapsed time (via lastReviewedAt); the
        // log itself feeds the analytics dashboard.
        const history = status === 'dismissed'
          ? prev?.history
          : [...(prev?.history ?? []), { at: now.toISOString(), ok: status === 'known' }].slice(-50);
        const entry: WordProgress = {
          word,
          status,
          bookmarked: prev?.bookmarked ?? false,
          seenAt: now.toISOString(),
          views: prev?.views ?? 0, // views count opens, not judgments (see recordView)
          correct,
          wrong,
          history,
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
          stability: prev?.stability,
          difficulty: prev?.difficulty,
          ease: prev?.ease,
          dueAt: prev?.dueAt,
          lastReviewedAt: prev?.lastReviewedAt,
          mastered: prev?.mastered,
          views: (prev?.views ?? 0) + 1,
          correct: prev?.correct,
          wrong: prev?.wrong,
          history: prev?.history,
        };
        set((s) => ({ progress: { ...s.progress, [word]: entry } }));
        if (userId) syncWordToRemote(userId, entry);
      },

      triageWord: (word, known, userId) => {
        // Match existing progress case-insensitively (collections keep the
        // user's casing) and keep its key, so one word never splits in two.
        const prev = get().progress[word]
          ?? Object.values(get().progress).find((p) => p.word.toLowerCase() === word.toLowerCase());
        const key = prev?.word ?? word;
        const now = new Date().toISOString();
        const entry: WordProgress = {
          ...prev,
          word: key,
          // 'known' + mastered exits every pick pool; 'skipped' + due-now lands
          // in the difficult pool and is served first (matches wordBucket).
          status: known ? 'known' : 'skipped',
          bookmarked: prev?.bookmarked ?? false,
          seenAt: now,
          dueAt: known ? prev?.dueAt : now,
          mastered: known,
        };
        set((s) => ({ progress: { ...s.progress, [key]: entry } }));
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
          .select('word, status, bookmarked, learned_at, reps, lapses, srs_interval, stability, difficulty, ease, due_at, last_reviewed_at, mastered, views, correct_count, wrong_count, review_log')
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
            stability: (r.stability as number | null) ?? undefined,
            difficulty: (r.difficulty as number | null) ?? undefined,
            ease: (r.ease as number | null) ?? undefined,
            dueAt: (r.due_at as string | null) ?? undefined,
            lastReviewedAt: (r.last_reviewed_at as string | null) ?? undefined,
            mastered: (r.mastered as boolean | null) ?? undefined,
            views: (r.views as number | null) ?? undefined,
            correct: (r.correct_count as number | null) ?? undefined,
            wrong: (r.wrong_count as number | null) ?? undefined,
            history: (r.review_log as WordProgress['history'] | null) ?? undefined,
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
      stability: entry.stability ?? null,
      difficulty: entry.difficulty ?? null,
      ease: entry.ease ?? 2.5,
      due_at: entry.dueAt ?? null,
      last_reviewed_at: entry.lastReviewedAt ?? null,
      mastered: entry.mastered ?? false,
      views: entry.views ?? 0,
      correct_count: entry.correct ?? 0,
      wrong_count: entry.wrong ?? 0,
      review_log: entry.history ?? [],
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
