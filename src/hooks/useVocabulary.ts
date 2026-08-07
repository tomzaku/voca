import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AnswerVia, ReviewEvent, WordProgress, WordStatus } from '../types';
import {
  fetchProgressList,
  fetchWordLog,
  removeProgress,
  saveProgress,
} from '../lib/progressApi';
import { gradeReview } from '../lib/spacedRepetition';
import { useStreak } from './useStreak';
import { useActivity } from './useActivity';

interface VocabularyState {
  progress: Record<string, WordProgress>;
  /** Set the learning outcome (known / skipped / dismissed). Preserves the saved
   *  flag. `mistakes` is how many wrong attempts the round took (games differ in
   *  difficulty, so mistakes are tallied when the word is revealed). `via` labels
   *  the answer-log entry with how the word was answered (quiz question type or
   *  flash card). */
  markWord: (word: string, status: WordStatus, userId?: string, mistakes?: number, via?: AnswerVia) => void;
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
  // The two reads take no userId: the `progress` function identifies the
  // caller from their session, so passing one would only invite mismatches.
  loadFromRemote: () => Promise<void>;
  /** Fetch one word's answer log on demand (see `history` on WordProgress). */
  loadWordHistory: (word: string) => Promise<void>;
}

const byRecent = (a: WordProgress, b: WordProgress) => b.seenAt.localeCompare(a.seenAt);

export const useVocabularyStore = create<VocabularyState>()(
  persist(
    (set, get) => ({
      progress: {},

      markWord: (word, status, userId, mistakes = 0, via) => {
        // A graded answer is what "studied today" means. `recordView` is
        // deliberately excluded — merely looking at a card shouldn't keep a
        // streak alive, or the streak stops meaning anything.
        if (userId) void useStreak.getState().record();
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
        //
        // The log is NOT synced down at sign-in (it dwarfs everything else —
        // see loadFromRemote), so `prev.history` is undefined until something
        // asks for it. Appending to it locally is therefore only safe when it
        // has been loaded; the server-side append below is what actually
        // records the answer. Leaving it undefined means "not loaded", and the
        // next reader fetches the real thing.
        const event: ReviewEvent | undefined = status === 'dismissed'
          ? undefined
          : { at: now.toISOString(), ok: status === 'known', ...(via ? { via } : {}) };
        const history = !event
          ? prev?.history
          : prev?.history
          ? [...prev.history, event].slice(-50)
          : undefined;
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
        if (userId) syncWordToRemote(entry, event);
        // The dashboard's feed is now a day older than the truth. Marked stale
        // rather than refetched: the answer is still on its way to the server,
        // and nothing is on screen to update until that page is opened.
        if (event) useActivity.getState().invalidate();
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
        if (userId) syncWordToRemote(entry);
      },

      triageWord: (word, known, userId) => {
        if (userId) void useStreak.getState().record();
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
        if (userId) syncWordToRemote(entry);
      },

      setBookmarked: (word, bookmarked, userId) => {
        const prev = get().progress[word];
        // Unsaving a word that has no learning status leaves nothing to track.
        if (!bookmarked && !prev?.status) {
          get().removeWord(word, userId);
          return;
        }
        // Spread `prev`: saving a word must not touch its schedule or tallies.
        // (Rebuilding the entry from scratch here used to reset every SRS
        // field to its default on the way to the server.)
        const entry: WordProgress = {
          ...prev,
          word,
          status: prev?.status,
          bookmarked,
          seenAt: prev?.seenAt ?? new Date().toISOString(),
        };
        set((s) => ({ progress: { ...s.progress, [word]: entry } }));
        if (userId) syncWordToRemote(entry);
      },

      clearStatus: (word, userId) => {
        const prev = get().progress[word];
        if (!prev) return;
        // If it isn't saved either, drop the word entirely.
        if (!prev.bookmarked) {
          get().removeWord(word, userId);
          return;
        }
        // Takes the word out of its list — the outcome and the graduation go,
        // so it re-enters rotation. What it earned (reps, tallies, memory
        // state) stays: this is "not in that list", not "never happened".
        const entry: WordProgress = { ...prev, word, status: undefined, mastered: false, bookmarked: true, seenAt: prev.seenAt };
        set((s) => ({ progress: { ...s.progress, [word]: entry } }));
        if (userId) syncWordToRemote(entry);
      },

      removeWord: (word, userId) => {
        set((s) => {
          const next = { ...s.progress };
          delete next[word];
          return { progress: next };
        });
        if (userId) removeWordFromRemote(word);
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

      loadFromRemote: async () => {
        // GET /progress with no filters — the whole account. Read through the
        // resource, never the table (see CLAUDE.md); with no Supabase or no
        // session it returns null and the local copy stands.
        //
        // It returns every column EXCEPT the answer log — that's ~75% of the
        // bytes and only the open card's tally reads it, so it's fetched per
        // word by loadWordHistory.
        //
        // Paged, because a single response is capped (PostgREST `max_rows`,
        // 1000 by default) and silently returns a truncated list — which used
        // to look like "my other device lost half my words".
        const remote: Record<string, WordProgress> = {};
        let cursor: string | null = null;
        for (;;) {
          const res: Awaited<ReturnType<typeof fetchProgressList>> =
            await fetchProgressList({ after: cursor, limit: 1000 });
          if (!res) return; // offline or server trouble — keep what's local
          const before = Object.keys(remote).length;
          for (const entry of res.progress) remote[entry.word] = entry;
          if (!res.hasMore || !res.cursor) break;
          // The cursor is inclusive, so a page that adds nothing new means
          // every row in it shares one timestamp — advancing would loop.
          if (Object.keys(remote).length === before) break;
          cursor = res.cursor;
        }
        // Merge: remote wins for conflicts (each remote row carries both
        // fields) — but never let a remote row drop an answer log that's
        // already loaded, since this query doesn't fetch one.
        set((s) => ({
          progress: {
            ...s.progress,
            ...Object.fromEntries(
              Object.entries(remote).map(([k, v]) => [k, { ...v, history: s.progress[k]?.history }]),
            ),
          },
        }));
      },

      loadWordHistory: async (word) => {
        const res = await fetchWordLog(word);
        if (!res) return;
        const log = res.log;
        set((s) => {
          const prev = s.progress[word];
          // Nothing local to attach it to (the word was removed meanwhile).
          if (!prev) return s;
          return { progress: { ...s.progress, [word]: { ...prev, history: log } } };
        });
      },
    }),
    {
      name: 'voca-progress',
      storage: createJSONStorage(() => localStorage),
      // The answer log is left out of the persisted copy: it's the bulk of the
      // payload, localStorage is a ~5MB budget for the whole origin, and this
      // blob is rewritten on every single answer. It's re-fetched per word on
      // demand instead — safe because anything that *keeps* a log requires
      // signing in (LoginGate gates every route but the flash card), so wherever
      // there's a log to show there's a server copy to fetch it from. A signed-out
      // visitor on the flash card has no answers recorded anywhere, so there's
      // nothing for the missing local copy to lose.
      partialize: (s) => ({
        progress: Object.fromEntries(
          Object.entries(s.progress).map(([k, v]) => [k, { ...v, history: undefined }]),
        ),
      }),
    },
  ),
);

/**
 * The most recent write to the server, so anything that reads progress back
 * (the leaderboard recomputes the caller's score server-side) can wait for the
 * answer it was triggered by to have landed. Never rejects — a failed sync is
 * warned about below and shouldn't take a caller's `await` down with it.
 */
let lastRemoteWrite: Promise<void> = Promise.resolve();

/** Resolves once the latest progress write has reached the server. */
export function progressSynced(): Promise<void> {
  return lastRemoteWrite;
}

/**
 * Push one word's state to the server, through progress-save.
 *
 * `event`, when given, is the answer that caused this write; the endpoint
 * appends it to the word's log rather than taking a whole array. The client no
 * longer holds the full log, so a read-modify-write from here would truncate
 * it — and two devices answering the same word would overwrite each other's
 * answers.
 *
 * Tracked in `lastRemoteWrite` so `progressSynced()` can wait for it. Never
 * rejects: a failed write is warned about and the local state stands.
 */
function syncWordToRemote(entry: WordProgress, event?: ReviewEvent) {
  lastRemoteWrite = saveProgress(entry, event)
    .then((res) => {
      if (!res) console.warn(`[voca] could not save "${entry.word}"`);
    })
    .catch((e: unknown) => console.warn('[voca] sync error:', e));
}

function removeWordFromRemote(word: string) {
  void removeProgress(word).then((res) => {
    if (!res) console.warn(`[voca] could not remove "${word}"`);
  });
}
