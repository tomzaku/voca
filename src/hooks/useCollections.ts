import { create } from 'zustand';
import { DEFAULT_COLLECTION_ID, getCollection, isCollectionId } from '../lib/collections';
import {
  createCollection as apiCreateCollection,
  deleteCollection as apiDeleteCollection,
  fetchCollection,
  fetchCollections,
  joinCollection,
  updateCollection as apiUpdateCollection,
  type Collection,
} from '../lib/collectionsApi';
import { fetchSettings, saveSettings } from '../lib/settingsApi';
import type { VocabularyWord } from '../types';

const KEY = 'voca-collection';
const USER_KEY = 'voca-user-collections';

/**
 * A collection stored on the server (user-created; shareable when public).
 * Re-exported from the API client so there's one definition of the shape,
 * and existing imports of `UserCollection` keep working.
 */
export type UserCollection = Collection;

type W = { word: string; level: VocabularyWord['level'] };

// Runs at store creation (module load). Must NOT touch getCollections()/WORD_LIST
// — this store sits in an import cycle with wordService, so validating the id
// here would read WORD_LIST before it's initialized (TDZ). Trust the stored
// string; getCollection() falls back safely for unknown ids at runtime.
function loadActive(): string {
  try {
    return localStorage.getItem(KEY) || DEFAULT_COLLECTION_ID;
  } catch {
    return DEFAULT_COLLECTION_ID;
  }
}

// Cache of server collections so a picked collection keeps working offline and
// before the login fetch completes.
function loadUserCache(): { mine: UserCollection[]; shared: Record<string, UserCollection>; joinedIds: string[] } {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { mine: parsed.mine ?? [], shared: parsed.shared ?? {}, joinedIds: parsed.joinedIds ?? [] };
    }
  } catch { /* ignore */ }
  return { mine: [], shared: {}, joinedIds: [] };
}

function saveUserCache(mine: UserCollection[], shared: Record<string, UserCollection>, joinedIds: string[]) {
  try { localStorage.setItem(USER_KEY, JSON.stringify({ mine, shared, joinedIds })); } catch { /* ignore */ }
}

/** The public share URL for a collection (matches the router basename). */
export function collectionShareUrl(id: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  return `${window.location.origin}${base}/collections?c=${id}`;
}

interface CollectionsState {
  activeId: string;
  /** Collections the signed-in user owns. */
  mine: UserCollection[];
  /** Other people's public collections we've opened via a share link, by id. */
  shared: Record<string, UserCollection>;
  /** Ids of collections the user has joined (studies), incl. other people's. */
  joinedIds: string[];
  setActive: (id: string) => void;
  /** Which words the active collection studies. Synchronous — safe for pickNextWord etc. */
  activeWords: () => W[];
  /** Look up a server collection (own or fetched-shared) by id. */
  getUserCollection: (id: string) => UserCollection | undefined;
  /** Pull selection + owned collections from the server on login (remote wins). */
  /** No userId: the settings API identifies the caller from their session. */
  loadFromRemote: () => Promise<void>;
  refreshMine: () => Promise<void>;
  /** Fetch the collections this user has joined (from collection_members). */
  refreshJoined: () => Promise<void>;
  createCollection: (name: string, words: string[]) => Promise<UserCollection>;
  updateCollection: (id: string, name: string, words: string[]) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  /** Make a collection public (idempotent) and return its share URL. */
  shareCollection: (id: string) => Promise<string>;
  /** Fetch a (public or own) collection by id, e.g. from a share link. */
  fetchById: (id: string) => Promise<UserCollection | null>;
}

export const useCollections = create<CollectionsState>((set, get) => ({
  activeId: loadActive(),
  ...loadUserCache(),

  setActive: (id) => {
    const userCol = get().getUserCollection(id);
    if (!isCollectionId(id) && !userCol) return;
    try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
    set({ activeId: id });
    syncActive(id);
    // Studying a server collection counts you as one of its learners
    // (idempotent server-side; fire-and-forget). Track the join locally too so
    // the collection stays listed on the Collections page after a refresh.
    if (userCol) {
      if (!get().joinedIds.includes(id)) {
        const joinedIds = [...get().joinedIds, id];
        set({ joinedIds });
        saveUserCache(get().mine, get().shared, joinedIds);
      }
      void joinCollection(id);
    }
  },

  activeWords: () => {
    const id = get().activeId;
    const user = get().getUserCollection(id);
    if (user && user.words.length > 0) {
      // User collections carry no per-word difficulty — default to intermediate.
      return user.words.map((word) => ({ word, level: 'intermediate' as const }));
    }
    return getCollection(id).words;
  },

  getUserCollection: (id) => get().mine.find((c) => c.id === id) ?? get().shared[id],

  loadFromRemote: async () => {
    await get().refreshMine();

    const remote = (await fetchSettings())?.activeCollection;

    if (remote && (isCollectionId(remote) || get().getUserCollection(remote) || await get().fetchById(remote))) {
      try { localStorage.setItem(KEY, remote); } catch { /* ignore */ }
      set({ activeId: remote });
    } else {
      // Nothing valid on the server yet — push the local choice up.
      syncActive(get().activeId);
    }
  },

  refreshMine: async () => {
    // One request answers both lists — what you own and what you joined.
    const res = await fetchCollections();
    if (!res) return;
    const shared = { ...get().shared };
    for (const col of res.joined) shared[col.id] = col;
    const joinedIds = res.joined.map((c) => c.id);
    set({ mine: res.mine, shared, joinedIds });
    saveUserCache(res.mine, shared, joinedIds);
  },

  /** Kept as an alias: both lists arrive together now. */
  refreshJoined: async () => {
    await get().refreshMine();
  },

  createCollection: async (name, words) => {
    const created = await apiCreateCollection(name, words);
    const mine = [...get().mine, created];
    set({ mine });
    saveUserCache(mine, get().shared, get().joinedIds);
    return created;
  },

  updateCollection: async (id, name, words) => {
    await apiUpdateCollection(id, { name, words });
    const mine = get().mine.map((c) => (c.id === id ? { ...c, name, words } : c));
    set({ mine });
    saveUserCache(mine, get().shared, get().joinedIds);
  },

  deleteCollection: async (id) => {
    await apiDeleteCollection(id);
    const mine = get().mine.filter((c) => c.id !== id);
    set({ mine });
    saveUserCache(mine, get().shared, get().joinedIds);
    // Deleting the collection you're studying falls back to the default.
    if (get().activeId === id) get().setActive(DEFAULT_COLLECTION_ID);
  },

  shareCollection: async (id) => {
    const target = get().mine.find((c) => c.id === id);
    if (target && !target.isPublic) {
      await apiUpdateCollection(id, { isPublic: true });
      const mine = get().mine.map((c) => (c.id === id ? { ...c, isPublic: true } : c));
      set({ mine });
      saveUserCache(mine, get().shared, get().joinedIds);
    }
    return collectionShareUrl(id);
  },

  fetchById: async (id) => {
    const cached = get().getUserCollection(id);
    if (cached) return cached;
    const col = await fetchCollection(id);
    if (!col) return null;
    const shared = { ...get().shared, [id]: col };
    set({ shared });
    saveUserCache(get().mine, shared, get().joinedIds);
    return col;
  },
}));

/** Persist the selected collection onto the user's settings (fire-and-forget).
 *  Signed out, the call is a no-op and the choice stays in localStorage. */
function syncActive(id: string) {
  void saveSettings({ activeCollection: id });
}
