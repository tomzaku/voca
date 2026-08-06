import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useCollections } from '../hooks/useCollections';
import { getCollection } from '../lib/collections';
import { useAuth } from '../hooks/useAuth';
import {
  generateWordData,
  pickNextWords,
  recentCachedWords,
  UnknownWordError,
} from '../lib/wordService';
import { dequeue, fillPrefetchQueue, getPrefetchedWords } from '../lib/prefetchService';
import { useGuessGame } from '../hooks/useGuessGame';
import { useGameScore } from '../hooks/useGameScore';
import { useTeams } from '../hooks/useTeams';
import { useWordSearch } from '../hooks/useWordSearch';
import { useWordDoodle } from '../hooks/useWordDoodle';
import { useIsPro } from '../hooks/useProStatus';
import { stopSpeaking } from '../lib/tts';
import { encodeWord, decodeWord } from '../lib/wordCode';
import { SimilarWords } from './SimilarWords';
import { GuessView } from './flashcard/GuessView';
import { RevealedView } from './flashcard/RevealedView';
import { HistoryStrip } from './flashcard/HistoryStrip';
import { useCardSpeech } from './flashcard/useCardSpeech';
import { FULL_DEF_KEY } from './flashcard/constants';
import type { AnswerVia, VocabularyWord } from '../types';
import toast from 'react-hot-toast';

// The flash card owns the word — loading it, remembering which ones came
// before, recording what the learner did with it — and hands the rendering to
// one of two faces: `GuessView` while the word is hidden, `RevealedView` once
// it isn't. Everything those two need is passed to them, so neither can reach
// into the card's loading state and neither can show the other's material.

/** How many previously-seen words the history strip is restored with. */
const HISTORY_RESTORE_LIMIT = 12;

// 'unknown' = the search wasn't a real word; the card is replaced by suggestions.
type CardPhase = 'loading' | 'introduce' | 'revealed' | 'unknown';

// Retry transient generation failures (network / rate-limit) a few times with
// a short backoff. Aborts, missing-key errors, and words the server says aren't
// real won't succeed on retry, so bail on those immediately.
async function generateWithRetry(
  word: string,
  signal: AbortSignal,
  retries = 3,
): Promise<VocabularyWord> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await generateWordData(word, signal);
    } catch (err) {
      lastErr = err;
      if ((err as Error).name === 'AbortError') throw err;
      if (err instanceof UnknownWordError) throw err;
      if ((err as Error).message?.includes('API key')) throw err;
      // Offline won't recover inside a 1.8s backoff — fail now and let the
      // caller say so, rather than spinning through three doomed attempts.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  throw lastErr;
}

export function FlashCard() {
  const { user, loading: authLoading } = useAuth();
  const store = useVocabularyStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [phase, setPhase] = useState<CardPhase>('loading');
  const [wordData, setWordData] = useState<VocabularyWord | null>(null);
  // The rejected search behind the 'unknown' phase, with what it likely meant.
  const [unknown, setUnknown] = useState<{ word: string; suggestions: string[] } | null>(null);
  // Definitions default to the short one-liner (when cached); the toggle to
  // the full definition is remembered across sessions.
  const [fullDef, setFullDef] = useState(() => {
    try { return localStorage.getItem(FULL_DEF_KEY) === '1'; } catch { return false; }
  });
  const toggleFullDef = () => setFullDef((v) => {
    const next = !v;
    try { localStorage.setItem(FULL_DEF_KEY, next ? '1' : '0'); } catch { /* private mode */ }
    return next;
  });
  // The short one-liner when preferred and available, else the full definition.
  const definitionText = (wd: VocabularyWord) =>
    !fullDef && wd.shortDefinition ? wd.shortDefinition : wd.definition;
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { isPro } = useIsPro();
  // Drawn in the background — the card never waits for it (see useWordDoodle).
  const doodle = useWordDoodle(wordData, isPro);
  const speech = useCardSpeech(wordData);
  // Pulled out on its own: `stop` is stable, so the loaders below can depend on
  // it without being rebuilt every time the speaking indicator flips.
  const { stop: stopSpeech } = speech;

  const { game, setGame } = useGuessGame();
  const breakStreak = useGameScore((s) => s.breakStreak);
  // Whether the word was revealed by giving up (vs. actually solving it).
  // When given up, "Know it" makes no sense — just offer Next.
  const [gaveUp, setGaveUp] = useState(false);
  // Whether the current word was solved in the guess game (already recorded as a
  // review, so we don't also show a redundant "Know it" button).
  const [solved, setSolved] = useState(false);
  // Wrong attempts made during the current round (typed guesses, wrong letters,
  // wrong picks — reported by GuessGame). The games differ in difficulty, so
  // mistakes are tallied here and recorded when the word is revealed.
  const roundMistakesRef = useRef(0);

  // History. Seeded from the words you've actually seen most recently rather
  // than starting empty every reload — the strip used to lose everything on
  // refresh, which made it look like it wasn't persisting anything.
  // `useState(fn)` so the lookup runs once, before the first word is pushed.
  const [restoredHistory] = useState(() => recentCachedWords(HISTORY_RESTORE_LIMIT));
  const wordHistoryRef = useRef<VocabularyWord[]>(restoredHistory);
  const historyIndexRef = useRef(restoredHistory.length - 1);
  const [wordHistory, setWordHistory] = useState<VocabularyWord[]>(restoredHistory);
  const [historyIndex, setHistoryIndex] = useState(restoredHistory.length - 1);

  const pushWord = useCallback((data: VocabularyWord) => {
    // Drop any forward entries when a new word is pushed mid-history
    const base = wordHistoryRef.current.slice(0, historyIndexRef.current + 1);
    // Restored history typically ends on the word that's about to load, and an
    // adjacent duplicate is never useful in a back/forward strip.
    if (base[base.length - 1]?.word === data.word) base.pop();
    const newHistory = [...base, data];
    const newIndex = newHistory.length - 1;
    wordHistoryRef.current = newHistory;
    historyIndexRef.current = newIndex;
    setWordHistory(newHistory);
    setHistoryIndex(newIndex);
  }, []);

  const loadNextWord = useCallback(async (excludeWord?: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    stopSpeech();
    setPhase('loading');
    setGaveUp(false);
    setSolved(false);
    roundMistakesRef.current = 0;
    setWordData(null);
    setUnknown(null);

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
    setIsGenerating(true);
    // Server-side pick (authoritative cross-device progress), local fallback.
    const [next] = await pickNextWords(exclude);
    if (!next) {
      setIsGenerating(false);
      toast.error('No words to study in this collection.');
      return;
    }
    const { word } = next;

    try {
      const data = await generateWithRetry(word, ctrl.signal);
      if (ctrl.signal.aborted) return; // superseded by a newer load
      pushWord(data);
      setWordData(data);
      setPhase('introduce');
      store.recordView(word, user?.id);
      fillPrefetchQueue(known, skipped, word);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // A word from the list shouldn't be rejected, but if the model gets one
      // wrong, show the suggestions page rather than stranding on the spinner.
      if (err instanceof UnknownWordError) {
        if (ctrl.signal.aborted) return;
        setUnknown({ word: err.word, suggestions: err.suggestions });
        setPhase('unknown');
        return;
      }
      const msg = (err as Error).message || 'Failed to load word.';
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      toast.error(
        msg.includes('API key')
          ? msg
          : offline
            ? "You're offline — only words you've already opened are available."
            : 'Failed to generate word data.',
      );
      setPhase('loading');
    } finally {
      setIsGenerating(false);
    }
  }, [store, pushWord, user?.id, stopSpeech]);

  // `reveal: false` opens the word in guess mode (the `?w=` encoded link);
  // everything else — a header search, a `?word=` link — shows it outright.
  const loadSpecificWord = useCallback(async (word: string, reveal = true) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    stopSpeech();
    setPhase('loading');
    setGaveUp(false);
    setSolved(false);
    roundMistakesRef.current = 0;
    setWordData(null);
    setUnknown(null);
    setIsGenerating(true);
    try {
      const data = await generateWordData(word, ctrl.signal);
      // A newer load superseded this one while we awaited (e.g. the StrictMode
      // dev remount) — its result is already on screen, don't push a duplicate.
      if (ctrl.signal.aborted) return;
      pushWord(data);
      setWordData(data);
      setPhase(reveal ? 'revealed' : 'introduce');
      store.recordView(word, user?.id);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Not a real word — offer what they probably meant instead of a dead end.
      // A locally-cached verdict throws without ever hitting the network, so
      // there's no AbortError to catch above: check for a superseding load here.
      if (err instanceof UnknownWordError) {
        if (ctrl.signal.aborted) return;
        setUnknown({ word: err.word, suggestions: err.suggestions });
        setPhase('unknown');
        return;
      }
      const msg = (err as Error).message || '';
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      toast.error(
        msg.includes('API key')
          ? msg
          : offline
            ? `You're offline — "${word}" hasn't been downloaded yet.`
            : `Could not find "${word}"`,
      );
      setPhase('loading');
    } finally {
      setIsGenerating(false);
    }
  }, [pushWord, store, user?.id, stopSpeech]);

  // Kick off the first word only once auth has resolved. AI calls are proxied
  // through the server and require the user's session token, so we wait for the
  // session to load before generating (avoids a spurious "please sign in").
  const didInit = useRef(false);
  useEffect(() => {
    if (authLoading || didInit.current) return;
    didInit.current = true;
    // Two link shapes, two modes: `?w=<base64>` hides the answer and opens the
    // guess game, `?word=<plaintext>` names the word so it opens revealed.
    const encoded = searchParams.get('w');
    const plain = searchParams.get('word');
    const wordParam = encoded ? decodeWord(encoded) : plain;
    const reveal = !encoded;
    const known = store.knownWords();
    const skipped = store.skippedWords();
    fillPrefetchQueue(known, skipped);
    // A header search may already be pending (e.g. navigated here from another
    // page) — the search effect below will load it, so don't load a default.
    if (useWordSearch.getState().pending) return;
    if (wordParam) {
      loadSpecificWord(wordParam, reveal);
    } else {
      loadNextWord();
    }
    // StrictMode (dev) unmount/remount: the unmount cleanup below aborts the
    // load this effect kicked off; reset the guard so the remount's run loads
    // again instead of leaving the card stuck on the spinner.
    return () => { didInit.current = false; };
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

  // Keep the URL in step with the mode: while the word is still hidden it's
  // `?w=<base64>` (sharing the link doesn't spoil the guess); once it's on
  // screen the link becomes `?word=<the word>`, which reopens it revealed.
  useEffect(() => {
    if (!wordData) return;
    if (phase === 'introduce') {
      setSearchParams({ w: encodeWord(wordData.word) }, { replace: true });
    } else if (phase === 'revealed') {
      setSearchParams({ word: wordData.word }, { replace: true });
    }
  }, [wordData, phase, setSearchParams]);

  // `via` is the guess game that ended in giving up; the Reveal button (no
  // game finished) falls back to the generic flash-card tag.
  const handleReveal = (via: AnswerVia = 'flashcard') => {
    if (phase !== 'introduce' || !wordData) return;
    breakStreak(); // gave up without guessing
    // Giving up counts as a lapse; the round's wrong attempts are recorded too.
    store.markWord(wordData.word, 'skipped', user?.id, roundMistakesRef.current, via);
    setGaveUp(true);
    setPhase('revealed');
  };

  const handleSolved = (playedGame: AnswerVia) => {
    if (!wordData) return;
    setGaveUp(false);
    setSolved(true);
    // Solving the guess counts as a successful review (schedules the word);
    // wrong attempts made along the way are recorded with it.
    store.markWord(wordData.word, 'known', user?.id, roundMistakesRef.current, playedGame);
    // The badge that shows the learner's place is on the revealed card they're
    // about to land on, so the score behind it is brought up to date now rather
    // than on their next visit.
    if (user) void useTeams.getState().recordAnswer();
    setPhase('revealed');
  };

  const handleSkip = () => {
    if (!wordData) return;
    if (phase === 'introduce') breakStreak(); // skipped without guessing
    // Skip = "don't show me this word again" — it leaves the rotation for good
    // (restorable from History), unlike giving up, which repeats the word.
    store.markWord(wordData.word, 'dismissed', user?.id, roundMistakesRef.current);
    toast(`"${wordData.headword || wordData.word}" won't be shown again`, { icon: '🙈' });
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
    store.markWord(wordData.word, 'known', user?.id, 0, 'flashcard');
    if (user) void useTeams.getState().recordAnswer();
    toast.success('Great! Moving on.');
    loadNextWord(wordData.word);
  };

  const navigateToHistory = useCallback((index: number) => {
    if (index === historyIndexRef.current) return;
    const data = wordHistoryRef.current[index];
    if (!data) return;
    abortRef.current?.abort();
    stopSpeech();
    historyIndexRef.current = index;
    setHistoryIndex(index);
    setWordData(data);
    setGaveUp(false);
    setSolved(true); // past words are already resolved — no "Know it" prompt
    roundMistakesRef.current = 0;
    setPhase('revealed');
  }, [stopSpeech]);

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

  // The collection currently being studied — shown on the history header.
  const activeCollectionId = useCollections((s) => s.activeId);
  const myCollections = useCollections((s) => s.mine);
  const sharedCollections = useCollections((s) => s.shared);
  const collectionName =
    myCollections.find((c) => c.id === activeCollectionId)?.name
    ?? sharedCollections[activeCollectionId]?.name
    ?? getCollection(activeCollectionId).name;

  return (
    <div className="max-w-page mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <HistoryStrip
        words={wordHistory}
        index={historyIndex}
        collectionName={collectionName}
        maskCurrent={phase === 'introduce'}
        busy={isGenerating}
        onPick={navigateToHistory}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {phase === 'loading' ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          {isGenerating && (
            <p className="text-sm text-text-muted animate-fade-in">Generating word data...</p>
          )}
        </div>
      ) : phase === 'unknown' && unknown ? (
        <SimilarWords
          word={unknown.word}
          suggestions={unknown.suggestions}
          onPick={(w) => loadSpecificWord(w)}
        />
      ) : !wordData ? null : phase === 'introduce' ? (
        <GuessView
          wordData={wordData}
          definition={definitionText(wordData)}
          fullDef={fullDef}
          onToggleFullDef={toggleFullDef}
          speech={speech}
          game={game}
          onGameChange={setGame}
          onSolved={handleSolved}
          onMistake={() => { roundMistakesRef.current += 1; }}
          onReveal={handleReveal}
          onSkip={handleSkip}
        />
      ) : (
        // Keyed by word: stepping through history swaps `wordData` while this
        // view stays mounted (revealed → revealed), so without a key React
        // reconciles the right column in place and its cards — idioms, notes —
        // carry the previous word's content over. A fresh subtree per word.
        <RevealedView
          key={wordData.word}
          wordData={wordData}
          doodle={doodle}
          definition={definitionText(wordData)}
          fullDef={fullDef}
          onToggleFullDef={toggleFullDef}
          speech={speech}
          progress={store.progress[wordData.word]}
          isBookmarked={store.isBookmarked(wordData.word)}
          showKnowIt={!gaveUp && !solved}
          busy={isGenerating}
          onNext={handleNext}
          onBookmark={handleBookmark}
          onKnow={handleKnow}
        />
      )}
    </div>
  );
}
