// Vocabulary collections — named groups of words the user can study. For now
// these are all client-side, bundled system collections:
//   • "Curated" — the hand-picked WORD_LIST
//   • "Level 1..6" — CEFR A1..C2 vocabulary (src/data/cefrWords.ts)
//   • Topics — themed sets like "Food & Drink" (src/data/topicWords.ts)
// Later these can be backed by a server table (public/private/shared); the shape
// here (id + words[]) is designed to map onto that without churn.

import type { VocabularyWord } from '../types';
import { WORD_LIST } from './wordService';
import { CEFR_WORDS, type CefrLevel } from '../data/cefrWords';
import { TOPIC_COLLECTIONS } from '../data/topicWords';
import { t } from '../i18n';

type W = { word: string; level: VocabularyWord['level'] };

/** `level` covers Curated and the CEFR bands; `topic` the themed sets. Screens
 *  with fixed room for system collections (Settings, the world map) show only
 *  levels — the Collections page shows both. */
export type CollectionKind = 'level' | 'topic';

export interface Collection {
  id: string;
  name: string;
  description: string;
  system: boolean;
  kind: CollectionKind;
  /** Iconify name — topics only. */
  icon?: string;
  words: W[];
}

export interface CollectionInfo {
  id: string;
  name: string;
  description: string;
  system: boolean;
  kind: CollectionKind;
  icon?: string;
  count: number;
}

export const DEFAULT_COLLECTION_ID = 'curated';

// CEFR band (1..6) → the app's coarse difficulty tag used by generation/UI.
function appLevel(cefr: CefrLevel): VocabularyWord['level'] {
  if (cefr <= 2) return 'beginner';
  if (cefr <= 4) return 'intermediate';
  return 'advanced';
}

const CEFR_META: { level: CefrLevel; descriptionId: string }[] = [
  { level: 1, descriptionId: 'collections.level1Desc' },
  { level: 2, descriptionId: 'collections.level2Desc' },
  { level: 3, descriptionId: 'collections.level3Desc' },
  { level: 4, descriptionId: 'collections.level4Desc' },
  { level: 5, descriptionId: 'collections.level5Desc' },
  { level: 6, descriptionId: 'collections.level6Desc' },
];

// Built lazily on first access. `collections.ts` sits in an import cycle with
// wordService (WORD_LIST) via the store; building at runtime (not module-eval)
// avoids reading WORD_LIST before it's initialized.
let cache: Collection[] | null = null;

export function getCollections(): Collection[] {
  if (cache) return cache;
  // A topic word takes its CEFR band when it has one; the few that don't
  // (e.g. "hoodie", "heatwave") default to intermediate.
  const cefrByWord = new Map(CEFR_WORDS.map((w) => [w.word, w.level]));
  // Names and descriptions of the built-ins are UI text, so they're getters:
  // the list is cached for the session, but each read is in today's language.
  cache = [
    {
      id: 'curated',
      get name() { return t('collections.curatedName'); },
      get description() { return t('collections.curatedDesc'); },
      system: true,
      kind: 'level',
      words: WORD_LIST,
    },
    ...CEFR_META.map((m): Collection => ({
      id: `level-${m.level}`,
      get name() { return t('collections.levelName', { level: m.level }); },
      get description() { return t(m.descriptionId); },
      system: true,
      kind: 'level',
      words: CEFR_WORDS.filter((w) => w.level === m.level).map((w) => ({ word: w.word, level: appLevel(w.level) })),
    })),
    ...TOPIC_COLLECTIONS.map((t): Collection => ({
      id: t.id,
      name: t.name,
      description: t.description,
      system: true,
      kind: 'topic',
      icon: t.icon,
      words: t.words.map((word) => {
        const cefr = cefrByWord.get(word);
        return { word, level: cefr ? appLevel(cefr) : 'intermediate' };
      }),
    })),
  ];
  return cache;
}

export function getCollection(id: string): Collection {
  const list = getCollections();
  return list.find((c) => c.id === id) ?? list[0];
}

/** Lightweight metadata for pickers (no word arrays), optionally one kind only. */
export function listCollections(kind?: CollectionKind): CollectionInfo[] {
  return getCollections()
    .filter((c) => !kind || c.kind === kind)
    .map(({ id, name, description, system, kind, icon, words }) => ({
      id, name, description, system, kind, icon, count: words.length,
    }));
}

export function isCollectionId(id: string): boolean {
  return getCollections().some((c) => c.id === id);
}
