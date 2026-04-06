import { useState, useEffect, useCallback, useRef } from 'react';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { generateWordData, pickNextWord } from '../lib/wordService';
import { speakWithKokoro, stopKokoroAudio, isKokoroPlaying } from '../lib/kokoroTts';
import type { VocabularyWord } from '../types';
import toast from 'react-hot-toast';

type CardPhase = 'loading' | 'front' | 'revealed';

export function FlashCard() {
  const { user } = useAuth();
  const store = useVocabularyStore();

  const [phase, setPhase] = useState<CardPhase>('loading');
  const [wordData, setWordData] = useState<VocabularyWord | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadNextWord = useCallback(async (excludeWord?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    stopKokoroAudio();
    setIsSpeaking(false);
    setPhase('loading');
    setWordData(null);

    const known = store.knownWords();
    const skipped = store.skippedWords();
    const { word, level } = pickNextWord(known, skipped, excludeWord);

    setIsGenerating(true);
    try {
      const data = await generateWordData(word, level, abortRef.current.signal);
      setWordData(data);
      setPhase('front');
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
    loadNextWord();
    return () => { abortRef.current?.abort(); stopKokoroAudio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReveal = () => {
    if (phase !== 'front') return;
    setPhase('revealed');
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
    await speakWithKokoro(text, {
      onEnd: () => setIsSpeaking(false),
    });
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

  const isBookmarked = wordData ? store.getStatus(wordData.word) === 'bookmarked' : false;

  const levelColor: Record<string, string> = {
    beginner: 'text-accent-green bg-accent-green/10',
    intermediate: 'text-accent-orange bg-accent-orange/10',
    advanced: 'text-accent-red bg-accent-red/10',
  };

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        {isGenerating && (
          <p className="text-sm text-text-muted animate-fade-in">
            Generating word data...
          </p>
        )}
      </div>
    );
  }

  if (!wordData) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
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
      <div
        className={`bg-bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 ${
          phase === 'front' ? 'cursor-pointer hover:border-accent-cyan/30 hover:shadow-lg hover:shadow-accent-cyan/5' : ''
        }`}
        onClick={phase === 'front' ? handleReveal : undefined}
      >
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
              onClick={(e) => { e.stopPropagation(); handleSpeak(); }}
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

        {/* Front: tap to reveal prompt */}
        {phase === 'front' && (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-text-muted text-sm">Do you know this word?</p>
            <p className="text-xs text-text-muted/60">Tap the card to reveal definition & examples</p>
            <div className="mt-4 w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        )}

        {/* Revealed: definition + examples */}
        {phase === 'revealed' && (
          <div className="p-8 space-y-6 animate-flip-in">
            {/* Definition */}
            <div>
              <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">
                Definition
              </h3>
              <p className="text-text-primary leading-relaxed">{wordData.definition}</p>
            </div>

            {/* Examples */}
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

            {/* Synonyms */}
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
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-6">
        {/* Skip */}
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

        {/* Bookmark */}
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

        {/* Know it */}
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

      {/* Next word hint */}
      {phase === 'revealed' && (
        <p className="text-center text-xs text-text-muted/50 mt-4 animate-fade-in">
          Use the buttons above or swipe to continue
        </p>
      )}
    </div>
  );
}
