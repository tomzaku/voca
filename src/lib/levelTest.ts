// Three-phase "tap the words you know" level test — shared by onboarding and
// the Find-my-level page. Each phase just displays words (no data loading, so
// it's instant): simple → everyday → advanced. A phase where the user knows
// EVERY word unlocks the next, harder one; otherwise the test ends and the
// deepest band they mostly know maps onto a Level collection.

import { CEFR_WORDS, type CefrLevel } from '../data/cefrWords';
import { getCollection } from './collections';

export interface PhaseSpec {
  /** Message ids — formatted at render time so the language can change. */
  nameId: string;
  descriptionId: string;
  bands: [CefrLevel, CefrLevel];
}

export const PHASES: PhaseSpec[] = [
  { nameId: 'levelTest.phaseSimple',   descriptionId: 'levelTest.phaseSimpleDesc',   bands: [1, 2] },
  { nameId: 'levelTest.phaseEveryday', descriptionId: 'levelTest.phaseEverydayDesc', bands: [3, 4] },
  { nameId: 'levelTest.phaseAdvanced', descriptionId: 'levelTest.phaseAdvancedDesc', bands: [5, 6] },
];

export const WORDS_PER_BAND = 5; // 2 bands × 5 = 10 word chips per phase
const KNOWN_THRESHOLD = 0.5;     // "mostly knows" a band → half its words

export interface PhaseWord {
  word: string;
  band: CefrLevel;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sample one phase's word chips: WORDS_PER_BAND from each of its two bands. */
export function buildPhase(spec: PhaseSpec): PhaseWord[] {
  const out: PhaseWord[] = [];
  for (const band of spec.bands) {
    const pool = CEFR_WORDS.filter((w) => w.level === band);
    out.push(...shuffle(pool).slice(0, WORDS_PER_BAND).map((w) => ({ word: w.word, band })));
  }
  return shuffle(out);
}

/**
 * Recommend a Level collection from everything shown across the phases played:
 * the deepest band the user knew at least half of. Nothing known → Level 1.
 */
export function recommendLevel(shown: PhaseWord[], known: Set<string>): { collectionId: string; label: string } {
  const counts = new Map<CefrLevel, { known: number; total: number }>();
  for (const { word, band } of shown) {
    const c = counts.get(band) ?? { known: 0, total: 0 };
    c.total++;
    if (known.has(word)) c.known++;
    counts.set(band, c);
  }
  let comfort: CefrLevel = 1;
  for (const band of [1, 2, 3, 4, 5, 6] as CefrLevel[]) {
    const c = counts.get(band);
    if (c && c.total > 0 && c.known / c.total >= KNOWN_THRESHOLD) comfort = band;
  }
  const collectionId = `level-${comfort}`;
  return { collectionId, label: getCollection(collectionId).name };
}
