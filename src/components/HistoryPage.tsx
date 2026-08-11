import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { generateWordData } from '../lib/wordService';
import { getRecentDailyWords } from '../lib/dailyWord';
import { speakText, stopSpeaking, isTtsPlaying } from '../lib/tts';
import { whyLine, wordBucket, BUCKET_META, BUCKET_ORDER } from '../lib/progress';
import { useProgressQuery, type Filter } from '../hooks/useProgressQuery';
import { WORD_LIST } from '../lib/wordService';
import type { VocabularyWord, WordProgress } from '../types';
import toast from 'react-hot-toast';
import { QuizSetup } from './QuizSetup';
import { ParagraphGame } from './ParagraphGame';
import { ReviewPanel } from './ReviewPanel';
import { WordMindMap } from './WordMindMap';
import { MindMapButton } from './MindMapButton';
import { SpeakingPractice } from './SpeakingPractice';

const LEVEL_COLOR: Record<string, string> = {
  beginner: 'text-accent-green',
  intermediate: 'text-accent-orange',
  advanced: 'text-accent-red',
};

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

/** A filter chip: the two "how you got here" lists, plus one per learning
 *  bucket. Bucket ids double as the `?tab=` values, so a link like
 *  /history?tab=struggling lands on exactly that filter — and as the server's
 *  `bucket` column, so the same word is the whole query. */
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'saved', label: 'Saved' },
  // Learning state, in progression order — the same names and colours the
  // flash card and the dashboard bar use.
  ...BUCKET_ORDER.map((b) => ({ id: BUCKET_META[b].tab, label: BUCKET_META[b].label })),
];

const isFilter = (s: string): s is Filter => FILTERS.some((f) => f.id === s);

/** The status pill on each row: which learning bucket the word is in, so with
 *  mixed filters checked you can still tell what you're looking at. */
function bucketBadge(item: WordProgress) {
  return BUCKET_META[wordBucket(item)];
}

/** Cap on how many words Story Gaps / Mind Map pull from the filtered list —
 *  they consume every word passed at once, so big lists must stay bounded.
 *  The quiz has no such cap: QuizSetup paginates its word picker and defaults
 *  to a smart batch, so it gets the full filtered list. */
const GAME_LIMIT = 30;

export function HistoryPage() {
  const { user } = useAuth();
  const store = useVocabularyStore();
  // Multi-select filters, held in the URL so a link can point at one of them
  // ("/history?tab=struggling" from the flash card's status tag) and so a
  // reload keeps the view. Comma-separated; absent means the Recent default,
  // empty means the user unchecked everything.
  const [params, setParams] = useSearchParams();
  const checked = useMemo(() => {
    const raw = params.get('tab');
    if (raw === null) return new Set<Filter>(['recent']);
    return new Set<Filter>(raw.split(',').map((s) => s.trim()).filter(isFilter));
  }, [params]);
  const toggleFilter = (id: Filter) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const p = new URLSearchParams(params);
    p.set('tab', [...next].join(','));
    setParams(p, { replace: true });
  };

  // The words themselves come from the server, filtered and paged (see
  // useProgressQuery) — the local store answers until the first page lands.
  const { rows: list, counts, loading, initialLoading, hasMore, loadMore, forget, fetchAllWords } =
    useProgressQuery(checked);
  // Story Gaps / Mind Map get the newest slice, capped (see GAME_LIMIT) — well
  // inside the first page, so no extra fetch.
  const gameWords = list.slice(0, GAME_LIMIT).map((w) => w.word);
  // The quiz offers every matching word, so it needs the ones past the loaded
  // page — fetched (words only) when the quiz is actually opened.
  const [quizWords, setQuizWords] = useState<string[] | null>(null);
  // Whether the quiz pool is already the batch (the review panel hands over an
  // exact due list) or a pool to sample a batch from (the filtered history).
  const [quizAll, setQuizAll] = useState(false);
  const [mode, setMode] = useState<'list' | 'quiz' | 'paragraph' | 'mindmap' | 'speaking'>('list');
  const openQuiz = async () => {
    setQuizWords(await fetchAllWords());
    setQuizAll(false);
    setMode('quiz');
  };
  // Quiz a due list straight from the review panel — every word, no sampling.
  const openReviewQuiz = (words: string[]) => {
    setQuizWords(words);
    setQuizAll(true);
    setMode('quiz');
  };
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

  const handleRemove = (e: React.MouseEvent, word: string, item: WordProgress) => {
    e.stopPropagation();
    // What "remove" means depends on why the word is in the current view:
    // — With Recent checked the list is the whole-history view, so remove
    //   wipes the word from every list (same as the old Recent tab).
    // — Saved-only view: just un-save, keep any learning status.
    // — Otherwise clear the learning status (Skipped words re-enter rotation).
    const savedOnly = checked.size === 1 && checked.has('saved');
    if (checked.has('recent')) store.removeWord(word, user?.id);
    else if (savedOnly && item.bookmarked) store.setBookmarked(word, false, user?.id);
    else store.clearStatus(word, user?.id);
    // The loaded page is a server snapshot; drop the row from it rather than
    // refetching every page the user has scrolled through.
    forget(word);
    if (expanded === word) setExpanded(null);
    toast.success(item.status === 'dismissed' && !checked.has('recent')
      ? `"${word}" will show up again`
      : `Removed "${word}"`);
  };

  if (mode === 'quiz') {
    // recordProgress: these are the learner's own words, so a quiz answer is a
    // review — it counts in the tallies and reschedules the word, the same as
    // answering it on the Learn page.
    return (
      <QuizSetup
        words={quizWords ?? gameWords}
        recordProgress
        selectAll={quizAll}
        onBack={() => setMode('list')}
      />
    );
  }

  if (mode === 'paragraph') {
    return <ParagraphGame bookmarks={gameWords} onBack={() => setMode('list')} />;
  }

  if (mode === 'mindmap') {
    return <WordMindMap words={gameWords} onBack={() => setMode('list')} />;
  }

  if (mode === 'speaking') {
    return <SpeakingPractice words={gameWords} onBack={() => setMode('list')} />;
  }

  const emptyCopyByBucket: Record<Filter, { icon: string; title: string; hint: string }> = {
    recent: { icon: '🕑', title: 'Nothing here yet', hint: 'Words you learn, save, or look up show up here newest-first — your whole history in one place.' },
    saved: { icon: '★', title: 'No saved words yet', hint: 'Bookmark words while learning to build your personal vocabulary list.' },
    'not-started': { icon: '◌', title: 'Nothing waiting', hint: 'Words you’ve opened but never answered land here, ready for their first round.' },
    struggling: { icon: '🔥', title: 'Nothing here yet', hint: 'Words you get wrong more often than right show up here — they keep coming back until you learn them.' },
    learning: { icon: '🔄', title: 'Nothing in rotation yet', hint: 'Answer a word correctly and it joins the review schedule, coming back at growing intervals.' },
    mastered: { icon: '✨', title: 'Nothing mastered yet', hint: 'Words graduate here once you keep getting them right over about three weeks.' },
    skipped: { icon: '🙈', title: 'Nothing skipped yet', hint: 'Words you skip while learning land here and stop appearing. Remove one to bring it back.' },
  };
  // Day groups, minus the trailing one while more pages are coming: the last
  // group of a page is usually half a day, and its header would claim "12
  // words" for a day that actually has thirty. Held back until the rest of
  // that day arrives (or the list ends).
  const groups = groupByDate(list);
  const visibleGroups = hasMore ? groups.slice(0, -1) : groups;

  // Empty-state copy: bucket-specific when exactly one filter is checked,
  // otherwise a generic message (or a nudge to check something).
  const only = checked.size === 1 ? [...checked][0] : null;
  const emptyCopy =
    checked.size === 0
      ? { icon: '☝️', title: 'No lists selected', hint: 'Check one or more lists above to see their words.' }
      : only
      ? emptyCopyByBucket[only]
      : { icon: '🕑', title: 'Nothing here yet', hint: 'The lists you checked don’t have any words yet.' };

  return (
    <div className="max-w-page mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] gap-6 items-start">
        {/* ── Left: word lists ── */}
        <div className="min-w-0">

      {/* ── Filters — check any mix of lists; the words (and games) follow ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {FILTERS.map((f) => {
          const count = counts[f.id];
          const on = checked.has(f.id);
          // Bucket filters carry their bucket's icon + colour, matching the
          // status tag on the flash card that links here.
          const meta = BUCKET_ORDER.map((b) => BUCKET_META[b]).find((m) => m.tab === f.id);
          return (
            <button
              key={f.id}
              onClick={() => {
                toggleFilter(f.id);
                setExpanded(null);
              }}
              title={meta?.hint}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 text-sm font-extrabold transition-all ${
                on
                  ? 'bg-accent-cyan/10 border-accent-cyan text-accent-cyan'
                  : 'bg-bg-card border-border text-text-muted hover:border-border-light hover:text-text-primary'
              }`}
            >
              <Icon icon={on ? 'solar:check-circle-bold' : 'lucide:circle'} className={on ? 'text-accent-cyan' : 'text-text-muted'} />
              {meta && <Icon icon={meta.icon} className={meta.text} />}
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${on ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-bg-tertiary text-text-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {initialLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-text-muted">
          <div className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          Loading your words…
        </div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-4">{emptyCopy.icon}</div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-2">{emptyCopy.title}</h2>
          <p className="text-sm text-text-muted">{emptyCopy.hint}</p>
        </div>
      ) : (
        <>
          {/* Practice tools — playing the words in whatever mix of lists is
              checked above. */}
          {gameWords.length >= 2 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={openQuiz}
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
              {/* Pro: an AI dialogue script that weaves in these words, stored
                  so replaying it later costs nothing — only "Generate" here
                  actually calls the model. */}
              <button
                onClick={() => {
                  if (!isPro) {
                    toast('Speaking is a Pro feature.', { icon: '👑' });
                    return;
                  }
                  setMode('speaking');
                }}
                title={
                  isPro
                    ? 'An AI conversation built from these words'
                    : 'Pro feature — an AI conversation built from these words'
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-xs font-medium hover:bg-accent-orange/20 transition-all"
              >
                <Icon icon={isPro ? 'lucide:message-circle' : 'lucide:lock'} className="text-sm" />
                Speaking
                <span className="text-[9px] px-1 py-px rounded bg-accent-orange/20 font-extrabold uppercase tracking-wider">
                  Pro
                </span>
              </button>
              {/* One entry point, two ways to get a map: the Pro interactive
                  board in-app, or a hand-drawn picture from ChatGPT. */}
              <MindMapButton
                words={gameWords}
                isPro={isPro}
                onOpenInteractive={() => setMode('mindmap')}
              />
            </div>
          )}

      <div className="space-y-6">
        {visibleGroups.map((group) => (
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

                {/* Show each word's outcome at a glance — with mixed filters
                    checked you can't tell otherwise which list a word is from. */}
                {(() => {
                  const b = bucketBadge(item);
                  return (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${b.chip}`} title={b.hint}>
                      <Icon icon={b.icon} className="text-xs" />
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
                  onClick={(e) => handleRemove(e, word, item)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-all"
                  title={
                    checked.size === 1 && checked.has('saved') ? 'Remove from saved'
                    : item.status === 'dismissed' && !checked.has('recent') ? 'Show this word again'
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

      {/* Paged rather than endless: the words are ordered newest-first, so
          what you came for is nearly always on the first page. */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-border bg-bg-card text-sm font-extrabold text-text-secondary hover:border-border-light hover:text-text-primary disabled:opacity-60 transition-all"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
              Loading…
            </>
          ) : (
            <>
              <Icon icon="lucide:chevron-down" />
              Load more
            </>
          )}
        </button>
      )}
        </>
      )}
        </div>

        {/* ── Right: review + word of the day ── */}
        <aside className="lg:sticky lg:top-20">
          <ReviewPanel onQuiz={openReviewQuiz} />
          <DailyWords />
        </aside>
      </div>
    </div>
  );
}
