// Vocabulary placement test. CEFR levels form a natural difficulty ladder, so we
// sample a few words from each level, ask which the user knows, and map the
// deepest level they mostly know onto a recommended collection.

import { CEFR_WORDS, type CefrLevel } from '../data/cefrWords';
import { getCollection } from './collections';

const LEVELS: CefrLevel[] = [1, 2, 3, 4, 5, 6];
const WORDS_PER_BAND = 5;
const KNOWN_THRESHOLD = 0.5; // "mostly knows" this level → 3 of 5

export interface TestWord {
  word: string;
  band: number; // index into LEVELS
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A shuffled set of test words sampled evenly across the CEFR levels. */
export function buildPlacementTest(): TestWord[] {
  const out: TestWord[] = [];
  LEVELS.forEach((level, band) => {
    const pool = CEFR_WORDS.filter((w) => w.level === level);
    shuffle(pool)
      .slice(0, WORDS_PER_BAND)
      .forEach((w) => out.push({ word: w.word, band }));
  });
  return shuffle(out);
}

/**
 * Recommend a collection from the words the user marked as known. Find the
 * deepest level they still mostly know and recommend *that* level — a deliberate
 * step-down from the "next harder" level, guarding against over-reporting on a
 * self-assessment.
 */
export function scorePlacement(known: Set<string>, test: TestWord[]): { collectionId: string; label: string } {
  const counts = LEVELS.map(() => ({ known: 0, total: 0 }));
  for (const t of test) {
    counts[t.band].total++;
    if (known.has(t.word)) counts[t.band].known++;
  }

  let comfort = -1;
  counts.forEach((c, i) => {
    if (c.total > 0 && c.known / c.total >= KNOWN_THRESHOLD) comfort = i;
  });

  const collectionId = comfort < 0 ? 'level-1' : `level-${LEVELS[comfort]}`;
  return { collectionId, label: getCollection(collectionId).name };
}
