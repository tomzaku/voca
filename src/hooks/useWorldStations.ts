import { useMemo } from 'react';
import { useCollections, type UserCollection } from './useCollections';
import { useVocabularyStore } from './useVocabulary';
import { listCollections, getCollection } from '../lib/collections';
import { completionPct } from '../lib/completion';
import type { WorldStation } from '../game/types';

/** Every collection as a station for the world map: mine → joined → levels.
 *  Extracted so the /world game and any future caller stay in sync. */
export function useWorldStations(): { stations: WorldStation[]; mine: UserCollection[] } {
  const activeId = useCollections((s) => s.activeId);
  const mine = useCollections((s) => s.mine);
  const shared = useCollections((s) => s.shared);
  const joinedIds = useCollections((s) => s.joinedIds);
  const progress = useVocabularyStore((s) => s.progress);

  const joined = useMemo(() => joinedIds
    .filter((id) => !mine.some((c) => c.id === id))
    .map((id) => shared[id])
    .filter((c): c is UserCollection => Boolean(c)), [joinedIds, mine, shared]);

  const systemCollections = useMemo(() => listCollections(), []);

  const stations = useMemo<WorldStation[]>(() => [
    ...mine.map((c) => ({
      id: c.id, name: c.name, kind: 'mine' as const, words: c.words,
      pct: completionPct(c.words, progress), active: c.id === activeId,
      learners: c.memberCount,
    })),
    ...joined.map((c) => ({
      id: c.id, name: c.name, kind: 'joined' as const, words: c.words,
      pct: completionPct(c.words, progress), active: c.id === activeId,
      learners: c.memberCount,
    })),
    ...systemCollections.map((c) => {
      const words = getCollection(c.id).words.map((w) => w.word);
      return {
        id: c.id, name: c.name, kind: 'level' as const, words,
        pct: completionPct(words, progress), active: c.id === activeId,
      };
    }),
  ], [mine, joined, systemCollections, progress, activeId]);

  return { stations, mine };
}
