import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { generateWordData, pickNextWord } from '../lib/wordService';
import { dequeue, fillPrefetchQueue, getPrefetchedWords } from '../lib/prefetchService';
import { WordTest } from './WordTest';
import { WordNotes } from './WordNotes';
import { speakWithKokoro, stopKokoroAudio, isKokoroPlaying } from '../lib/kokoroTts';
import type { VocabularyWord } from '../types';
import toast from 'react-hot-toast';

type CardPhase = 'loading' | 'introduce' | 'revealed';

async function fetchImageUrl(wordData: VocabularyWord): Promise<string> {
  const keyword = wordData.imageKeywords?.[0] || wordData.word;
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyword)}`,
    );
    if (res.ok) {
      const data = await res.json() as { thumbnail?: { source: string } };
      if (data.thumbnail?.source) return data.thumbnail.source;
    }
  } catch { /* fall through */ }
  return `https://picsum.photos/seed/${encodeURIComponent(wordData.word)}/600/300`;
}

export function FlashCard() {
  const { user } = useAuth();
  const store = useVocabularyStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [phase, setPhase] = useState<CardPhase>('loading');
  const [wordData, setWordData] = useState<VocabularyWord | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [guess, setGuess] = useState('');
  const [guessResult, setGuessResult] = useState<'correct' | 'wrong' | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const guessInputRef = useRef<HTMLInputElement>(null);

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
    stopKokoroAudio();
    setIsSpeaking(false);
    setPhase('loading');
    setWordData(null);
    setImageUrl(null);
    setImageLoaded(false);
    setGuess('');
    setGuessResult(null);
    setRevealedIndices(new Set());

    const known = store.knownWords();
    const skipped = store.skippedWords();

    const queued = dequeue();
    if (queued && queued.word !== excludeWord) {
      pushWord(queued.data);
      setWordData(queued.data);
      setPhase('introduce');
      fillPrefetchQueue(known, skipped, queued.word);
      return;
    }

    const exclude = new Set(getPrefetchedWords());
    if (excludeWord) exclude.add(excludeWord);
    const { word, level } = pickNextWord(known, skipped, exclude);

    setIsGenerating(true);
    try {
      const data = await generateWordData(word, level, abortRef.current.signal);
      pushWord(data);
      setWordData(data);
      setPhase('introduce');
      fillPrefetchQueue(known, skipped, word);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || 'Failed to load word.';
      toast.error(msg.includes('API key') ? msg : 'Failed to generate word data.');
      setPhase('loading');
    } finally {
      setIsGenerating(false);
    }
  }, [store, pushWord]);

  const loadSpecificWord = useCallback(async (word: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    stopKokoroAudio();
    setIsSpeaking(false);
    setPhase('loading');
    setWordData(null);
    setImageUrl(null);
    setImageLoaded(false);
    setGuess('');
    setGuessResult(null);
    setRevealedIndices(new Set());
    setIsGenerating(true);
    try {
      const data = await generateWordData(word, 'intermediate', abortRef.current.signal);
      pushWord(data);
      setWordData(data);
      setPhase('revealed');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || '';
      toast.error(msg.includes('API key') ? msg : `Could not find "${word}"`);
      setPhase('loading');
    } finally {
      setIsGenerating(false);
    }
  }, [pushWord]);

  useEffect(() => {
    const wordParam = searchParams.get('word');
    const known = store.knownWords();
    const skipped = store.skippedWords();
    fillPrefetchQueue(known, skipped);
    if (wordParam) {
      loadSpecificWord(wordParam);
    } else {
      loadNextWord();
    }
    return () => {
      abortRef.current?.abort();
      searchAbortRef.current?.abort();
      stopKokoroAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!wordData) return;
    setSearchParams({ word: wordData.word }, { replace: true });
    setImageUrl(null);
    setImageLoaded(false);
    fetchImageUrl(wordData).then(setImageUrl);
  }, [wordData, setSearchParams]);

  const handleReveal = () => {
    if (phase !== 'introduce') return;
    setPhase('revealed');
  };

  const handleGuess = () => {
    if (!wordData || !guess.trim()) return;
    const correct = guess.trim().toLowerCase() === wordData.word.toLowerCase();
    if (correct) {
      setGuessResult('correct');
      setTimeout(() => setPhase('revealed'), 800);
    } else {
      setGuessResult('wrong');
      setTimeout(() => {
        setGuessResult(null);
        setGuess('');
        guessInputRef.current?.focus();
      }, 900);
    }
  };

  const handleSpeak = async () => {
    if (!wordData) return;
    if (isKokoroPlaying() || isSpeaking) {
      stopKokoroAudio();
      setIsSpeaking(false);
      return;
    }
    const text = `${wordData.word}. ${wordData.definition}. ${wordData.examples.join(' ')}`;
    setIsSpeaking(true);
    await speakWithKokoro(text, { onEnd: () => setIsSpeaking(false) });
  };

  const handleSkip = () => {
    if (!wordData) return;
    store.markWord(wordData.word, 'skipped', user?.id);
    loadNextWord(wordData.word);
  };

  const handleBookmark = () => {
    if (!wordData) return;
    const current = store.getStatus(wordData.word);
    if (current === 'bookmarked') {
      store.removeWord(wordData.word, user?.id);
      toast.success('Removed from bookmarks');
    } else {
      store.markWord(wordData.word, 'bookmarked', user?.id);
      toast.success('Saved to bookmarks!');
    }
  };

  const handleKnow = () => {
    if (!wordData) return;
    store.markWord(wordData.word, 'known', user?.id);
    toast.success('Great! Moving on.');
    loadNextWord(wordData.word);
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase().replace(/\s+/g, ' ').split(' ')[0];
    if (!query) return;
    setSearchQuery('');
    loadSpecificWord(query);
  };

  const navigateToHistory = useCallback((index: number) => {
    if (index === historyIndexRef.current) return;
    const data = wordHistoryRef.current[index];
    if (!data) return;
    abortRef.current?.abort();
    stopKokoroAudio();
    setIsSpeaking(false);
    historyIndexRef.current = index;
    setHistoryIndex(index);
    setWordData(data);
    setPhase('revealed');
    setGuess('');
    setGuessResult(null);
    setRevealedIndices(new Set());
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

  const isBookmarked = wordData ? store.getStatus(wordData.word) === 'bookmarked' : false;

  const levelColor: Record<string, string> = {
    beginner: 'text-accent-green bg-accent-green/10',
    intermediate: 'text-accent-orange bg-accent-orange/10',
    advanced: 'text-accent-red bg-accent-red/10',
  };

  const hasSynAnt = (wordData?.synonyms?.length ?? 0) > 0 || (wordData?.antonyms?.length ?? 0) > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Search bar — always visible, centered ── */}
      <div className="max-w-xl mx-auto mb-8">
        <form onSubmit={handleSearch} className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {isGenerating ? (
              <div className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any word…"
            className="w-full bg-bg-card border border-border rounded-xl pl-10 pr-24 py-3 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/40 placeholder:text-text-muted transition-colors"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {searchQuery.trim() && (
            <button
              type="submit"
              disabled={isGenerating}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-accent-cyan text-bg-primary text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              Search
            </button>
          )}
        </form>

      </div>

      {/* ── History navigation ── */}
      {wordHistory.length > 0 && (
        <div className="max-w-5xl mx-auto mb-5 flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={historyIndex <= 0 || isGenerating}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-bg-card text-text-muted hover:text-text-primary hover:border-border-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
            {wordHistory.map((w, i) => (
              <button
                key={i}
                onClick={() => navigateToHistory(i)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  i === historyIndex
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                    : 'bg-bg-card border border-border text-text-muted hover:text-text-primary hover:border-border-light'
                }`}
              >
                {w.word}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={isGenerating}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-bg-card text-text-muted hover:text-text-primary hover:border-border-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
          <div className="flex items-center justify-between mb-5 text-xs text-text-muted">
            <span>
              <span className="text-accent-green font-medium">{store.knownWords().size}</span> known
              {' · '}
              <span className="text-accent-cyan font-medium">{store.bookmarkedWords().length}</span> saved
            </span>
            <span className={`px-2 py-0.5 rounded font-medium ${levelColor[wordData.level]}`}>
              {wordData.level}
            </span>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

            {/* ── Left column ── */}
            <div className="space-y-4">
              {/* Image */}
              <div className="relative h-56 bg-bg-tertiary rounded-2xl overflow-hidden">
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent-cyan/40 animate-spin" />
                  </div>
                )}
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="vocabulary visual"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)}
                  />
                )}
                {imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card/60 to-transparent" />
                )}
              </div>

              {phase === 'introduce' ? (
                /* Guess card */
                <div className="relative overflow-hidden bg-bg-card border border-border rounded-2xl p-6 space-y-5">
                  {/* Correct celebration overlay */}
                  {guessResult === 'correct' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-card/95 rounded-2xl z-10 animate-fade-in">
                      <div className="animate-pop-in text-center">
                        <div className="w-16 h-16 rounded-full bg-accent-green/20 border-2 border-accent-green/40 flex items-center justify-center mx-auto mb-3">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-green">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <p className="text-accent-green font-display font-bold text-2xl">Correct!</p>
                        <p className="text-text-muted text-xs mt-1">Revealing the word…</p>
                      </div>
                    </div>
                  )}
                  {/* Wrong flash overlay */}
                  {guessResult === 'wrong' && (
                    <div className="absolute inset-0 rounded-2xl bg-accent-red/10 pointer-events-none z-10 animate-flash-wrong" />
                  )}

                  <div className="flex items-center gap-2">
                    <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider">
                      Guess the word
                    </p>
                    {wordData.partOfSpeech && (
                      <span className="text-xs font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded">
                        {wordData.partOfSpeech}
                      </span>
                    )}
                  </div>

                  {/* Letter boxes */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {wordData.word.split('').map((char, i) => {
                      const isFirst = i === 0;
                      const isLast = i === wordData.word.length - 1;
                      const revealed = isFirst || isLast || revealedIndices.has(i);
                      const canReveal = !revealed && guessResult !== 'correct';
                      return revealed ? (
                        <span key={i} className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm uppercase border-2 border-accent-cyan bg-accent-cyan/10 text-accent-cyan">
                          {char}
                        </span>
                      ) : (
                        <button
                          key={i}
                          onClick={() => canReveal && setRevealedIndices((prev) => new Set([...prev, i]))}
                          disabled={!canReveal}
                          title="Click to reveal this letter"
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm uppercase border-2 border-border bg-bg-tertiary text-transparent select-none hover:border-accent-cyan/40 hover:bg-accent-cyan/5 cursor-pointer transition-all"
                        >
                          ·
                        </button>
                      );
                    })}
                  </div>

                  {/* Guess input */}
                  <div className="space-y-2">
                    <div className={`flex gap-2 transition-all ${guessResult === 'wrong' ? 'animate-shake' : ''}`}>
                      <input
                        ref={guessInputRef}
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
                        placeholder="Type your guess…"
                        disabled={guessResult === 'correct'}
                        className={`flex-1 bg-bg-tertiary border rounded-xl px-4 py-3 text-text-primary text-sm font-display focus:outline-none placeholder:text-text-muted transition-colors ${
                          guessResult === 'correct'
                            ? 'border-accent-green bg-accent-green/10 text-accent-green'
                            : guessResult === 'wrong'
                            ? 'border-accent-red bg-accent-red/10'
                            : 'border-border focus:border-accent-cyan/50'
                        }`}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <button
                        onClick={handleGuess}
                        disabled={!guess.trim() || guessResult === 'correct'}
                        className="px-4 py-3 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
                      >
                        {guessResult === 'correct' ? '✓' : 'Check'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Revealed word card */
                <div className="bg-bg-card border border-border rounded-2xl p-6 animate-flip-in">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-4xl font-display font-bold text-text-primary tracking-tight mb-1">
                        {wordData.word}
                      </h1>
                      {wordData.phonetic && (
                        <p className="text-sm font-code text-text-muted">{wordData.phonetic}</p>
                      )}
                    </div>
                    <button
                      onClick={handleSpeak}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 mt-1 ${
                        isSpeaking
                          ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
                          : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
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
                  {wordData.partOfSpeech && (
                    <span className="inline-block mt-3 text-xs font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded">
                      {wordData.partOfSpeech}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              {phase === 'introduce' ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleReveal}
                    className="flex-1 py-2.5 rounded-xl border border-accent-orange/30 bg-accent-orange/5 text-accent-orange text-xs font-medium hover:bg-accent-orange/15 hover:border-accent-orange/50 active:scale-95 transition-all duration-150"
                  >
                    Give up
                  </button>
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-2.5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/15 hover:border-accent-cyan/50 active:scale-95 transition-all duration-150"
                  >
                    Skip word
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSkip}
                    className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-border bg-bg-card text-text-muted hover:text-text-primary hover:border-border-light transition-all"
                    title="Skip this word for now"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" /><line x1="20" y1="6" x2="20" y2="18" />
                    </svg>
                    <span className="text-xs">Skip</span>
                  </button>
                  <button
                    onClick={handleBookmark}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                      isBookmarked
                        ? 'bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow'
                        : 'border-border bg-bg-card text-text-muted hover:text-accent-yellow hover:border-accent-yellow/30'
                    }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark this word'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-xs">{isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleKnow}
                    className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-accent-green/30 bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-all"
                    title="I know this word!"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-xs">Know it</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Right column ── */}
            <div className="space-y-4">
              {/* Definition */}
              <div className="bg-bg-card border border-border rounded-2xl p-5">
                <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">
                  Definition
                </h3>
                <p className="text-text-primary leading-relaxed">{wordData.definition}</p>
              </div>

              {/* Examples */}
              {wordData.examples.length > 0 && (
                <div className="bg-bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
                    Examples
                  </h3>
                  <ul className="space-y-2">
                    {(phase === 'introduce' ? wordData.examples.slice(0, 2) : wordData.examples).map((ex, i) => {
                      const text = phase === 'introduce'
                        ? ex.replace(new RegExp(`\\b${wordData.word}\\b`, 'gi'), '____')
                        : ex;
                      return (
                        <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
                          <span className="text-accent-cyan shrink-0 mt-0.5">▸</span>
                          <span className={phase === 'introduce' ? 'italic' : ''}>{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Synonyms + Antonyms */}
              {hasSynAnt && (
                <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
                  {wordData.synonyms && wordData.synonyms.length > 0 && (
                    <div>
                      <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">
                        Synonyms
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {wordData.synonyms.map((s) => (
                          <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {wordData.antonyms && wordData.antonyms.length > 0 && (
                    <div>
                      <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">
                        Antonyms
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {wordData.antonyms.map((a) => (
                          <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes + AI test (revealed only) */}
              {phase === 'revealed' && (
                <>
                  <WordNotes word={wordData.word} />
                  <WordTest wordData={wordData} />
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
