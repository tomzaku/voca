import { create } from 'zustand';
import { DEFAULT_COLLECTION_ID, getCollection, isCollectionId } from '../lib/collections';
import { supabase } from '../lib/supabase';

const KEY = 'voca-collection';

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

interface CollectionsState {
  activeId: string;
  setActive: (id: string) => void;
  /** Which words the active collection studies. Synchronous — safe for pickNextWord etc. */
  activeWords: () => { word: string; level: 'beginner' | 'intermediate' | 'advanced' }[];
  /** Pull the selected collection from the user's settings row on login (remote wins). */
  loadFromRemote: (userId: string) => Promise<void>;
}

export const useCollections = create<CollectionsState>((set, get) => ({
  activeId: loadActive(),

  setActive: (id) => {
    if (!isCollectionId(id)) return;
    try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
    set({ activeId: id });
    syncActive(id);
  },

  activeWords: () => getCollection(get().activeId).words,

  loadFromRemote: async (userId) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('user_settings')
      .select('active_collection')
      .eq('user_id', userId)
      .maybeSingle();
    const remote = data?.active_collection as string | null | undefined;
    if (remote && isCollectionId(remote)) {
      try { localStorage.setItem(KEY, remote); } catch { /* ignore */ }
      set({ activeId: remote });
    } else {
      // Nothing valid on the server yet — push the local choice up.
      syncActive(get().activeId, userId);
    }
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
