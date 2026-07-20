import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { generateWordData } from '../lib/wordService';
import { getRecentDailyWords } from '../lib/dailyWord';
import { speakText, stopSpeaking, isTtsPlaying } from '../lib/tts';
import { whyLine } from '../lib/progress';
import { WORD_LIST } from '../lib/wordService';
import type { VocabularyWord, WordProgress } from '../types';
import toast from 'react-hot-toast';
import { QuizSetup } from './QuizSetup';
import { ParagraphGame } from './ParagraphGame';
import { ReviewPanel } from './ReviewPanel';
import { WordMindMap } from './WordMindMap';

const LEVEL_COLOR: Record<string, string> = {
  beginner: 'text-accent-green',
  intermediate: 'text-accent-orange',
  advanced: 'text-accent-red',
};

/** ChatGPT URL pre-filled with a prompt that draws a handwritten mind-map
 *  image of the given words (same open-in-ChatGPT pattern as the collection
 *  builder's word-list helper). */
function chatGptMindmapUrl(words: string[]): string {
  const prompt = `Create a handwritten-style mind map image to help me memorize these English vocabulary words:

${words.join(', ')}

Rules:
- Generate it as ONE image, drawn like a hand-written sketchnote mind map
- Group related words into labeled branches by theme
- Keep every word large and legible
- Add a small doodle next to each word that hints at its meaning`;
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

/** Human label for a `YYYY-MM-DD` key relative to today. */
function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Local `YYYY-MM-DD` for an ISO timestamp. */
function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Bucket words by the day they were last seen. Input is already newest-first,
 *  so groups (and words within them) come out newest-first too. */
function groupByDate(items: WordProgress[]): { key: string; items: WordProgress[] }[] {
  const groups: { key: string; items: WordProgress[] }[] = [];
  const index = new Map<string, WordProgress[]>();
  for (const it of items) {
    const key = it.seenAt ? localDateKey(it.seenAt) : 'unknown';
    let bucket = index.get(key);
    if (!bucket) {
      bucket = [];
      index.set(key, bucket);
      groups.push({ key, items: bucket });
    }
    bucket.push(it);
  }
  return groups;
}

function groupLabel(key: string): string {
  return key === 'unknown' ? 'Earlier' : dayLabel(key);
}

/** Word-of-the-Day — a big card for today, with previous days tucked behind a toggle. */
function DailyWords() {
  const days = useMemo(() => getRecentDailyWords(30), []);
  const [showPast, setShowPast] = useState(false);
  if (days.length === 0) return null;

  const [today, ...past] = days;

  return (
    <section className="mb-8">
      {/* Today — hero card */}
      <Link
        to={`/?word=${encodeURIComponent(today.word)}`}
        className="group block rounded-2xl border border-accent-cyan/30 bg-gradient-to-br from-accent-cyan/10 to-bg-card p-6 transition-all hover:border-accent-cyan/50"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-accent-cyan uppercase tracking-wider">
            Word of the Day
          </span>
          <span className={`text-xs font-medium ${LEVEL_COLOR[today.level]}`}>{today.level}</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="font-display font-extrabold text-3xl text-text-primary group-hover:text-accent-cyan transition-colors">
            {today.word}
          </span>
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className="mb-1 text-text-muted group-hover:text-accent-cyan group-hover:translate-x-0.5 transition-all"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </Link>

      {/* Previous days — collapsed by default */}
      {past.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-1.5 px-1 py-1 text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showPast ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {showPast ? 'Hide previous days' : `Previous days (${past.length})`}
          </button>

          {showPast && (
            <div className="mt-2 rounded-xl border border-border bg-bg-card divide-y divide-border max-h-72 overflow-y-auto animate-fade-in">
              {past.map(({ date, word, level }) => (
                <Link
                  key={date}
                  to={`/?word=${encodeURIComponent(word)}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition-colors"
                >
                  <span className="w-24 shrink-0 text-xs text-text-muted">{dayLabel(date)}</span>
                  <span className="flex-1 min-w-0 font-display font-bold text-accent-cyan truncate hover:underline">
                    {word}
                  </span>
                  <span className={`text-[11px] font-medium ${LEVEL_COLOR[level]}`}>{level}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

type Tab = 'recent' | 'saved' | 'known' | 'unknown' | 'skipped';

const TABS: { id: Tab; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'saved', label: 'Saved' },
  { id: 'known', label: 'Known' },
  { id: 'unknown', label: "Don't know" },
  { id: 'skipped', label: 'Skipped' },
];

/** Newest-seen first. */
const byRecent = (a: WordProgress, b: WordProgress) => b.seenAt.localeCompare(a.seenAt);

/** The status pill shown on the Recent timeline so you can tell, at a glance,
 *  what each word's outcome was. A word with no learning outcome falls back to
 *  "saved" (if bookmarked) or "seen". */
function recentBadge(item: WordProgress): { label: string; icon: string; cls: string } {
  if (item.status === 'known') return { label: 'known', icon: '✓', cls: 'text-accent-green bg-accent-green/10' };
  if (item.status === 'skipped') return { label: "don't know", icon: '✗', cls: 'text-accent-red bg-accent-red/10' };
  if (item.status === 'dismissed') return { label: 'skipped', icon: '🙈', cls: 'text-text-muted bg-bg-tertiary' };
  if (item.bookmarked) return { label: 'saved', icon: '★', cls: 'text-accent-cyan bg-accent-cyan/10' };
  return { label: 'seen', icon: '👁', cls: 'text-text-muted bg-bg-tertiary' };
}

/** Cap on how many words a game pulls from the current tab — keeps the quiz
 *  build bounded (it loads word data for each) and a session quick, even on the
 *  big Recent list. The quiz shuffles, so the newest slice still gives variety. */
const GAME_LIMIT = 30;

export function HistoryPage() {
  const { user } = useAuth();
  const store = useVocabularyStore();
  const [tab, setTab] = useState<Tab>('recent');
  const bookmarks = store.bookmarkedWords();
  const known = store.wordsByStatus('known');
  const unknown = store.wordsByStatus('skipped');
  const dismissed = store.wordsByStatus('dismissed');
  // Recent = everything you've touched (any status, saved, or just viewed),
  // newest-first — one unified timeline across all the buckets below.
  const recent = useMemo(
    () => Object.values(store.progress).sort(byRecent),
    [store.progress],
  );
  const list =
    tab === 'recent' ? recent
    : tab === 'saved' ? bookmarks
    : tab === 'known' ? known
    : tab === 'unknown' ? unknown
    : dismissed;
  // Words fed to the games — the current tab's list, newest slice, capped.
  const gameWords = list.slice(0, GAME_LIMIT).map((w) => w.word);
  const [mode, setMode] = useState<'list' | 'quiz' | 'paragraph' | 'mindmap'>('list');
  const { isPro } = useIsPro();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [wordCache, setWordCache] = useState<Record<string, VocabularyWord>>({});
  const [loadingWord, setLoadingWord] = useState<string | null>(null);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const handleExpand = async (word: string) => {
    if (expanded === word) { setExpanded(null); return; }
    setExpanded(word);

    if (wordCache[word]) return;

    setLoadingWord(word);
    try {
      const data = await generateWordData(word);
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
    // On the Skipped tab it restores the word into the learning rotation.
    // On Recent it wipes the word from every list (it's the whole-history view).
    if (tab === 'saved') store.setBookmarked(word, false, user?.id);
    else if (tab === 'recent') store.removeWord(word, user?.id);
    else store.clearStatus(word, user?.id);
    if (expanded === word) setExpanded(null);
    toast.success(tab === 'skipped' ? `"${word}" will show up again` : `Removed "${word}"`);
  };

  if (mode === 'quiz') {
    return <QuizSetup words={gameWords} onBack={() => setMode('list')} />;
  }

  if (mode === 'paragraph') {
    return <ParagraphGame bookmarks={gameWords} onBack={() => setMode('list')} />;
  }

  if (mode === 'mindmap') {
    return <WordMindMap words={gameWords} onBack={() => setMode('list')} />;
  }

  const emptyCopy: Record<Tab, { icon: string; title: string; hint: string }> = {
    recent: { icon: '🕑', title: 'Nothing here yet', hint: 'Words you learn, save, or look up show up here newest-first — your whole history in one place.' },
    saved: { icon: '★', title: 'No saved words yet', hint: 'Bookmark words while learning to build your personal vocabulary list.' },
    known: { icon: '✓', title: 'No known words yet', hint: 'Words you mark as “Know it” while learning show up here.' },
    unknown: { icon: '↷', title: 'Nothing here yet', hint: 'Words you couldn’t guess show up here — they keep coming back until you learn them.' },
    skipped: { icon: '🙈', title: 'Nothing skipped yet', hint: 'Words you skip while learning land here and stop appearing. Remove one to bring it back.' },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] gap-6 items-start">
        {/* ── Left: word lists ── */}
        <div className="min-w-0">

      {/* ── Tabs ── */}
      <div className="flex items-stretch gap-1 mb-6 border-b-2 border-border">
        {TABS.map((t) => {
          const count =
            t.id === 'recent' ? recent.length
            : t.id === 'saved' ? bookmarks.length
            : t.id === 'known' ? known.length
            : t.id === 'unknown' ? unknown.length
            : dismissed.length;
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
          {/* Practice tools — available on every list, playing the words in
              the current tab (Recent, Saved, Known, Don't-know, Skipped). */}
          {gameWords.length >= 2 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => setMode('quiz')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/20 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Quiz
              </button>
              {/* Pro: Story Gaps writes a fresh AI story every round (always a
                  generative call), so it's gated like the interactive Mind Map.
                  The button stays visible as a teaser; the server re-checks Pro. */}
              <button
                onClick={() => {
                  if (!isPro) {
                    toast('Story Gaps is a Pro feature.', { icon: '👑' });
                    return;
                  }
                  setMode('paragraph');
                }}
                title={
                  isPro
                    ? 'Fill these words into an AI-written short story'
                    : 'Pro feature — an AI-written story that uses your words'
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-medium hover:bg-accent-green/20 transition-all"
              >
                <Icon icon={isPro ? 'lucide:book-open' : 'lucide:lock'} className="text-sm" />
                Story Gaps
                <span className="text-[9px] px-1 py-px rounded bg-accent-green/20 font-extrabold uppercase tracking-wider">
                  Pro
                </span>
              </button>
              {/* Opens ChatGPT pre-filled with a prompt to draw a handwritten
                  mind-map image of every saved word. */}
              <a
                href={chatGptMindmapUrl(gameWords)}
                target="_blank"
                rel="noopener noreferrer"
                title="Ask ChatGPT to draw a handwritten mind-map image of these words"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-xs font-medium hover:bg-accent-orange/20 transition-all"
              >
                <Icon icon="lucide:git-fork" className="text-sm" />
                Mind Map
              </a>
              {/* Pro: interactive in-app mind map (collapsible themes, tap a
                  word for its definition or to open its page). The button is
                  always visible as a teaser; the server re-checks Pro. */}
              <button
                onClick={() => {
                  if (!isPro) {
                    toast('The interactive Mind Map is a Pro feature.', { icon: '👑' });
                    return;
                  }
                  setMode('mindmap');
                }}
                title={
                  isPro
                    ? 'Open an interactive mind map of these words'
                    : 'Pro feature — interactive mind map of these words'
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-xs font-medium hover:bg-accent-yellow/20 transition-all"
              >
                <Icon icon={isPro ? 'lucide:pencil-line' : 'lucide:lock'} className="text-sm" />
                Mind Map
                <span className="text-[9px] px-1 py-px rounded bg-accent-yellow/20 font-extrabold uppercase tracking-wider">
                  Pro
                </span>
              </button>
            </div>
          )}

      <div className="space-y-6">
        {groupByDate(list).map((group) => (
          <div key={group.key}>
            {/* Day header with count so users see how many they learned that day */}
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">{groupLabel(group.key)}</h3>
              <span className="text-[11px] font-bold text-accent-cyan">
                {group.items.length} word{group.items.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="space-y-2">
        {group.items.map((item) => {
          const { word } = item;
          const views = item.views ?? 0;
          const isOpen = expanded === word;
          const data = wordCache[word];
          const isLoading = loadingWord === word;
          const isSpeaking = speakingWord === word;
          const wordEntry = WORD_LIST.find((w) => w.word === word);
          const level = wordEntry?.level ?? 'intermediate';

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
                  <Link
                    to={`/?word=${encodeURIComponent(word)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-display font-bold text-text-primary hover:text-accent-cyan hover:underline transition-colors"
                    title={`Open "${word}"`}
                  >
                    {word}
                  </Link>
                  {data?.partOfSpeech && (
                    <span className="ml-2 text-xs text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded">
                      {data.partOfSpeech}
                    </span>
                  )}
                  {/* Why this word is where it is: its review history at a glance. */}
                  <div className="text-[10px] text-text-muted mt-0.5">{whyLine(item)}</div>
                </div>

                {/* Recent timeline: show the word's outcome at a glance. */}
                {tab === 'recent' && (() => {
                  const b = recentBadge(item);
                  return (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${b.cls}`}>
                      <span aria-hidden>{b.icon}</span>
                      <span className="hidden sm:inline">{b.label}</span>
                    </span>
                  );
                })()}

                {views > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-text-muted whitespace-nowrap" title={`Seen ${views} time${views === 1 ? '' : 's'}`}>
                    {views}
                    <Icon icon="lucide:eye" className="text-sm" />
                  </span>
                )}
                <span className={`hidden sm:inline text-xs font-medium ${LEVEL_COLOR[level]}`}>{level}</span>

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
                  title={
                    tab === 'saved' ? 'Remove from saved'
                    : tab === 'skipped' ? 'Show this word again'
                    : 'Remove from history'
                  }
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
                      {(() => {
                        const ipa = data.phonetics?.['en-US'] || data.phonetics?.['en-GB'];
                        return ipa ? <p className="text-sm font-code text-text-muted">{ipa}</p> : null;
                      })()}
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
          </div>
        ))}
      </div>
        </>
      )}
        </div>

        {/* ── Right: review + word of the day ── */}
        <aside className="lg:sticky lg:top-20">
          <ReviewPanel />
          <DailyWords />
        </aside>
      </div>
    </div>
  );
}
