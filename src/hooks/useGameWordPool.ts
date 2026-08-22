// A game's own word source — the same Recent/Saved/bucket filters History
// offers, but scoped to whichever game embeds this (Quiz, Story Gaps,
// Speaking, Mind Map) instead of a page-level setting. Each game keeps its
// own checked set, so switching lists inside Quiz doesn't touch Story Gaps
// and neither depends on what History has checked.

import { useMemo, useState } from 'react';
import { useProgressQuery, type Filter } from './useProgressQuery';

/** Filter this game starts on before the learner touches the picker. */
const DEFAULT_FILTER: Filter = 'recent';

/** Stable empty set — `enabled: false` routes through this so `useProgressQuery`
 *  sees "nothing checked" (no round trip) instead of actually being called
 *  conditionally, which the rules of hooks don't allow. */
const NONE = new Set<Filter>();

/**
 * `enabled: false` for a game that already received an explicit word list
 * from its caller (History's inline row still does) — the picker never
 * renders and no query runs, so a mounted game costs nothing extra.
 */
export function useGameWordPool(defaultFilter: Filter = DEFAULT_FILTER, enabled = true) {
  const [checked, setChecked] = useState<Set<Filter>>(() => new Set([defaultFilter]));
  const toggleFilter = (id: Filter) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { rows, counts, loading, initialLoading, fetchAllWords } = useProgressQuery(enabled ? checked : NONE);
  const words = useMemo(() => rows.map((r) => r.word), [rows]);

  return { checked, toggleFilter, counts, words, loading, initialLoading, fetchAllWords };
}
