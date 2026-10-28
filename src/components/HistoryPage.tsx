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
import { isFilter } from '../lib/progressApi';
import { useProgressQuery, type Filter } from '../hooks/useProgressQuery';
import { WORD_LIST } from '../lib/wordService';
import type { VocabularyWord, WordProgress } from '../types';
import toast from 'react-hot-toast';
import { FilterChips } from './FilterChips';
import { QuizSetup } from './QuizSetup';
import { ParagraphGame } from './ParagraphGame';
import { ReviewPanel } from './ReviewPanel';
import { WordMindMap } from './WordMindMap';
import { MindMapButton } from './MindMapButton';
import { SpeakingPractice } from './SpeakingPractice';
import { WordDetails, WordDetailsLoading } from './WordDetails';

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

/** Colour per practice tool — the same pairing the Review hub uses. */
const TOOL_COLOR = {
  cyan: { chip: 'bg-accent-cyan/10 text-accent-cyan', hover: 'hover:border-accent-cyan/50' },
  green: { chip: 'bg-accent-green/10 text-accent-green', hover: 'hover:border-accent-green/50' },
  orange: { chip: 'bg-accent-orange/10 text-accent-orange', hover: 'hover:border-accent-orange/50' },
  yellow: { chip: 'bg-accent-yellow/10 text-accent-yellow', hover: 'hover:border-accent-yellow/50' },
} as const;

const tileClass = (color: keyof typeof TOOL_COLOR) =>
  `group flex items-center gap-3 p-3 rounded-xl border-2 border-border bg-bg-card text-left transition-all hover:-translate-y-0.5 cursor-pointer ${TOOL_COLOR[color].hover}`;

/** A practice tile's contents. Rendered inside a <button> here, or inside
 *  MindMapButton's own trigger so its menu keeps working. */
function TileBody({ icon, label, hint, color, pro }: {
  icon: string;
  label: string;
  hint: string;
  color: keyof typeof TOOL_COLOR;
  pro?: boolean;
}) {
  return (
    <>
      <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${TOOL_COLOR[color].chip}`}>
        <Icon icon={icon} className="text-xl" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-display font-extrabold text-sm text-text-primary">
          {label}
          {pro && (
            <span className={`text-[9px] px-1 py-px rounded font-extrabold uppercase tracking-wider ${TOOL_COLOR[color].chip}`}>
              Pro
            </span>
          )}
        </span>
        <span className="block text-[11px] text-text-muted leading-snug truncate">{hint}</span>
      </span>
    </>
  );
}

/** Title plus where every word stands — one bar split by learning bucket, so
 *  the page opens on progress rather than straight into a list. */
function HistoryHeader({ counts }: { counts: Partial<Record<Filter, number>> }) {
  const segments = BUCKET_ORDER.map((b) => ({ ...BUCKET_META[b], count: counts[BUCKET_META[b].tab] ?? 0 }));
  const total = segments.reduce((n, s) => n + s.count, 0);
  const mastered = counts.mastered ?? 0;

  return (
    <header className="mb-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-text-primary leading-tight">History</h1>
          <p className="text-sm text-text-muted">Every word you’ve met, newest first.</p>
        </div>
        {total > 0 && (
          <p className="text-sm font-bold text-text-secondary">
            <span className="font-extrabold text-text-primary">{total}</span> words ·{' '}
            <span className="font-extrabold text-accent-green">{mastered}</span> mastered
          </p>
        )}
      </div>

      {total > 0 && (
        <>
          <div className="mt-4 h-2.5 rounded-full bg-bg-tertiary overflow-hidden flex">
            {segments.map((s) => s.count > 0 && (
              <div
                key={s.tab}
                className={`h-full ${s.bar}`}
                style={{ width: `${(s.count / total) * 100}%` }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {segments.map((s) => (
              <span key={s.tab} className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
                <span className={`w-2 h-2 rounded-full ${s.bar}`} />
                {s.label}
                <span className="text-text-secondary">{s.count}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </header>
  );
}

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
      <HistoryHeader counts={counts} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] gap-6 items-start">
        {/* ── Left: word lists ── */}
        <div className="min-w-0">

      {/* ── Filters — check any mix of lists; the words (and games) follow ── */}
      <div className="mb-5">
        <FilterChips checked={checked} counts={counts} onToggle={(id) => { toggleFilter(id); setExpanded(null); }} />
      </div>

      {initialLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-text-muted">
          <div className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          Loading your words…
        </div>
      ) : list.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-2xl border-2 border-dashed border-border">
          <div className="text-4xl mb-4">{emptyCopy.icon}</div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-2">{emptyCopy.title}</h2>
          <p className="text-sm text-text-muted max-w-sm mx-auto">{emptyCopy.hint}</p>
        </div>
      ) : (
        <>
          {/* Practice tools — playing the words in whatever mix of lists is
              checked above. */}
          {gameWords.length >= 2 && (
            <section className="mb-7">
              <h2 className="mb-2 px-1 text-xs font-bold text-text-muted uppercase tracking-wider">
                Practice these words
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                <button onClick={openQuiz} className={tileClass('cyan')}>
                  <TileBody icon="lucide:play" label="Quiz" hint="Test yourself" color="cyan" />
                </button>
                {/* Pro: Story Gaps writes a fresh AI story every round (always a
                    generative call), so it's gated like the interactive Mind Map.
                    The tile stays visible as a teaser; the server re-checks Pro. */}
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
                  className={tileClass('green')}
                >
                  <TileBody icon={isPro ? 'lucide:book-open' : 'lucide:lock'} label="Story Gaps" hint="Fill an AI story" color="green" pro />
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
                  className={tileClass('orange')}
                >
                  <TileBody icon={isPro ? 'lucide:message-circle' : 'lucide:lock'} label="Speaking" hint="Talk them through" color="orange" pro />
                </button>
                {/* One entry point, two ways to get a map: the Pro interactive
                    board in-app, or a hand-drawn picture from ChatGPT. */}
                <MindMapButton
                  words={gameWords}
                  isPro={isPro}
                  onOpenInteractive={() => setMode('mindmap')}
                  className={tileClass('yellow')}
                >
                  <TileBody icon="lucide:git-fork" label="Mind Map" hint="See how they connect" color="yellow" />
                </MindMapButton>
              </div>
            </section>
          )}

      <div className="space-y-6">
        {visibleGroups.map((group) => (
          <section key={group.key}>
            {/* Day header with count so users see how many they learned that day */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">{groupLabel(group.key)}</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan">
                {group.items.length} word{group.items.length === 1 ? '' : 's'}
              </span>
            </div>
            {/* One card per day; rows are divided rather than boxed so a long
                day reads as a list, not a stack of tiles. */}
            <div className="rounded-2xl border-2 border-border bg-bg-card overflow-hidden divide-y divide-border">
        {group.items.map((item) => {
          const { word } = item;
          const views = item.views ?? 0;
          const isOpen = expanded === word;
          const data = wordCache[word];
          const isLoading = loadingWord === word;
          const isSpeaking = speakingWord === word;
          const wordEntry = WORD_LIST.find((w) => w.word === word);
          const level = wordEntry?.level ?? 'intermediate';
          // The bucket icon leads the row — with mixed filters checked you
          // can't tell otherwise which list a word is from.
          const b = bucketBadge(item);

          return (
            <div
              key={word}
              className={`transition-colors ${isOpen ? 'bg-bg-hover' : 'hover:bg-bg-hover cursor-pointer'}`}
              onClick={() => handleExpand(word)}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${b.chip}`}
                  title={`${b.label} — ${b.hint}`}
                >
                  <Icon icon={b.icon} className="text-base" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      to={`/?word=${encodeURIComponent(word)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-display font-extrabold text-base text-text-primary hover:text-accent-cyan hover:underline transition-colors truncate"
                      title={`Open "${word}"`}
                    >
                      {word}
                    </Link>
                    {data?.partOfSpeech && (
                      <span className="shrink-0 text-[10px] font-bold text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded">
                        {data.partOfSpeech}
                      </span>
                    )}
                  </div>
                  {/* Why this word is where it is: its review history at a glance. */}
                  <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5 min-w-0">
                    <span className={`shrink-0 font-bold ${b.text}`}>{b.label}</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{whyLine(item)}</span>
                    <span aria-hidden className="hidden sm:inline">·</span>
                    <span className={`hidden sm:inline shrink-0 font-bold ${LEVEL_COLOR[level]}`}>{level}</span>
                    {views > 0 && (
                      <span className="hidden sm:flex shrink-0 items-center gap-0.5" title={`Seen ${views} time${views === 1 ? '' : 's'}`}>
                        <span aria-hidden>·</span>
                        <Icon icon="lucide:eye" className="text-xs" />
                        {views}
                      </span>
                    )}
                  </div>
                </div>

                {/* Speak button */}
                <button
                  onClick={(e) => handleSpeak(e, word)}
                  aria-label={isSpeaking ? `Stop reading "${word}"` : `Read "${word}" aloud`}
                  className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
                    isSpeaking
                      ? 'bg-accent-cyan/15 text-accent-cyan'
                      : 'text-text-muted hover:text-accent-cyan hover:bg-accent-cyan/10'
                  }`}
                >
                  <Icon icon={isSpeaking ? 'lucide:pause' : 'lucide:volume-2'} className="text-base" />
                </button>

                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(e, word, item)}
                  className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                  title={
                    checked.size === 1 && checked.has('saved') ? 'Remove from saved'
                    : item.status === 'dismissed' && !checked.has('recent') ? 'Show this word again'
                    : 'Remove from history'
                  }
                >
                  <Icon icon="lucide:x" className="text-base" />
                </button>

                {/* Expand chevron */}
                <Icon
                  icon="lucide:chevron-down"
                  className={`shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 sm:pl-16 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  {isLoading ? <WordDetailsLoading /> : data ? <WordDetails data={data} /> : null}
                </div>
              )}
            </div>
          );
        })}
            </div>
          </section>
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
