import { callAiAction } from './aiProviders';
import { fetchWordData } from './wordApi';
import { getLearnLanguage, getMotherLanguage } from './languages';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useCollections } from '../hooks/useCollections';
import { isDue, dueTime } from './spacedRepetition';
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
function cachePrefix(): string {
  // Bump the version when the cached word shape changes (v7: idioms) so stale
  // entries are re-fetched instead of shown missing — or worse, outdated —
  // fields. A cached entry is never refreshed on its own, so a shape that
  // landed without a bump stays wrong on that device forever.
  return `voca-word-v7-${getLearnLanguage()}-${getMotherLanguage()}-`;
}

function cacheKey(word: string): string {
  return cachePrefix() + word;
}

/** Stamp used for eviction ordering. Absent on entries cached before this existed. */
interface CachedWord extends VocabularyWord {
  _cachedAt?: number;
}

function getCachedWord(word: string): VocabularyWord | null {
  try {
    const raw = localStorage.getItem(cacheKey(word));
    if (raw) return JSON.parse(raw) as VocabularyWord;
  } catch { /* ignore */ }
  return null;
}

/**
 * A word's data if this device already holds it, without touching the network.
 *
 * Lets the peek popup paint its content on the first frame for a word already
 * seen, instead of flashing a spinner at something we can already answer.
 */
export function cachedWordData(word: string): VocabularyWord | null {
  return getCachedWord(word);
}

/**
 * Full data for the most recently seen words still cached on this device,
 * oldest-first (the order the Learn page's history strip renders in).
 *
 * Restores that strip across reloads. Words without cached data are skipped
 * rather than fetched, so this is synchronous, free, and works offline — the
 * strip is navigation, not a reason to hit the network.
 */
export function recentCachedWords(limit = 12): VocabularyWord[] {
  const progress = useVocabularyStore.getState().progress;
  const recent = Object.values(progress).sort((a, b) => b.seenAt.localeCompare(a.seenAt));
  const out: VocabularyWord[] = [];
  for (const p of recent) {
    if (out.length >= limit) break;
    const data = getCachedWord(p.word);
    if (data) out.push(data);
  }
  return out.reverse();
}

/**
 * Words whose data is already on this device, lowercased.
 *
 * This is the set the app can serve with no network at all — selection consults
 * it when offline so it doesn't hand back a word it then can't render.
 */
export function cachedWordSet(): Set<string> {
  const prefix = cachePrefix();
  const out = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) out.add(key.slice(prefix.length).toLowerCase());
    }
  } catch { /* ignore */ }
  return out;
}

/**
 * Drop the `count` oldest cached words. Returns how many were removed.
 *
 * Entries predating `_cachedAt` sort oldest, which is what we want — they're
 * the ones most likely to be on a superseded shape anyway.
 */
function evictOldestWords(count: number): number {
  const prefix = cachePrefix();
  const entries: { key: string; at: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      let at = 0;
      try {
        at = (JSON.parse(localStorage.getItem(key) ?? '{}') as CachedWord)._cachedAt ?? 0;
      } catch { /* treat unparseable as oldest */ }
      entries.push({ key, at });
    }
  } catch {
    return 0;
  }
  entries.sort((a, b) => a.at - b.at);
  let removed = 0;
  for (const e of entries.slice(0, count)) {
    try {
      localStorage.removeItem(e.key);
      removed++;
    } catch { /* ignore */ }
  }
  return removed;
}

function cacheWord(word: VocabularyWord) {
  const payload = JSON.stringify({ ...word, _cachedAt: Date.now() } satisfies CachedWord);
  try {
    localStorage.setItem(cacheKey(word.word), payload);
  } catch {
    // Almost certainly the storage quota. Swallowing this silently means the
    // cache stops accepting anything once full — and offline support decays
    // without a single error. Make room and try once more.
    if (evictOldestWords(25) > 0) {
      try {
        localStorage.setItem(cacheKey(word.word), payload);
      } catch { /* still no room — give up rather than loop */ }
    }
  }
}

// ─── Misspelling cache ──────────────────────────────────────────────
// The local half of the negative cache (the shared half is the `word_rejects`
// table). The server already answers a known typo without an AI call; this saves
// the round trip too, so re-searching one is instant.
//
// No mother language in the key: a verdict is about the word itself, and the
// suggestions are words, not translations.

function rejectKey(word: string): string {
  // Bump v1 whenever REJECT_VERSION moves in the `word` edge function, or these
  // clients will keep serving verdicts the server has already thrown out.
  return `voca-reject-v1-${getLearnLanguage()}-${word}`;
}

/** The stored suggestions for a known typo, or null if we've no verdict on it. */
function getCachedReject(word: string): string[] | null {
  try {
    const raw = localStorage.getItem(rejectKey(word));
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return null;
}

function cacheReject(word: string, suggestions: string[]) {
  try {
    localStorage.setItem(rejectKey(word), JSON.stringify(suggestions));
  } catch { /* ignore */ }
}

/**
 * Thrown when a lookup isn't a real word. Carries what it was probably meant to
 * be, so the caller can offer them instead of just failing.
 */
export class UnknownWordError extends Error {
  readonly word: string;
  readonly suggestions: string[];

  constructor(word: string, suggestions: string[]) {
    super(`"${word}" doesn't look like a real word.`);
    this.name = 'UnknownWordError';
    this.word = word;
    this.suggestions = suggestions;
  }
}

// ─── AI generation ──────────────────────────────────────────────────

/**
 * Load a word's data — from cache where possible, generating it if not. Throws
 * `UnknownWordError` (carrying suggestions) when the word isn't real.
 *
 * The word's level is decided server-side and comes back on the data; there's no
 * level to pass in.
 */
export async function generateWordData(
  word: string,
  signal?: AbortSignal,
): Promise<VocabularyWord> {
  // Order mirrors the server: a word we hold data for is real, whatever an older
  // verdict says.
  const cached = getCachedWord(word);
  if (cached) return cached;

  const knownBad = getCachedReject(word);
  if (knownBad) throw new UnknownWordError(word, knownBad);

  const learnLang = getLearnLanguage();
  const motherLang = getMotherLanguage();

  // The `word` edge function is cache-first and returns a ready object (it does
  // the generate/validate/retry server-side), so there's nothing to parse here.
  const result = await fetchWordData({ word, learnLang, motherLang }, signal);
  // A null word is the server's verdict that this isn't a real word.
  if (!result.word) {
    cacheReject(word, result.suggestions);
    throw new UnknownWordError(word, result.suggestions);
  }
  const data = result.word;
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

  // Offline, a word whose data isn't on the device can't be rendered — picking
  // one hands the user a spinner that never resolves. Narrow selection to what
  // the cache can actually serve instead. If nothing is cached we fall through
  // unchanged, so the failure is the honest one rather than an empty screen.
  let effectiveExclude = exclude;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline) {
    const cached = cachedWordSet();
    if (list.some((w) => cached.has(w.word.toLowerCase()))) {
      effectiveExclude = new Set(exclude);
      for (const w of list) {
        if (!cached.has(w.word.toLowerCase())) effectiveExclude.add(w.word);
      }
    }
  }

  // Skip the doomed round trip when we already know there's no network.
  const remote = offline
    ? null
    : await fetchPickedWords({
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
  const taken = new Set(effectiveExclude);
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
/**
 * The soonest-due item, but sampled from the few most overdue rather than a
 * strict argmin. Always returning the single earliest means one word wins every
 * pick until it's finally answered well — which is how a hard word ends up
 * dominating the rotation instead of merely being prioritised in it.
 */
export function pickSoonest<T>(items: T[], dueOf: (item: T) => number, spread = 5): T {
  const sorted = [...items].sort((a, b) => dueOf(a) - dueOf(b));
  return sorted[Math.floor(Math.random() * Math.min(spread, sorted.length))];
}

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
        return pickSoonest(dueDifficult, (w) => dueTime(prog(w.word)));
      }
    }
    return pick(pool);
  }

  // No difficult or new words left — fall back to the review schedule:
  // 1) due reviews of known words, soonest first.
  const due = inRotation.filter((w) => isDue(prog(w.word), now));
  if (due.length) {
    return pickSoonest(due, (w) => dueTime(prog(w.word)));
  }

  // 2) soonest upcoming non-mastered review.
  const upcoming = inRotation.filter((w) => {
    const p = prog(w.word);
    return !!p?.dueAt && !p.mastered;
  });
  if (upcoming.length) {
    return pickSoonest(upcoming, (w) => dueTime(prog(w.word)));
  }

  // Everything mastered / dismissed / excluded — pick anything still in
  // rotation, or anything at all, so the UI never stalls.
  return pick(inRotation.length ? inRotation : list);
}
