// Vocabulary placement test. The word packs are cumulative frequency tiers, so
// the words a pack *adds* over the previous one form a natural difficulty band.
// We sample a few words from each band, ask which the user knows, and map the
// deepest band they mostly know onto a recommended pack.

import { buildWordList, WORD_PACKS, type PackId } from './wordLists';
import { WORD_LIST } from './wordService';

// One pack per difficulty band, easiest → hardest. `curated` is the base pool
// everything builds on, so it's the implicit floor (recommended when the user
// knows almost nothing above it).
const BAND_PACKS: PackId[] = ['top1000', 'top3000', 'top5000', 'top10000', 'top30000'];
const WORDS_PER_BAND = 5;
const KNOWN_THRESHOLD = 0.5; // "mostly knows" this band → 3 of 5

export interface TestWord {
  word: string;
  band: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A shuffled set of test words sampled evenly across the difficulty bands. */
export function buildPlacementTest(): TestWord[] {
  const seen = new Set<string>();
  for (const w of buildWordList('curated', WORD_LIST)) seen.add(w.word);

  const out: TestWord[] = [];
  BAND_PACKS.forEach((pack, band) => {
    const delta = buildWordList(pack, WORD_LIST).filter((w) => !seen.has(w.word));
    delta.forEach((w) => seen.add(w.word));
    shuffle(delta)
      .slice(0, WORDS_PER_BAND)
      .forEach((w) => out.push({ word: w.word, band }));
  });
  return shuffle(out);
}

/**
 * Recommend a pack from the words the user marked as known. We find the deepest
 * band they still mostly know and recommend *that* band's pack — one tier below
 * the "next harder" pack you'd naively suggest. That deliberate step-down guards
 * against people over-reporting what they know on a self-assessment.
 */
export function scorePlacement(known: Set<string>, test: TestWord[]): { pack: PackId; label: string } {
  const counts = BAND_PACKS.map(() => ({ known: 0, total: 0 }));
  for (const t of test) {
    counts[t.band].total++;
    if (known.has(t.word)) counts[t.band].known++;
  }

  let comfort = -1;
  counts.forEach((c, i) => {
    if (c.total > 0 && c.known / c.total >= KNOWN_THRESHOLD) comfort = i;
  });

  const pack: PackId = comfort < 0 ? 'curated' : BAND_PACKS[comfort];
  const label = WORD_PACKS.find((p) => p.id === pack)?.label ?? pack;
  return { pack, label };
}
