// The answer feed behind the dashboard's chart and calendar.
//
// This exists because the vocabulary store no longer holds answer logs. They're
// ~75% of a row's bytes, so the sign-in sync stopped fetching them and `/log`
// serves them one word at a time instead — which left the dashboard, the one
// screen that reads EVERY word's log at once, with nothing to count. It reads
// `/progress/activity` instead: the same events, flattened server-side and
// bounded by a date range.
//
// Held in a store rather than in the page so switching tabs and coming back
// doesn't refetch a quarter of history, and so answering a word can mark it
// stale from anywhere.

import { create } from 'zustand';
import { fetchActivity, type ActivityEvent } from '../lib/progressApi';

/** How long a loaded range is trusted before a mount refetches it. */
const STALE_MS = 60_000;

interface ActivityState {
  events: ActivityEvent[];
  /** The start of the range held, in ms. Null when nothing is loaded. */
  since: number | null;
  /** When it was fetched, for the staleness check. */
  fetchedAt: number;
  loading: boolean;
  /** The range held more answers than the server would send; the oldest are missing. */
  truncated: boolean;
  /**
   * Make sure everything from `since` until now is loaded, widening the range
   * held rather than replacing it. Cheap to call on every render.
   */
  ensure: (since: number) => Promise<void>;
  /** Mark the feed stale, so the next `ensure` refetches. */
  invalidate: () => void;
  reset: () => void;
}

const empty = {
  events: [] as ActivityEvent[],
  since: null,
  fetchedAt: 0,
  loading: false,
  truncated: false,
};

/** Set while a fetch is in flight, so overlapping ensures don't stack requests. */
let inFlight: Promise<void> | null = null;

export const useActivity = create<ActivityState>()((set, get) => ({
  ...empty,

  ensure: async (since) => {
    // Wait out a fetch already running before deciding, rather than returning
    // it: the range asked for may be wider than the one being fetched (three
    // taps back through the calendar while the first load is still in the air),
    // and dropping that would leave those months permanently blank.
    if (inFlight) await inFlight;

    const s = get();
    const needsWider = s.since === null || s.since > since;
    const stale = Date.now() - s.fetchedAt >= STALE_MS;
    if (!needsWider && !stale) return;

    // Widen, never narrow: navigating back a month and forward again shouldn't
    // throw away the months already paid for.
    const from = s.since === null ? since : Math.min(s.since, since);

    set({ loading: true });
    inFlight = (async () => {
      const res = await fetchActivity({ since: new Date(from).toISOString() });
      // Quiet call: null is offline or server trouble. Keep whatever's held —
      // a stale chart is a better answer than an empty one. `fetchedAt` moves
      // either way, so a failed *refresh* of a range already held doesn't retry
      // on every render; a range never loaded is still retried when next asked.
      if (res) {
        set({ events: res.events, since: from, truncated: res.hasMore });
      }
      set({ loading: false, fetchedAt: Date.now() });
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  },

  invalidate: () => set({ fetchedAt: 0 }),

  reset: () => set(empty),
}));
