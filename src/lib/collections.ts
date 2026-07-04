// Vocabulary collections — named groups of words the user can study. For now
// these are all client-side, bundled system collections:
//   • "Curated" — the hand-picked WORD_LIST
//   • "Level 1..6" — CEFR A1..C2 vocabulary (src/data/cefrWords.ts)
// Later these can be backed by a server table (public/private/shared); the shape
// here (id + words[]) is designed to map onto that without churn.

import type { VocabularyWord } from '../types';
import { WORD_LIST } from './wordService';
import { CEFR_WORDS, type CefrLevel } from '../data/cefrWords';

type W = { word: string; level: VocabularyWord['level'] };

export interface Collection {
  id: string;
  name: string;
  description: string;
  system: boolean;
  words: W[];
}

export interface CollectionInfo {
  id: string;
  name: string;
  description: string;
  system: boolean;
  count: number;
}

export const DEFAULT_COLLECTION_ID = 'curated';

// CEFR band (1..6) → the app's coarse difficulty tag used by generation/UI.
function appLevel(cefr: CefrLevel): VocabularyWord['level'] {
  if (cefr <= 2) return 'beginner';
  if (cefr <= 4) return 'intermediate';
  return 'advanced';
}

const CEFR_META: { level: CefrLevel; name: string; description: string }[] = [
  { level: 1, name: 'Level 1', description: 'CEFR A1 · beginner essentials' },
  { level: 2, name: 'Level 2', description: 'CEFR A2 · elementary' },
  { level: 3, name: 'Level 3', description: 'CEFR B1 · intermediate' },
  { level: 4, name: 'Level 4', description: 'CEFR B2 · upper-intermediate' },
  { level: 5, name: 'Level 5', description: 'CEFR C1 · advanced' },
  { level: 6, name: 'Level 6', description: 'CEFR C2 · proficiency' },
];

// Built lazily on first access. `collections.ts` sits in an import cycle with
// wordService (WORD_LIST) via the store; building at runtime (not module-eval)
// avoids reading WORD_LIST before it's initialized.
let cache: Collection[] | null = null;

export function getCollections(): Collection[] {
  if (cache) return cache;
  cache = [
    { id: 'curated', name: 'Curated', description: 'Hand-picked vocabulary words', system: true, words: WORD_LIST },
    ...CEFR_META.map((m) => ({
      id: `level-${m.level}`,
      name: m.name,
      description: m.description,
      system: true,
      words: CEFR_WORDS.filter((w) => w.level === m.level).map((w) => ({ word: w.word, level: appLevel(w.level) })),
    })),
  ];
  return cache;
}

export function getCollection(id: string): Collection {
  const list = getCollections();
  return list.find((c) => c.id === id) ?? list[0];
}

/** Lightweight metadata for pickers (no word arrays). */
export function listCollections(): CollectionInfo[] {
  return getCollections().map(({ id, name, description, system, words }) => ({
    id, name, description, system, count: words.length,
  }));
}

export function isCollectionId(id: string): boolean {
  return getCollections().some((c) => c.id === id);
}
