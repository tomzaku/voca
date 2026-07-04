import { create } from 'zustand';
import { DEFAULT_COLLECTION_ID, getCollection, isCollectionId } from '../lib/collections';
import { supabase } from '../lib/supabase';
import type { VocabularyWord } from '../types';

const KEY = 'voca-collection';
const USER_KEY = 'voca-user-collections';

/** A collection stored on the server (user-created; shareable when public). */
export interface UserCollection {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  words: string[];
  isPublic: boolean;
}

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
function loadUserCache(): { mine: UserCollection[]; shared: Record<string, UserCollection> } {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { mine: parsed.mine ?? [], shared: parsed.shared ?? {} };
    }
  } catch { /* ignore */ }
  return { mine: [], shared: {} };
}

function saveUserCache(mine: UserCollection[], shared: Record<string, UserCollection>) {
  try { localStorage.setItem(USER_KEY, JSON.stringify({ mine, shared })); } catch { /* ignore */ }
}

function rowToCollection(r: Record<string, unknown>): UserCollection {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    words: (r.words as string[]) ?? [],
    isPublic: Boolean(r.is_public),
  };
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
  setActive: (id: string) => void;
  /** Which words the active collection studies. Synchronous — safe for pickNextWord etc. */
  activeWords: () => W[];
  /** Look up a server collection (own or fetched-shared) by id. */
  getUserCollection: (id: string) => UserCollection | undefined;
  /** Pull selection + owned collections from the server on login (remote wins). */
  loadFromRemote: (userId: string) => Promise<void>;
  refreshMine: () => Promise<void>;
  createCollection: (name: string, words: string[]) => Promise<UserCollection>;
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
    if (!isCollectionId(id) && !get().getUserCollection(id)) return;
    try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
    set({ activeId: id });
    syncActive(id);
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

  loadFromRemote: async (userId) => {
    if (!supabase) return;
    await get().refreshMine();

    const { data } = await supabase
      .from('user_settings')
      .select('active_collection')
      .eq('user_id', userId)
      .maybeSingle();
    const remote = data?.active_collection as string | null | undefined;

    if (remote && (isCollectionId(remote) || get().getUserCollection(remote) || await get().fetchById(remote))) {
      try { localStorage.setItem(KEY, remote); } catch { /* ignore */ }
      set({ activeId: remote });
    } else {
      // Nothing valid on the server yet — push the local choice up.
      syncActive(get().activeId, userId);
    }
  },

  refreshMine: async () => {
    if (!supabase) return;
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: true });
    if (error || !data) return;
    const mine = data.map(rowToCollection);
    set({ mine });
    saveUserCache(mine, get().shared);
  },

  createCollection: async (name, words) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) throw new Error('Please sign in to create collections.');
    const { data, error } = await supabase
      .from('collections')
      .insert({ owner_id: uid, name, words })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const created = rowToCollection(data);
    const mine = [...get().mine, created];
    set({ mine });
    saveUserCache(mine, get().shared);
    return created;
  },

  deleteCollection: async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) throw new Error(error.message);
    const mine = get().mine.filter((c) => c.id !== id);
    set({ mine });
    saveUserCache(mine, get().shared);
    // Deleting the collection you're studying falls back to the default.
    if (get().activeId === id) get().setActive(DEFAULT_COLLECTION_ID);
  },

  shareCollection: async (id) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const target = get().mine.find((c) => c.id === id);
    if (target && !target.isPublic) {
      const { error } = await supabase.from('collections').update({ is_public: true }).eq('id', id);
      if (error) throw new Error(error.message);
      const mine = get().mine.map((c) => (c.id === id ? { ...c, isPublic: true } : c));
      set({ mine });
      saveUserCache(mine, get().shared);
    }
    return collectionShareUrl(id);
  },

  fetchById: async (id) => {
    const cached = get().getUserCollection(id);
    if (cached) return cached;
    if (!supabase) return null;
    const { data } = await supabase.from('collections').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    const col = rowToCollection(data);
    const shared = { ...get().shared, [id]: col };
    set({ shared });
    saveUserCache(get().mine, shared);
    return col;
  },
}));

/** Persist the selected collection onto the user's settings row (fire-and-forget). */
function syncActive(id: string, userId?: string) {
  if (!supabase) return;
  const client = supabase;
  (async () => {
    let uid = userId;
    if (!uid) {
      const { data } = await client.auth.getSession();
      uid = data.session?.user.id;
    }
    if (!uid) return;
    const { error } = await client.from('user_settings').upsert({
      user_id: uid,
      active_collection: id,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('[voca] collection sync error:', error.message);
  })();
}
