// Client for the `mindmap` resource — a server-side cache of generated mind
// maps, so revisiting a word set doesn't spend another AI call, and the
// picker can list past maps to reopen without regenerating.
//
//   GET  /mindmap ?motherLang=…                → { mindmaps }
//   GET  /mindmap/lookup ?words=…&motherLang=…  → { tree }
//   POST /mindmap                               → { id, tree }
//
// Reading is quiet: a signed-out user or a network hiccup should just fall
// through to generating (or reusing localStorage), never an error screen.
// Writing is best-effort from the caller's side — see WordMindMap.tsx, which
// fires it without awaiting.

import { request } from './api';

export interface MindMapNode {
  id: string;
  topic: string;
  emoji?: string;
  definition?: string;
  /** In the user's mother tongue, when word_cache has one for that language. */
  translation?: string;
  /** IPA for the word, US preferred over UK. */
  phonetic?: string;
  /** One example sentence. */
  example?: string;
  children: MindMapNode[];
}

export interface SavedMindmap {
  id: string;
  words: string[];
  tree: MindMapNode;
  createdAt: string;
  updatedAt: string;
}

/** This user's previously generated maps for a mother tongue, newest first. */
export async function listMindmaps(motherLang: string): Promise<SavedMindmap[]> {
  const res = await request.get<{ mindmaps: SavedMindmap[] }>('/mindmap', {
    params: { motherLang },
    quiet: true,
  });
  return res?.mindmaps ?? [];
}

/** A previously generated map for this exact word set + mother tongue, if any. */
export async function fetchMindmap(words: string[], motherLang: string): Promise<MindMapNode | null> {
  const res = await request.get<{ tree: MindMapNode | null }>('/mindmap/lookup', {
    params: { words: words.join(','), motherLang },
    quiet: true,
  });
  return res?.tree ?? null;
}

/** Save (or overwrite) the map for a word set + mother tongue. */
export async function saveMindmap(words: string[], motherLang: string, tree: MindMapNode): Promise<void> {
  await request.post('/mindmap', { words, motherLang, tree });
}
