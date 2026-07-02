import { useState } from 'react';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { generateWordData } from '../lib/wordService';
import { speakText, stopSpeaking, isTtsPlaying } from '../lib/tts';
import { WORD_LIST } from '../lib/wordService';
import type { VocabularyWord } from '../types';
import toast from 'react-hot-toast';
import { BookmarkGame } from './BookmarkGame';
import { SpellingGame } from './SpellingGame';
import { ParagraphGame } from './ParagraphGame';

type Tab = 'saved' | 'known' | 'unknown';

const TABS: { id: Tab; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'known', label: 'Known' },
  { id: 'unknown', label: "Don't know" },
];

export function BookmarkList() {
  const { user } = useAuth();
  const store = useVocabularyStore();
  const [tab, setTab] = useState<Tab>('saved');
  const bookmarks = store.bookmarkedWords();
  const known = store.wordsByStatus('known');
  const unknown = store.wordsByStatus('skipped');
  const list = tab === 'saved' ? bookmarks : tab === 'known' ? known : unknown;
  const [mode, setMode] = useState<'list' | 'quiz' | 'spelling' | 'paragraph'>('list');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [wordCache, setWordCache] = useState<Record<string, VocabularyWord>>({});
  const [loadingWord, setLoadingWord] = useState<string | null>(null);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const handleExpand = async (word: string) => {
    if (expanded === word) { setExpanded(null); return; }
    setExpanded(word);

    if (wordCache[word]) return;

    setLoadingWord(word);
    const wordEntry = WORD_LIST.find((w) => w.word === word);
    const level = wordEntry?.level ?? 'intermediate';
    try {
      const data = await generateWordData(word, level);
      setWordCache((c) => ({ ...c, [word]: data }));
    } catch (err) {
      const msg = (err as Error).message || '';
      toast.error(msg.includes('API key') ? msg : `Could not load "${word}"`);
    } finally {
      setLoadingWord(null);
    }
  };

  const handleSpeak = async (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    if (speakingWord === word && isTtsPlaying()) {
      stopSpeaking();
      setSpeakingWord(null);
      return;
    }
    stopSpeaking();
    const data = wordCache[word];
    const text = data
      ? `${word}. ${data.definition}. ${data.examples.join(' ')}`
      : word;
    setSpeakingWord(word);
    await speakText(text, { onEnd: () => setSpeakingWord(null) });
  };

  const handleRemove = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    // On the Saved tab, "remove" only un-saves — it keeps any learning status.
    // On the Known / Don't-know tabs it clears that word from the history.
    if (tab === 'saved') store.setBookmarked(word, false, user?.id);
    else store.clearStatus(word, user?.id);
    if (expanded === word) setExpanded(null);
    toast.success(`Removed "${word}"`);
  };

  if (mode === 'quiz') {
    return (
      <BookmarkGame
        bookmarks={bookmarks.map((b) => b.word)}
        onBack={() => setMode('list')}
      />
    );
  }

  if (mode === 'spelling') {
    return (
      <SpellingGame
        bookmarks={bookmarks.map((b) => b.word)}
        onBack={() => setMode('list')}
      />
    );
  }

  if (mode === 'paragraph') {
    return (
      <ParagraphGame
        bookmarks={bookmarks.map((b) => b.word)}
        onBack={() => setMode('list')}
      />
    );
  }

  const emptyCopy: Record<Tab, { icon: string; title: string; hint: string }> = {
    saved: { icon: '★', title: 'No saved words yet', hint: 'Bookmark words while learning to build your personal vocabulary list.' },
    known: { icon: '✓', title: 'No known words yet', hint: 'Words you mark as “Know it” while learning show up here.' },
    unknown: { icon: '↷', title: 'Nothing skipped yet', hint: 'Words you skip while learning show up here so you can revisit them.' },
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* ── Tabs ── */}
      <div className="flex items-stretch gap-1 mb-6 border-b-2 border-border">
        {TABS.map((t) => {
          const count = t.id === 'saved' ? bookmarks.length : t.id === 'known' ? known.length : unknown.length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setExpanded(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 -mb-0.5 border-b-[3px] text-sm font-extrabold transition-all ${
                active
                  ? 'border-accent-cyan text-accent-cyan'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-bg-tertiary text-text-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-4">{emptyCopy[tab].icon}</div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-2">{emptyCopy[tab].title}</h2>
          <p className="text-sm text-text-muted">{emptyCopy[tab].hint}</p>
        </div>
      ) : (
        <>
          {/* Quiz / spelling only apply to saved words */}
          {tab === 'saved' && bookmarks.length >= 2 && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setMode('quiz')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/20 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Quiz
              </button>
              <button
                onClick={() => setMode('spelling')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-medium hover:bg-accent-purple/20 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Spelling
              </button>
              <button
                onClick={() => setMode('paragraph')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-medium hover:bg-accent-green/20 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
                  <path d="M9 20h6" /><path d="M12 4v16" />
                </svg>
                Story Gaps
              </button>
            </div>
          )}

      <div className="space-y-2">
        {list.map(({ word }) => {
          const isOpen = expanded === word;
          const data = wordCache[word];
          const isLoading = loadingWord === word;
          const isSpeaking = speakingWord === word;
          const wordEntry = WORD_LIST.find((w) => w.word === word);
          const level = wordEntry?.level ?? 'intermediate';

          const levelColor: Record<string, string> = {
            beginner: 'text-accent-green',
            intermediate: 'text-accent-orange',
            advanced: 'text-accent-red',
          };

          return (
            <div
              key={word}
              className={`rounded-xl border transition-all overflow-hidden ${
                isOpen ? 'border-accent-cyan/30 bg-bg-card' : 'border-border bg-bg-card hover:border-border-light cursor-pointer'
              }`}
              onClick={() => handleExpand(word)}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <span className="font-display font-bold text-text-primary">{word}</span>
                  {data?.partOfSpeech && (
                    <span className="ml-2 text-xs text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded">
                      {data.partOfSpeech}
                    </span>
                  )}
                </div>

                <span className={`text-xs font-medium ${levelColor[level]}`}>{level}</span>

                {/* Speak button */}
                <button
                  onClick={(e) => handleSpeak(e, word)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                    isSpeaking
                      ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
                      : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
                  }`}
                >
                  {isSpeaking ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <rect x="0" y="0" width="4" height="10" rx="1" />
                      <rect x="6" y="0" width="4" height="10" rx="1" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>

                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(e, word)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-all"
                  title={tab === 'saved' ? 'Remove from saved' : 'Remove from history'}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                {/* Expand chevron */}
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-border pt-4 animate-fade-in">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <div className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
                      Loading...
                    </div>
                  ) : data ? (
                    <div className="space-y-4">
                      {data.phonetic && (
                        <p className="text-sm font-code text-text-muted">{data.phonetic}</p>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Definition</h4>
                        <p className="text-sm text-text-primary leading-relaxed">{data.definition}</p>
                      </div>
                      {data.examples.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Examples</h4>
                          <ul className="space-y-1.5">
                            {data.examples.map((ex, i) => (
                              <li key={i} className="flex gap-2 text-sm text-text-secondary">
                                <span className="text-accent-cyan shrink-0">▸</span>
                                <span>{ex}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data.synonyms && data.synonyms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {data.synonyms.map((syn) => (
                            <span key={syn} className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border">
                              {syn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}
