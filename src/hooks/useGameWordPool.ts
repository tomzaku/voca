// A game's own word source — the same Recent/Saved/bucket lists History
// offers, but scoped to whichever game embeds this (Quiz, Story Gaps,
// Speaking, Mind Map) instead of a page-level setting, and one list at a
// time (see FilterTabs) rather than History's multi-select checkboxes — a
// round is drawn from one list, not a union of several.

import { useMemo, useState } from 'react';
import { useProgressQuery, type Filter } from './useProgressQuery';

/** List this game starts on before the learner touches the tabs. */
const DEFAULT_FILTER: Filter = 'recent';

/** Stable empty set — `enabled: false` routes through this so `useProgressQuery`
 *  sees "nothing checked" (no round trip) instead of actually being called
 *  conditionally, which the rules of hooks don't allow. */
const NONE = new Set<Filter>();

/**
 * `enabled: false` for a game that already received an explicit word list
 * from its caller (History's inline row still does) — the tabs never render
 * and no query runs, so a mounted game costs nothing extra.
 */
export function useGameWordPool(defaultFilter: Filter = DEFAULT_FILTER, enabled = true) {
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const checked = useMemo(() => (enabled ? new Set([filter]) : NONE), [enabled, filter]);

  const { rows, counts, loading, initialLoading, fetchAllWords } = useProgressQuery(checked);
  const words = useMemo(() => rows.map((r) => r.word), [rows]);

  return { filter, setFilter, counts, words, loading, initialLoading, fetchAllWords };
}
