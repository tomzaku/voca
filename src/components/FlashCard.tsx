import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'react-router-dom';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { generateWordData, pickNextWord } from '../lib/wordService';
import { reviewsUntilMastered } from '../lib/srs';
import { dequeue, fillPrefetchQueue, getPrefetchedWords } from '../lib/prefetchService';
import { WordTest } from './WordTest';
import { WordNotes } from './WordNotes';
import { GuessGame } from './GuessGame';
import { BuddyBadge } from './BuddyBadge';
import { useGuessGame } from '../hooks/useGuessGame';
import { useGameScore } from '../hooks/useGameScore';
import { useWordSearch } from '../hooks/useWordSearch';
import { speakText, stopSpeaking, isTtsPlaying } from '../lib/tts';
import { encodeWord, decodeWord } from '../lib/wordCode';
import type { VocabularyWord } from '../types';
import toast from 'react-hot-toast';

type CardPhase = 'loading' | 'introduce' | 'revealed';

// Retry transient generation failures (network / rate-limit) a few times with
// a short backoff. Aborts and missing-key errors won't succeed on retry, so
// bail on those immediately.
async function generateWithRetry(
  word: string,
  level: VocabularyWord['level'],
  signal: AbortSignal,
  retries = 3,
): Promise<VocabularyWord> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await generateWordData(word, level, signal);
    } catch (err) {
      lastErr = err;
      if ((err as Error).name === 'AbortError') throw err;
      if ((err as Error).message?.includes('API key')) throw err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  throw lastErr;
}

// A regex matching the answer word and its inflections (adumbrate →
// adumbrated/adumbrating/…). Drops a trailing silent 'e'/'y' so the stem covers
// -ed/-ing/-ies forms, and skips short tokens (a, an, of…). Returns null when
// there's nothing worth matching. Shared by the mask and the highlight.
function answerRegex(answer: string): RegExp | null {
  const stems = answer
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3)
    .map((t) => (/[ey]$/.test(t) ? t.slice(0, -1) : t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (stems.length === 0) return null;
  return new RegExp(`\\b(?:${stems.join('|')})[a-z]*\\b`, 'gi');
}

// Blank out the answer (and its inflections) in an example while guessing —
// otherwise an example could reveal the answer. Over-masking a rare look-alike
// is fine; leaking the answer is not.
function maskAnswer(example: string, answer: string): string {
  const re = answerRegex(answer);
  return re ? example.replace(re, '____') : example;
}

// Render an example with the answer word (and its inflections) bold + highlighted.
function highlightAnswer(example: string, answer: string): ReactNode {
  const re = answerRegex(answer);
  if (!re) return example;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(example)) !== null) {
    if (m.index > last) parts.push(example.slice(last, m.index));
    parts.push(
      <strong key={m.index} className="font-extrabold text-accent-purple">{m[0]}</strong>,
    );
    last = m.index + m[0].length;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length matches
  }
  if (last < example.length) parts.push(example.slice(last));
  return parts;
}

// Fetch a few relevant thumbnails from Openverse (Creative-Commons image
// search, no API key). Several small results give better context for a word's
// meaning than one large, often-unrelated guess. Returns [] on failure so the
// UI can simply hide the image area rather than show a random placeholder.
// Images only help for concrete things — i.e. nouns. For verbs/adjectives/etc.
// the search returns misleading pictures, so we skip images entirely.
function isNoun(wordData: VocabularyWord): boolean {
  return /noun/i.test(wordData.partOfSpeech ?? '');
}

async function fetchImageUrls(wordData: VocabularyWord): Promise<string[]> {
  const keyword = wordData.imageKeywords?.[0] || wordData.word;
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(keyword)}&page_size=6&mature=false`,
    );
    if (res.ok) {
      const data = await res.json() as { results?: { thumbnail?: string; url?: string }[] };
      const urls = (data.results ?? [])
        .map((r) => r.thumbnail || r.url)
        .filter((u): u is string => Boolean(u))
        .slice(0, 4);
      if (urls.length) return urls;
    }
  } catch { /* fall through */ }
  return [];
}

// Preferred accents to show, and how to label each locale.
const ACCENT_LABELS: { locale: string; label: string }[] = [
  { locale: 'en-US', label: 'US' },
  { locale: 'en-GB', label: 'UK' },
];

/** Per-accent pronunciations, keyed by locale (e.g. en-US, en-GB). */
function PhoneticList({ wordData }: { wordData: VocabularyWord }) {
  const map = wordData.phonetics ?? {};
  const entries = ACCENT_LABELS
    .filter((a) => map[a.locale])
    .map((a) => ({ label: a.label, ipa: map[a.locale] }));
  if (entries.length === 0) return null;
  return (
    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm font-code text-text-muted">
      {entries.map((e) => (
        <span key={e.label} className="flex items-center gap-1.5">
          <span className="text-[10px] font-display font-bold text-text-muted/70 uppercase tracking-wider">{e.label}</span>
          {e.ipa}
        </span>
      ))}
    </div>
  );
}

/** Synonyms + antonyms chips, shown under the definition in both phases. */
function SynAnt({ wordData }: { wordData: VocabularyWord }) {
  const hasSyn = (wordData.synonyms?.length ?? 0) > 0;
  const hasAnt = (wordData.antonyms?.length ?? 0) > 0;
  if (!hasSyn && !hasAnt) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-x-4 gap-y-2.5">
      {hasSyn && (
        <div>
          <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5">Synonyms</h4>
          <div className="flex flex-wrap gap-1.5">
            {wordData.synonyms!.map((s) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">{s}</span>
            ))}
          </div>
        </div>
      )}
      {hasAnt && (
        <div>
          <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5">Antonyms</h4>
          <div className="flex flex-wrap gap-1.5">
            {wordData.antonyms!.map((a) => (
              <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">{a}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example sentences, shown beneath the definition. While guessing (introduce),
 * shows the first two with the answer masked; once revealed, shows all with a
 * per-sentence read-aloud button.
 */
function ExampleList({ wordData, phase, speakingExample, onSpeak }: {
  wordData: VocabularyWord;
  phase: CardPhase;
  speakingExample: number | null;
  onSpeak: (index: number, text: string) => void;
}) {
  if (wordData.examples.length === 0) return null;
  const answerWord = wordData.headword || wordData.word;
  const examples = phase === 'introduce' ? wordData.examples.slice(0, 2) : wordData.examples;
  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">Examples</h4>
      <ul className="space-y-2">
        {examples.map((ex, i) => {
          const text = phase === 'introduce' ? maskAnswer(ex, answerWord) : ex;
          return (
            <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
              {phase === 'introduce' ? (
                <span className="text-accent-cyan shrink-0 mt-0.5">▸</span>
              ) : (
                <button
                  onClick={() => onSpeak(i, text)}
                  title="Read aloud"
                  className={`shrink-0 w-6 h-6 mt-0.5 rounded-md flex items-center justify-center border transition-all ${
                    speakingExample === i
                      ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
                      : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
                  }`}
                >
                  {speakingExample === i ? (
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                      <rect x="0" y="0" width="4" height="10" rx="1" /><rect x="6" y="0" width="4" height="10" rx="1" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
              )}
              <span className={phase === 'introduce' ? 'italic' : ''}>
                {phase === 'introduce' ? text : highlightAnswer(ex, answerWord)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FlashCard() {
  const { user, loading: authLoading } = useAuth();
  const store = useVocabularyStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [phase, setPhase] = useState<CardPhase>('loading');
  const [wordData, setWordData] = useState<VocabularyWord | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingExample, setSpeakingExample] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { game, setGame } = useGuessGame();
  const breakStreak = useGameScore((s) => s.breakStreak);
  // Whether the word was revealed by giving up (vs. actually solving it).
  // When given up, "Know it" makes no sense — just offer Next.
  const [gaveUp, setGaveUp] = useState(false);
  // Whether the current word was solved in the guess game (already recorded as a
  // review, so we don't also show a redundant "Know it" button).
  const [solved, setSolved] = useState(false);

  // History
  const wordHistoryRef = useRef<VocabularyWord[]>([]);
  const historyIndexRef = useRef(-1);
  const [wordHistory, setWordHistory] = useState<VocabularyWord[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  const pushWord = useCallback((data: VocabularyWord) => {
    // Drop any forward entries when a new word is pushed mid-history
    const base = wordHistoryRef.current.slice(0, historyIndexRef.current + 1);
    const newHistory = [...base, data];
    const newIndex = newHistory.length - 1;
    wordHistoryRef.current = newHistory;
    historyIndexRef.current = newIndex;
    setWordHistory(newHistory);
    setHistoryIndex(newIndex);
  }, []);

  const loadNextWord = useCallback(async (excludeWord?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    stopSpeaking();
    setIsSpeaking(false);
    setPhase('loading');
    setGaveUp(false);
    setSolved(false);
    setWordData(null);
    setImageUrls([]);
    setImagesLoading(false);

    const known = store.knownWords();
    const skipped = store.skippedWords();

    const queued = dequeue();
    if (queued && queued.word !== excludeWord) {
      pushWord(queued.data);
      setWordData(queued.data);
      setPhase('introduce');
      store.recordView(queued.word, user?.id);
      fillPrefetchQueue(known, skipped, queued.word);
      return;
    }

    const exclude = new Set(getPrefetchedWords());
    if (excludeWord) exclude.add(excludeWord);
    const { word, level } = pickNextWord(known, skipped, exclude);

    setIsGenerating(true);
    try {
      const data = await generateWithRetry(word, level, abortRef.current.signal);
      pushWord(data);
      setWordData(data);
      setPhase('introduce');
      store.recordView(word, user?.id);
      fillPrefetchQueue(known, skipped, word);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || 'Failed to load word.';
      toast.error(msg.includes('API key') ? msg : 'Failed to generate word data.');
      setPhase('loading');
    } finally {
      setIsGenerating(false);
    }
  }, [store, pushWord, user?.id]);

  const loadSpecificWord = useCallback(async (word: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    stopSpeaking();
    setIsSpeaking(false);
    setPhase('loading');
    setGaveUp(false);
    setSolved(false);
    setWordData(null);
    setImageUrls([]);
    setImagesLoading(false);
    setIsGenerating(true);
    try {
      const data = await generateWordData(word, 'intermediate', abortRef.current.signal);
      pushWord(data);
      setWordData(data);
      setPhase('revealed');
      store.recordView(word, user?.id);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || '';
      toast.error(msg.includes('API key') ? msg : `Could not find "${word}"`);
      setPhase('loading');
    } finally {
      setIsGenerating(false);
    }
  }, [pushWord, store, user?.id]);

  // Kick off the first word only once auth has resolved. AI calls are proxied
  // through the server and require the user's session token, so we wait for the
  // session to load before generating (avoids a spurious "please sign in").
  const didInit = useRef(false);
  useEffect(() => {
    if (authLoading || didInit.current) return;
    didInit.current = true;
    // Prefer the encoded `w` param; fall back to legacy plaintext `?word=` links.
    const encoded = searchParams.get('w');
    const wordParam = encoded ? decodeWord(encoded) : searchParams.get('word');
    const known = store.knownWords();
    const skipped = store.skippedWords();
    fillPrefetchQueue(known, skipped);
    // A header search may already be pending (e.g. navigated here from another
    // page) — the search effect below will load it, so don't load a default.
    if (useWordSearch.getState().pending) return;
    if (wordParam) {
      loadSpecificWord(wordParam);
    } else {
      loadNextWord();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Load a word requested from the header search (works whether this page was
  // already open or was just navigated to).
  const pendingSearch = useWordSearch((s) => s.pending);
  useEffect(() => {
    if (!pendingSearch) return;
    useWordSearch.getState().consume();
    loadSpecificWord(pendingSearch);
  }, [pendingSearch, loadSpecificWord]);

  // Abort any in-flight work on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!wordData) return;
    setSearchParams({ w: encodeWord(wordData.word) }, { replace: true });
    setImageUrls([]);
    // Skip images for non-nouns — the search would return misleading pictures.
    if (!isNoun(wordData)) {
      setImagesLoading(false);
      return;
    }
    setImagesLoading(true);
    let cancelled = false;
    fetchImageUrls(wordData).then((urls) => {
      if (cancelled) return;
      setImageUrls(urls);
      setImagesLoading(false);
    });
    return () => { cancelled = true; };
  }, [wordData, setSearchParams]);

  const handleReveal = () => {
    if (phase !== 'introduce' || !wordData) return;
    breakStreak(); // gave up without guessing
    store.markWord(wordData.word, 'skipped', user?.id); // giving up counts as a lapse
    setGaveUp(true);
    setPhase('revealed');
  };

  const handleSpeak = async () => {
    if (!wordData) return;
    if (isTtsPlaying() || isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    // Speak just the word — reading the whole definition + examples is slow.
    stopSpeaking();
    setSpeakingExample(null);
    setIsSpeaking(true);
    await speakText(wordData.headword || wordData.word, { onEnd: () => setIsSpeaking(false) });
  };

  const handleSpeakExample = async (index: number, text: string) => {
    if (speakingExample === index && isTtsPlaying()) {
      stopSpeaking();
      setSpeakingExample(null);
      return;
    }
    stopSpeaking();
    setIsSpeaking(false);
    setSpeakingExample(index);
    await speakText(text, { onEnd: () => setSpeakingExample(null) });
  };

  const handleSkip = () => {
    if (!wordData) return;
    if (phase === 'introduce') breakStreak(); // skipped without guessing
    store.markWord(wordData.word, 'skipped', user?.id);
    loadNextWord(wordData.word);
  };

  const handleBookmark = () => {
    if (!wordData) return;
    const saved = store.isBookmarked(wordData.word);
    store.setBookmarked(wordData.word, !saved, user?.id);
    toast.success(saved ? 'Removed from bookmarks' : 'Saved to bookmarks!');
  };

  const handleKnow = () => {
    if (!wordData) return;
    store.markWord(wordData.word, 'known', user?.id);
    toast.success('Great! Moving on.');
    loadNextWord(wordData.word);
  };

  const navigateToHistory = useCallback((index: number) => {
    if (index === historyIndexRef.current) return;
    const data = wordHistoryRef.current[index];
    if (!data) return;
    abortRef.current?.abort();
    stopSpeaking();
    setIsSpeaking(false);
    historyIndexRef.current = index;
    setHistoryIndex(index);
    setWordData(data);
    setGaveUp(false);
    setSolved(true); // past words are already resolved — no "Know it" prompt
    setPhase('revealed');
  }, []);

  const handlePrev = useCallback(() => {
    navigateToHistory(historyIndexRef.current - 1);
  }, [navigateToHistory]);

  const handleNext = useCallback(async () => {
    if (historyIndexRef.current < wordHistoryRef.current.length - 1) {
      navigateToHistory(historyIndexRef.current + 1);
    } else {
      const currentWord = wordHistoryRef.current[historyIndexRef.current]?.word;
      await loadNextWord(currentWord);
    }
  }, [navigateToHistory, loadNextWord]);

  // Auto-scroll the history strip to keep the current chip visible
  useEffect(() => {
    if (!historyScrollRef.current) return;
    const chips = historyScrollRef.current.querySelectorAll<HTMLButtonElement>('button');
    chips[historyIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [historyIndex]);

  const isBookmarked = wordData ? store.isBookmarked(wordData.word) : false;

  const levelColor: Record<string, string> = {
    beginner: 'text-accent-green bg-accent-green/10',
    intermediate: 'text-accent-orange bg-accent-orange/10',
    advanced: 'text-accent-red bg-accent-red/10',
  };

  return (
    <div className="max-w-[74rem] mx-auto px-3 sm:px-4 py-4 sm:py-8">


      {/* ── History navigation ── */}
      {wordHistory.length > 0 && (
        <div className="max-w-[74rem] mx-auto mb-5 flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={historyIndex <= 0 || isGenerating}
            className="btn-3d shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
            title="Previous word"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div
            ref={historyScrollRef}
            className="flex-1 flex gap-1.5 overflow-x-auto py-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {wordHistory.map((w, i) => {
              // Hide the current word while it's still being guessed — otherwise
              // the answer is readable straight off the history strip.
              const masked = i === historyIndex && phase === 'introduce';
              return (
                <button
                  key={i}
                  onClick={() => navigateToHistory(i)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap border-2 transition-all hover:-translate-y-0.5 ${i === historyIndex
                      ? 'bg-accent-cyan text-bg-primary border-accent-cyan'
                      : 'bg-bg-card border-border text-text-muted hover:text-text-primary hover:border-border-light'
                    }`}
                >
                  {masked ? '• • •' : (w.headword || w.word)}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNext}
            disabled={isGenerating}
            className="btn-3d shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
            title="Next word"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {phase === 'loading' ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          {isGenerating && (
            <p className="text-sm text-text-muted animate-fade-in">Generating word data...</p>
          )}
        </div>
      ) : wordData ? (
        <>
          {/* Progress row */}
          <div className="flex items-center justify-between gap-2 mb-5 text-xs text-text-muted">
            <span>
              <span className="text-accent-green font-medium">{store.knownWords().size}</span> known
              {' · '}
              <span className="text-accent-cyan font-medium">{store.bookmarkedWords().length}</span> saved
            </span>
            <div className="flex items-center gap-2">
              {(() => {
                const p = store.progress[wordData.word];
                const reps = p?.reps ?? 0;
                if (p?.mastered) {
                  return <span className="px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green font-medium">Mastered ✨</span>;
                }
                if (reps > 0) {
                  return (
                    <span className="px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple font-medium">
                      Seen {reps}× · {reviewsUntilMastered(p)} to master
                    </span>
                  );
                }
                return null;
              })()}
              <span className={`px-2 py-0.5 rounded font-medium ${levelColor[wordData.level]}`}>
                {wordData.level}
              </span>
            </div>
          </div>

          {/* Definition clue — surfaced at the top while guessing so the
              hint sits above the game (key for mobile flow) */}
          {phase === 'introduce' && (
            <div className="mb-4 sm:mb-5 card-game border-accent-cyan p-4 sm:p-5 animate-bounce-in">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl leading-none animate-bob">💡</span>
                <h3 className="text-sm font-display font-extrabold text-accent-cyan uppercase tracking-wide">
                  Definition — guess the word
                </h3>
                {wordData.partOfSpeech && (
                  <span className="text-[10px] font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded">
                    {wordData.partOfSpeech}
                  </span>
                )}
              </div>
              <p className="text-text-primary leading-relaxed text-base sm:text-lg">{wordData.definition}</p>
              <ExampleList wordData={wordData} phase={phase} speakingExample={speakingExample} onSpeak={handleSpeakExample} />
              <SynAnt wordData={wordData} />
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.618fr_1fr] gap-4 sm:gap-5 items-start">

            {/* ── Left column ── */}
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Images — a few small visual hints; drops below the game while
                  guessing so the definition → game flow stays tight on mobile */}
              {(imagesLoading || imageUrls.length > 0) && (
                <div className={phase === 'introduce' ? 'order-last lg:order-none' : ''}>
                  {imagesLoading ? (
                    <div className="h-24 flex items-center justify-center bg-bg-tertiary rounded-2xl">
                      <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent-cyan/40 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {imageUrls.map((url, i) => (
                        <div key={`${url}-${i}`} className="relative aspect-square bg-bg-tertiary rounded-xl overflow-hidden">
                          <img
                            src={url}
                            alt={`${wordData.word} visual ${i + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            // Drop thumbnails that fail to load so no broken tiles show
                            onError={() => setImageUrls((prev) => prev.filter((u) => u !== url))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {phase === 'introduce' ? (
                <GuessGame
                  key={wordData.word}
                  wordData={wordData}
                  game={game}
                  onGameChange={setGame}
                  onSolved={() => {
                    setGaveUp(false);
                    setSolved(true);
                    // Solving the guess counts as a successful review (schedules the word).
                    store.markWord(wordData.word, 'known', user?.id);
                    setPhase('revealed');
                  }}
                  onGaveUp={handleReveal}
                />
              ) : (
                /* Revealed word card */
                <div className="card-game border-accent-purple p-6 animate-bounce-in">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
                        <h1 className="text-2xl sm:text-4xl font-title text-accent-purple tracking-tight drop-shadow-[0_2px_0_var(--btn-lip)] break-words">
                          {wordData.headword || wordData.word}
                        </h1>
                        {wordData.partOfSpeech && (
                          <span className="text-xs font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded">
                            {wordData.partOfSpeech}
                          </span>
                        )}
                      </div>
                      <PhoneticList wordData={wordData} />
                    </div>
                    <button
                      onClick={handleSpeak}
                      className={`btn-3d w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-1 ${isSpeaking
                          ? 'bg-accent-cyan text-bg-primary'
                          : 'bg-bg-tertiary text-text-secondary hover:text-accent-cyan'
                        }`}
                      title={isSpeaking ? 'Stop' : 'Hear pronunciation'}
                    >
                      {isSpeaking ? (
                        <svg width="14" height="14" viewBox="0 0 10 10" fill="currentColor">
                          <rect x="0" y="0" width="4" height="10" rx="1" />
                          <rect x="6" y="0" width="4" height="10" rx="1" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Definition + synonyms/antonyms — kept together with the word so the
                  full meaning is front and center */}
              {phase === 'revealed' && (
                <div className="card-game p-5">
                  <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">
                    Definition
                  </h3>
                  <p className="text-text-primary leading-relaxed">{wordData.definition}</p>
                  {wordData.translation && (
                    <p className="mt-3 pt-3 border-t border-border/60 text-sm text-accent-cyan">
                      {wordData.translation}
                    </p>
                  )}
                  <ExampleList wordData={wordData} phase={phase} speakingExample={speakingExample} onSpeak={handleSpeakExample} />
                  <SynAnt wordData={wordData} />
                </div>
              )}

              {/* Actions */}
              {phase === 'introduce' ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleReveal}
                    className="btn-3d flex-1 flex items-center justify-center gap-2 py-4 bg-accent-orange text-bg-primary text-base font-bold"
                  >
                    <Icon icon="solar:flag-2-bold" className="text-2xl" />
                    Give up
                  </button>
                  <button
                    onClick={handleSkip}
                    className="btn-3d flex-1 flex items-center justify-center gap-2 py-4 bg-accent-blue text-bg-primary text-base font-bold"
                  >
                    <Icon icon="solar:skip-next-bold" className="text-2xl" />
                    Skip
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNext}
                    disabled={isGenerating}
                    className="btn-3d flex-1 flex flex-col items-center gap-1 py-3 bg-accent-cyan text-bg-primary"
                    title="Next word — keeps this word saved"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                    <span className="text-xs">Next</span>
                  </button>
                  <button
                    onClick={handleBookmark}
                    className={`btn-3d flex-1 flex flex-col items-center gap-1 py-3 ${isBookmarked
                        ? 'bg-accent-yellow text-bg-primary'
                        : 'bg-bg-card text-text-secondary hover:text-accent-yellow'
                      }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark this word'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-xs">{isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                  {/* "Know it" only makes sense when you actually solved it.
                      If you gave up, you don't know it — just move on. */}
                  {!gaveUp && !solved && (
                    <button
                      onClick={handleKnow}
                      className="btn-3d flex-1 flex flex-col items-center gap-1 py-3 bg-accent-green text-bg-primary"
                      title="I know this word!"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-xs">Know it</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Right column ── */}
            <div className="space-y-4">
              {/* Collocations — natural word pairings (revealed only) */}
              {phase === 'revealed' && (wordData.collocations?.length ?? 0) > 0 && (
                <div className="card-game p-4 sm:p-5">
                  <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
                    Common phrases
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {wordData.collocations!.map((c) => (
                      <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <BuddyBadge />
              {/* Notes + AI test (revealed only) */}
              {phase === 'revealed' && (
                <>
                  {/* Real-world usage — clips of the word in videos and movies */}
                  <div className="card-game p-5">
                    <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
                      See it used
                    </h3>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`https://youglish.com/pronounce/${encodeURIComponent(wordData.word)}/english`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-bg-tertiary hover:border-accent-red/40 hover:bg-accent-red/5 transition-all group"
                      >
                        <span className="w-8 h-8 rounded-lg bg-accent-red/10 text-accent-red flex items-center justify-center shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23 12s0-3.9-.5-5.8a3 3 0 0 0-2.1-2.1C18.5 3.6 12 3.6 12 3.6s-6.5 0-8.4.5A3 3 0 0 0 1.5 6.2C1 8.1 1 12 1 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 0 0 2.1-2.1C23 15.9 23 12 23 12zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary">Real videos (YouGlish)</p>
                          <p className="text-xs text-text-muted">Hear “{wordData.word}” spoken in real YouTube clips</p>
                        </div>
                      </a>
                      <a
                        href={`https://www.playphrase.me/#/search?q=${encodeURIComponent(wordData.word)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-bg-tertiary hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all"
                      >
                        <span className="w-8 h-8 rounded-lg bg-accent-purple/10 text-accent-purple flex items-center justify-center shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary">Movie clips (PlayPhrase)</p>
                          <p className="text-xs text-text-muted">Scenes from films using “{wordData.word}”</p>
                        </div>
                      </a>
                    </div>
                  </div>

                  <WordTest wordData={wordData} />
                  <WordNotes word={wordData.word} />
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
