import { useState, useEffect, useCallback, useRef } from 'react';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { generateWordData, pickNextWord } from '../lib/wordService';
import { dequeue, fillPrefetchQueue, getPrefetchedWords } from '../lib/prefetchService';
import { WordTest } from './WordTest';
import { WordNotes } from './WordNotes';
import { speakWithKokoro, stopKokoroAudio, isKokoroPlaying } from '../lib/kokoroTts';
import type { VocabularyWord } from '../types';
import toast from 'react-hot-toast';

type CardPhase = 'loading' | 'introduce' | 'revealed' | 'search-result';

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
  // Fallback: consistent placeholder seeded by word
  return `https://picsum.photos/seed/${encodeURIComponent(wordData.word)}/600/300`;
}

export function FlashCard() {
  const { user } = useAuth();
  const store = useVocabularyStore();

  const [phase, setPhase] = useState<CardPhase>('loading');
  const [wordData, setWordData] = useState<VocabularyWord | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [guess, setGuess] = useState('');
  const [guessResult, setGuessResult] = useState<'correct' | 'wrong' | null>(null);
  const guessInputRef = useRef<HTMLInputElement>(null);

  const loadNextWord = useCallback(async (excludeWord?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    stopKokoroAudio();
    setIsSpeaking(false);
    setPhase('loading');
    setWordData(null);
    setHintCount(0);
    setImageUrl(null);
    setImageLoaded(false);
    setGuess('');
    setGuessResult(null);

    const known = store.knownWords();
    const skipped = store.skippedWords();

    // Try prefetch queue first — instant if available
    const queued = dequeue();
    if (queued && queued.word !== excludeWord) {
      setWordData(queued.data);
      setPhase('introduce');
      fillPrefetchQueue(known, skipped, queued.word);
      return;
    }

    // Queue miss — generate on demand, excluding in-flight prefetches to avoid duplicates
    const exclude = new Set(getPrefetchedWords());
    if (excludeWord) exclude.add(excludeWord);
    const { word, level } = pickNextWord(known, skipped, exclude);

    setIsGenerating(true);
    try {
      const data = await generateWordData(word, level, abortRef.current.signal);
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
  }, [store]);

  useEffect(() => {
    // Start prefetching immediately so future words are ready
    const known = store.knownWords();
    const skipped = store.skippedWords();
    fillPrefetchQueue(known, skipped);

    loadNextWord();
    return () => { abortRef.current?.abort(); stopKokoroAudio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!wordData) return;
    setImageUrl(null);
    setImageLoaded(false);
    fetchImageUrl(wordData).then(setImageUrl);
  }, [wordData]);

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

  const handleHint = () => {
    if (!wordData) return;
    const hints = wordData.hints || [];
    if (hintCount < hints.length) setHintCount(hintCount + 1);
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
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    stopKokoroAudio();
    setIsSpeaking(false);
    setIsSearching(true);
    try {
      const data = await generateWordData(query, 'intermediate', abortRef.current.signal);
      setWordData(data);
      setPhase('search-result');
      setImageUrl(null);
      setImageLoaded(false);
      setHintCount(0);
      setSearchQuery('');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || '';
      toast.error(msg.includes('API key') ? msg : `Could not find "${query}"`);
    } finally {
      setIsSearching(false);
    }
  };

  const searchBar = (
    <form onSubmit={handleSearch} className="relative mb-6">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        {isSearching ? (
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
        className="w-full bg-bg-card border border-border rounded-xl pl-10 pr-20 py-3 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/40 placeholder:text-text-muted transition-colors"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {searchQuery.trim() && (
        <button
          type="submit"
          disabled={isSearching}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-accent-cyan text-bg-primary text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all"
        >
          Search
        </button>
      )}
    </form>
  );

  const isBookmarked = wordData ? store.getStatus(wordData.word) === 'bookmarked' : false;

  const levelColor: Record<string, string> = {
    beginner: 'text-accent-green bg-accent-green/10',
    intermediate: 'text-accent-orange bg-accent-orange/10',
    advanced: 'text-accent-red bg-accent-red/10',
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        {isGenerating && (
          <p className="text-sm text-text-muted animate-fade-in">Generating word data...</p>
        )}
      </div>
    );
  }

  if (!wordData) return null;

  const hints = wordData.hints || [];
  const shownHints = hints.slice(0, hintCount);
  const hasMoreHints = hintCount < hints.length;

  // ── Introduce phase ──────────────────────────────────────────────────
  if (phase === 'introduce') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
        {searchBar}
        {/* Progress info */}
        <div className="flex items-center justify-between mb-6 text-xs text-text-muted">
          <span>
            <span className="text-accent-green font-medium">{store.knownWords().size}</span> known
            {' · '}
            <span className="text-accent-cyan font-medium">{store.bookmarkedWords().length}</span> saved
          </span>
          <span className={`px-2 py-0.5 rounded font-medium ${levelColor[wordData.level]}`}>
            {wordData.level}
          </span>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Image */}
          <div className="relative w-full h-48 bg-bg-tertiary overflow-hidden">
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
              <div className="absolute inset-0 bg-gradient-to-t from-bg-card/70 to-transparent" />
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Header */}
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

            {/* Masked word: first + blanks + last */}
            <div className="flex items-center gap-1 font-display font-bold text-2xl tracking-widest">
              {wordData.word.split('').map((char, i) => {
                const isFirst = i === 0;
                const isLast = i === wordData.word.length - 1;
                if (isFirst || isLast) {
                  return <span key={i} className="text-text-primary">{char}</span>;
                }
                return <span key={i} className="text-text-muted/40">_</span>;
              })}
            </div>

            {/* Definition */}
            <div className="bg-bg-tertiary rounded-xl p-4">
              <p className="text-text-primary leading-relaxed">{wordData.definition}</p>
            </div>

            {/* Example sentences with word blanked */}
            {wordData.examples.length > 0 && (
              <div className="space-y-2">
                {wordData.examples.slice(0, 2).map((ex, i) => {
                  const blanked = ex.replace(
                    new RegExp(`\\b${wordData.word}\\b`, 'gi'),
                    '____',
                  );
                  return (
                    <p key={i} className="text-sm text-text-secondary leading-relaxed italic">
                      <span className="text-accent-cyan not-italic mr-1.5">▸</span>
                      {blanked}
                    </p>
                  );
                })}
              </div>
            )}

            {/* Hint conversation */}
            {shownHints.length > 0 && (
              <div className="space-y-2.5">
                {shownHints.map((hint, i) => (
                  <div key={i} className="flex gap-3 items-start animate-fade-in">
                    <div className="w-7 h-7 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shrink-0 mt-0.5 text-accent-cyan text-xs">
                      ✦
                    </div>
                    <div className="bg-bg-tertiary rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text-secondary leading-relaxed flex-1">
                      {hint}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hint button */}
            {hasMoreHints && (
              <button
                onClick={handleHint}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-accent-cyan/20 text-accent-cyan text-sm hover:bg-accent-cyan/5 transition-all"
              >
                <span className="text-xs">✦</span>
                <span>Get a hint</span>
                <span className="text-xs text-text-muted">({hints.length - hintCount} left)</span>
              </button>
            )}

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

              {/* Reveal fallback */}
              <button
                onClick={handleReveal}
                className="w-full text-xs text-text-muted hover:text-text-secondary transition-colors py-1"
              >
                Give up — reveal the word
              </button>
            </div>
          </div>
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
            <line x1="20" y1="6" x2="20" y2="18" />
          </svg>
          Skip this word
        </button>
      </div>
    );
  }

  // ── Revealed / Search-result phase ──────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
      {searchBar}
      {/* Progress info */}
      <div className="flex items-center justify-between mb-6 text-xs text-text-muted">
        {phase === 'search-result' ? (
          <button
            onClick={() => loadNextWord()}
            className="flex items-center gap-1 text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Resume learning
          </button>
        ) : (
          <span>
            <span className="text-accent-green font-medium">{store.knownWords().size}</span> known
            {' · '}
            <span className="text-accent-cyan font-medium">{store.bookmarkedWords().length}</span> saved
          </span>
        )}
        <span className={`px-2 py-0.5 rounded font-medium ${levelColor[wordData.level]}`}>
          {wordData.level}
        </span>
      </div>

      {/* Card */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden animate-flip-in">
        {/* Image */}
        {imageUrl && (
          <div className="relative w-full h-48 bg-bg-tertiary overflow-hidden">
            <img
              src={imageUrl}
              alt="vocabulary visual"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card/70 to-transparent" />
          </div>
        )}

        {/* Word header */}
        <div className="p-8 pb-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display font-bold text-text-primary tracking-tight mb-2">
                {wordData.word}
              </h1>
              {wordData.phonetic && (
                <p className="text-sm font-code text-text-muted">{wordData.phonetic}</p>
              )}
            </div>

            {/* Speak button */}
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

        {/* Definition + examples + synonyms */}
        <div className="p-8 space-y-6">
          <div>
            <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">
              Definition
            </h3>
            <p className="text-text-primary leading-relaxed">{wordData.definition}</p>
          </div>

          {wordData.examples.length > 0 && (
            <div>
              <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
                Examples
              </h3>
              <ul className="space-y-2">
                {wordData.examples.map((ex, i) => (
                  <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
                    <span className="text-accent-cyan shrink-0 mt-0.5">▸</span>
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {wordData.synonyms && wordData.synonyms.length > 0 && (
            <div>
              <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">
                Synonyms
              </h3>
              <div className="flex flex-wrap gap-2">
                {wordData.synonyms.map((syn) => (
                  <span key={syn} className="text-xs px-2.5 py-1 rounded-full bg-bg-tertiary text-text-secondary border border-border">
                    {syn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Community notes */}
          <WordNotes word={wordData.word} />

          {/* AI test */}
          <WordTest wordData={wordData} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleSkip}
          className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-border bg-bg-card text-text-muted hover:text-text-primary hover:border-border-light transition-all"
          title="Skip this word for now"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
            <line x1="20" y1="6" x2="20" y2="18" />
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
    </div>
  );
}
