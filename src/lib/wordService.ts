import { callAiAction } from './aiProviders';
import { fetchWordData } from './wordApi';
import { getLearnLanguage, getMotherLanguage } from './languages';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useCollections } from '../hooks/useCollections';
import { isDue, dueTime } from './srs';
import { progressLookup, wordBucket } from './progress';
import { fetchPickedWords } from './pickApi';
import type { VocabularyWord } from '../types';

// ─── Built-in word list ─────────────────────────────────────────────

export const WORD_LIST: { word: string; level: VocabularyWord['level'] }[] = [
  // Beginner
  { word: 'abundant', level: 'beginner' },
  { word: 'achieve', level: 'beginner' },
  { word: 'adapt', level: 'beginner' },
  { word: 'advocate', level: 'beginner' },
  { word: 'ambiguous', level: 'beginner' },
  { word: 'analyze', level: 'beginner' },
  { word: 'anxious', level: 'beginner' },
  { word: 'appreciate', level: 'beginner' },
  { word: 'approach', level: 'beginner' },
  { word: 'assure', level: 'beginner' },
  { word: 'benefit', level: 'beginner' },
  { word: 'capable', level: 'beginner' },
  { word: 'challenge', level: 'beginner' },
  { word: 'commit', level: 'beginner' },
  { word: 'confident', level: 'beginner' },
  { word: 'consistent', level: 'beginner' },
  { word: 'contribute', level: 'beginner' },
  { word: 'crucial', level: 'beginner' },
  { word: 'curious', level: 'beginner' },
  { word: 'decisive', level: 'beginner' },
  { word: 'dedicate', level: 'beginner' },
  { word: 'deliberate', level: 'beginner' },
  { word: 'diverse', level: 'beginner' },
  { word: 'efficient', level: 'beginner' },
  { word: 'emerge', level: 'beginner' },
  { word: 'empower', level: 'beginner' },
  { word: 'encourage', level: 'beginner' },
  { word: 'establish', level: 'beginner' },
  { word: 'evaluate', level: 'beginner' },
  { word: 'evolve', level: 'beginner' },
  { word: 'flexible', level: 'beginner' },
  { word: 'focus', level: 'beginner' },
  { word: 'genuine', level: 'beginner' },
  { word: 'grateful', level: 'beginner' },
  { word: 'humble', level: 'beginner' },
  { word: 'impact', level: 'beginner' },
  { word: 'initiative', level: 'beginner' },
  { word: 'inspire', level: 'beginner' },
  { word: 'integrate', level: 'beginner' },
  { word: 'invest', level: 'beginner' },
  // Intermediate
  { word: 'acquiesce', level: 'intermediate' },
  { word: 'affable', level: 'intermediate' },
  { word: 'alacrity', level: 'intermediate' },
  { word: 'altruistic', level: 'intermediate' },
  { word: 'ambivalent', level: 'intermediate' },
  { word: 'ameliorate', level: 'intermediate' },
  { word: 'anomaly', level: 'intermediate' },
  { word: 'apathy', level: 'intermediate' },
  { word: 'apprehensive', level: 'intermediate' },
  { word: 'arbitrary', level: 'intermediate' },
  { word: 'articulate', level: 'intermediate' },
  { word: 'astute', level: 'intermediate' },
  { word: 'audacious', level: 'intermediate' },
  { word: 'austere', level: 'intermediate' },
  { word: 'benevolent', level: 'intermediate' },
  { word: 'candid', level: 'intermediate' },
  { word: 'circumspect', level: 'intermediate' },
  { word: 'cogent', level: 'intermediate' },
  { word: 'complacent', level: 'intermediate' },
  { word: 'concise', level: 'intermediate' },
  { word: 'convoluted', level: 'intermediate' },
  { word: 'corroborate', level: 'intermediate' },
  { word: 'credulous', level: 'intermediate' },
  { word: 'culpable', level: 'intermediate' },
  { word: 'daunting', level: 'intermediate' },
  { word: 'debilitate', level: 'intermediate' },
  { word: 'deft', level: 'intermediate' },
  { word: 'delicate', level: 'intermediate' },
  { word: 'denounce', level: 'intermediate' },
  { word: 'deplete', level: 'intermediate' },
  { word: 'desolate', level: 'intermediate' },
  { word: 'diligent', level: 'intermediate' },
  { word: 'discern', level: 'intermediate' },
  { word: 'disparate', level: 'intermediate' },
  { word: 'eloquent', level: 'intermediate' },
  { word: 'elusive', level: 'intermediate' },
  { word: 'empirical', level: 'intermediate' },
  { word: 'enigmatic', level: 'intermediate' },
  { word: 'ephemeral', level: 'intermediate' },
  { word: 'equivocal', level: 'intermediate' },
  // Advanced
  { word: 'abstruse', level: 'advanced' },
  { word: 'acrimony', level: 'advanced' },
  { word: 'adumbrate', level: 'advanced' },
  { word: 'anachronism', level: 'advanced' },
  { word: 'anodyne', level: 'advanced' },
  { word: 'antipathy', level: 'advanced' },
  { word: 'aphorism', level: 'advanced' },
  { word: 'apotheosis', level: 'advanced' },
  { word: 'capricious', level: 'advanced' },
  { word: 'chicanery', level: 'advanced' },
  { word: 'corollary', level: 'advanced' },
  { word: 'corpulent', level: 'advanced' },
  { word: 'dearth', level: 'advanced' },
  { word: 'dilettante', level: 'advanced' },
  { word: 'ebullient', level: 'advanced' },
  { word: 'effulgent', level: 'advanced' },
  { word: 'egregious', level: 'advanced' },
  { word: 'enervate', level: 'advanced' },
  { word: 'equanimity', level: 'advanced' },
  { word: 'erudite', level: 'advanced' },
  { word: 'esoteric', level: 'advanced' },
  { word: 'fastidious', level: 'advanced' },
  { word: 'fatuous', level: 'advanced' },
  { word: 'feckless', level: 'advanced' },
  { word: 'felicitous', level: 'advanced' },
  { word: 'fractious', level: 'advanced' },
  { word: 'garrulous', level: 'advanced' },
  { word: 'grandiloquent', level: 'advanced' },
  { word: 'ignominious', level: 'advanced' },
  { word: 'impecunious', level: 'advanced' },
  { word: 'implacable', level: 'advanced' },
  { word: 'inchoate', level: 'advanced' },
  { word: 'inimical', level: 'advanced' },
  { word: 'inveterate', level: 'advanced' },
  { word: 'laconic', level: 'advanced' },
  { word: 'loquacious', level: 'advanced' },
  { word: 'magnanimous', level: 'advanced' },
  { word: 'mendacious', level: 'advanced' },
  { word: 'obsequious', level: 'advanced' },
  { word: 'perfidious', level: 'advanced' },
  { word: 'perspicacious', level: 'advanced' },
  { word: 'proclivity', level: 'advanced' },
  { word: 'propitious', level: 'advanced' },
  { word: 'recalcitrant', level: 'advanced' },
  { word: 'sanguine', level: 'advanced' },
  { word: 'sycophant', level: 'advanced' },
  { word: 'temerity', level: 'advanced' },
  { word: 'tenacious', level: 'advanced' },
  { word: 'truculent', level: 'advanced' },
  { word: 'vicarious', level: 'advanced' },
];

// ─── Cache ──────────────────────────────────────────────────────────

// Cache key includes the mother language so switching it regenerates entries
// (each carries a translation into that language).
function cacheKey(word: string): string {
  // Bump the version when the cached word shape changes (v6: wordFamily) so
  // stale entries are re-fetched instead of shown missing fields.
  return `voca-word-v6-${getLearnLanguage()}-${getMotherLanguage()}-${word}`;
}

function getCachedWord(word: string): VocabularyWord | null {
  try {
    const raw = localStorage.getItem(cacheKey(word));
    if (raw) return JSON.parse(raw) as VocabularyWord;
  } catch { /* ignore */ }
  return null;
}

function cacheWord(word: VocabularyWord) {
  try {
    localStorage.setItem(cacheKey(word.word), JSON.stringify(word));
  } catch { /* ignore */ }
}

// ─── AI generation ──────────────────────────────────────────────────

export async function generateWordData(
  word: string,
  level: VocabularyWord['level'],
  signal?: AbortSignal,
): Promise<VocabularyWord> {
  const cached = getCachedWord(word);
  if (cached) return cached;

  const learnLang = getLearnLanguage();
  const motherLang = getMotherLanguage();

  // The `word` edge function is cache-first and returns a ready object (it does
  // the generate/validate/retry server-side), so there's nothing to parse here.
  const data = await fetchWordData({ word, level, learnLang, motherLang }, signal);
  // Keep the seed as the stable identity (progress/selection/cache keys); the
  // returned word — a learn-language translation or a normalized/spell-corrected
  // English form — becomes the headword shown and guessed. Without this, review
  // progress is saved under a key the collection list never matches, so the
  // word looks forever-new and hogs the rotation.
  if (data.word !== word) {
    data.headword = data.word;
    data.word = word;
  }
  cacheWord(data);
  return data;
}

// ─── Cloze paragraph (drag-and-drop fill-the-gap game) ──────────────

export interface ClozeSegment {
  type: 'text' | 'blank';
  /** For 'text': the literal text. For 'blank': the correct word for that gap. */
  value: string;
}

export interface ClozeParagraph {
  segments: ClozeSegment[];
  /** The ordered correct answers, one per blank. */
  answers: string[];
}

/**
 * Generate a short paragraph that naturally uses each of `words` exactly once,
 * with every target word wrapped in [[ ]] so we can turn them into gaps. In a
 * non-English learn language the AI translates each word and wraps the
 * translation, so the draggable tiles match the gaps regardless of language.
 */
export async function generateClozeParagraph(
  words: string[],
  signal?: AbortSignal,
): Promise<ClozeParagraph> {
  const learnLang = getLearnLanguage();

  const MAX_ATTEMPTS = 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callAiAction('cloze', { words, learnLang }, { signal });
      const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const { paragraph } = JSON.parse(jsonText) as { paragraph: string };
      const parsed = parseCloze(paragraph);
      // Need at least two gaps for a meaningful drag-and-drop round.
      if (parsed.answers.length >= 2) return parsed;
      throw new Error('Paragraph had too few gaps.');
    } catch (err) {
      lastError = err;
      if ((err as Error).name === 'AbortError') throw err;
      if (attempt < MAX_ATTEMPTS) continue;
    }
  }

  throw lastError;
}

/** Split a `[[ ]]`-annotated paragraph into ordered text / blank segments. */
export function parseCloze(paragraph: string): ClozeParagraph {
  const segments: ClozeSegment[] = [];
  const answers: string[] = [];
  const re = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(paragraph)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: paragraph.slice(lastIndex, match.index) });
    }
    const answer = match[1].trim();
    segments.push({ type: 'blank', value: answer });
    answers.push(answer);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < paragraph.length) {
    segments.push({ type: 'text', value: paragraph.slice(lastIndex) });
  }
  return { segments, answers };
}

// ─── Active word list (the selected collection's words) ─────────────

export function getActiveWordList() {
  return useCollections.getState().activeWords();
}

// ─── Word selection ─────────────────────────────────────────────────

// Word selection: a 50/50 mix of "difficult" words (the last round failed, or
// more wrong answers than correct — they repeat until learned) and brand-new
// words. Words answered correctly stay away until their spaced-repetition
// review is due, and only surface once no difficult/new words remain. Mastered
// and dismissed words drop out of rotation.

/**
 * Pick the next `count` words to study. Selection runs on the SERVER (the
 * `pick` edge function) against the authoritative synced progress, so a device
 * with stale local data still gets the words the user is actually incorrect on
 * or has never checked. Offline / signed out / server trouble falls back to
 * `pickNextWord` — the same algorithm over local state.
 */
export async function pickNextWords(
  exclude: Set<string> = new Set(),
  count = 1,
): Promise<{ word: string; level: VocabularyWord['level'] }[]> {
  const list = getActiveWordList();
  if (list.length === 0) return [];

  const remote = await fetchPickedWords({
    words: list.map((w) => w.word),
    exclude: [...exclude],
    count,
    mode: 'learn',
  });
  if (remote) {
    // Map back onto the collection entries (restores the level metadata).
    const byLower = new Map(list.map((w) => [w.word.toLowerCase(), w]));
    const picks = remote
      .map((w) => byLower.get(w.toLowerCase()))
      .filter((w): w is (typeof list)[number] => Boolean(w));
    if (picks.length) return picks;
  }

  const picks: { word: string; level: VocabularyWord['level'] }[] = [];
  const taken = new Set(exclude);
  for (let i = 0; i < count; i++) {
    const p = pickNextWord(new Set(), new Set(), taken);
    if (!p || taken.has(p.word)) break; // list exhausted
    picks.push(p);
    taken.add(p.word);
  }
  return picks;
}

// Local selection — the fallback path and the reference implementation the
// server mirrors. (The known/skipped sets are no longer needed — progress in
// the store drives everything — but the signature is kept for call sites.)
export function pickNextWord(
  _knownWords: Set<string>,
  _skippedWords: Set<string>,
  exclude: Set<string> = new Set(),
): { word: string; level: VocabularyWord['level'] } {
  const list = getActiveWordList();
  const progress = useVocabularyStore.getState().progress;
  const now = Date.now();
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const prog = progressLookup(progress);

  // Dismissed words (the Skip button) never come back unless restored.
  const inRotation = list.filter(
    (w) => !exclude.has(w.word) && prog(w.word)?.status !== 'dismissed',
  );

  // Difficult words — the last round failed (gave up) or the word has more
  // wrong answers than correct. These need extra care until learned.
  const difficult = inRotation.filter((w) => wordBucket(prog(w.word)) === 'difficult');

  // New words — never answered yet.
  const fresh = inRotation.filter((w) => wordBucket(prog(w.word)) === 'pending');

  // 50/50 mix of difficult and new; when the coin-flipped pool is empty the
  // other takes its turn.
  const pools = Math.random() < 0.5 ? [difficult, fresh] : [fresh, difficult];
  for (const pool of pools) {
    if (!pool.length) continue;
    if (pool === difficult) {
      // Lapsed words come back promptly: due ones first, soonest first.
      const dueDifficult = pool.filter((w) => isDue(prog(w.word), now));
      if (dueDifficult.length) {
        dueDifficult.sort((a, b) => dueTime(prog(a.word)) - dueTime(prog(b.word)));
        return dueDifficult[0];
      }
    }
    return pick(pool);
  }

  // No difficult or new words left — fall back to the review schedule:
  // 1) due reviews of known words, soonest first.
  const due = inRotation.filter((w) => isDue(prog(w.word), now));
  if (due.length) {
    due.sort((a, b) => dueTime(prog(a.word)) - dueTime(prog(b.word)));
    return due[0];
  }

  // 2) soonest upcoming non-mastered review.
  const upcoming = inRotation.filter((w) => {
    const p = prog(w.word);
    return !!p?.dueAt && !p.mastered;
  });
  if (upcoming.length) {
    upcoming.sort((a, b) => dueTime(prog(a.word)) - dueTime(prog(b.word)));
    return upcoming[0];
  }

  // Everything mastered / dismissed / excluded — pick anything still in
  // rotation, or anything at all, so the UI never stalls.
  return pick(inRotation.length ? inRotation : list);
}
