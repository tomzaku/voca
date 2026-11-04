import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl';
import { podcasts, podcastTopics, type Podcast } from '../data/englishListening';
import { useListeningProgress } from '../hooks/useListeningProgress';
import { isPracticed, type QuestionProgress } from '../hooks/useSpeakingProgress';
import { PodcastScript } from './PodcastScript';
import { PracticeButton } from './PracticeButton';
import { Overview, TopicNav, TopicPickerButton, TopicSheet } from './TopicBrowser';

// Listening → Podcasts, laid out like Speaking's Short Conversation: topics in
// a sidebar (a sheet on mobile) with how many episodes you've heard, a sticky
// toolbar to search and filter, and "Next episode" to be handed one you
// haven't heard yet — shown alone at the top so it can't be scrolled away
// from. An episode counts as listened once it plays to the end, or when
// ticked by hand. Progress is device-local (useListeningProgress).

type Topic = (typeof podcastTopics)[number];
type Level = Podcast['level'];
type Status = 'all' | 'todo' | 'listened' | 'saved';

const TOPIC_ICON: Record<Topic, string> = {
  Technology: 'lucide:cpu',
  'Culture & Society': 'lucide:landmark',
  Science: 'lucide:flask-conical',
  Business: 'lucide:briefcase',
  Psychology: 'lucide:brain',
  Environment: 'lucide:leaf',
  Health: 'lucide:heart-pulse',
  History: 'lucide:scroll',
};

const LEVELS: Level[] = ['Intermediate', 'Upper-Intermediate', 'Advanced'];
// Spelled out in full — Tailwind only keeps classes it finds as whole strings.
const LEVEL_CLASS: Record<Level, string> = {
  Intermediate: 'text-accent-green bg-accent-green/10 border-accent-green/20',
  'Upper-Intermediate': 'text-accent-orange bg-accent-orange/10 border-accent-orange/20',
  Advanced: 'text-accent-red bg-accent-red/10 border-accent-red/20',
};

const STATUSES: { id: Status; labelId: string; icon: string }[] = [
  { id: 'all', labelId: 'conversation.statusAll', icon: 'lucide:layers' },
  { id: 'todo', labelId: 'listening.statusTodo', icon: 'lucide:circle-dashed' },
  { id: 'listened', labelId: 'listening.statusListened', icon: 'lucide:circle-check' },
  { id: 'saved', labelId: 'conversation.statusSaved', icon: 'lucide:bookmark' },
];

function matchesStatus(status: Status, p: QuestionProgress | undefined): boolean {
  if (status === 'todo') return !isPracticed(p);
  if (status === 'listened') return isPracticed(p);
  if (status === 'saved') return !!p?.saved;
  return true;
}

function timeAgo(intl: IntlShape, ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days < 30) return intl.formatRelativeTime(-days, 'day', { numeric: 'auto', style: 'narrow' });
  return intl.formatDate(ms, { month: 'short', day: 'numeric' });
}

/* ─── One episode ────────────────────────────────────────────── */
function EpisodeCard({ p, progress, expanded, showTopic, onToggle, onNext }: {
  p: Podcast;
  progress: QuestionProgress | undefined;
  expanded: boolean;
  showTopic: boolean;
  onToggle: () => void;
  onNext: () => void;
}) {
  const intl = useIntl();
  const { markPracticed, clearPracticed, toggleSaved } = useListeningProgress();
  const done = isPracticed(progress);

  return (
    <div className={`rounded-xl border bg-bg-card overflow-hidden transition-colors ${expanded ? 'border-accent-green/30 shadow-sm' : 'border-border'}`}>
      <div className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3">
        <button
          onClick={() => (done ? clearPracticed(p.id) : markPracticed(p.id))}
          className={`w-7 h-7 mt-0.5 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
            done
              ? 'bg-accent-green text-bg-primary border-accent-green'
              : 'border-border text-transparent hover:border-accent-green hover:text-accent-green/60'
          }`}
          aria-pressed={done}
          aria-label={intl.formatMessage({ id: done ? 'listening.markNotListened' : 'listening.markListened' })}
          title={intl.formatMessage({ id: done ? 'listening.markNotListened' : 'listening.markListened' })}
        >
          <Icon icon="lucide:check" width={14} />
        </button>

        <button onClick={onToggle} className="flex-1 min-w-0 text-left cursor-pointer" aria-expanded={expanded}>
          <p className={`text-[15px] font-medium leading-snug ${done && !expanded ? 'text-text-secondary' : 'text-text-primary'}`}>{p.title}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LEVEL_CLASS[p.level]}`}>{p.level}</span>
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <Icon icon="lucide:clock" width={11} /> {p.duration}
            </span>
            {showTopic && (
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <Icon icon={TOPIC_ICON[p.topic as Topic] ?? 'lucide:mic'} width={11} /> {p.topic}
              </span>
            )}
            {done && progress?.practicedAt && (
              <span className="text-[11px] text-accent-green">
                <FormattedMessage id="listening.listenedAgo" values={{ when: timeAgo(intl, progress.practicedAt) }} />
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => toggleSaved(p.id)}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
            progress?.saved ? 'text-accent-yellow' : 'text-text-muted hover:text-accent-yellow hover:bg-bg-hover/60'
          }`}
          aria-pressed={!!progress?.saved}
          aria-label={intl.formatMessage({ id: progress?.saved ? 'conversation.removeFromSaved' : 'conversation.saveForLater' })}
          title={intl.formatMessage({ id: progress?.saved ? 'conversation.saved' : 'conversation.saveForLater' })}
        >
          <Icon icon={progress?.saved ? 'solar:bookmark-bold' : 'lucide:bookmark'} width={16} />
        </button>
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-full hidden sm:flex items-center justify-center shrink-0 text-text-muted hover:bg-bg-hover/60 cursor-pointer"
          aria-label={intl.formatMessage({ id: expanded ? 'conversation.collapse' : 'conversation.expand' })}
        >
          <Icon icon="lucide:chevron-down" width={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border animate-fade-in">
          <p className="px-3 sm:px-5 py-3 bg-bg-tertiary/50 text-xs text-text-secondary leading-relaxed">{p.description}</p>
          <PodcastScript key={p.id} id={p.id} script={p.script} onFinish={() => { if (!done) markPracticed(p.id); }} />

          {p.vocabulary && p.vocabulary.length > 0 && (
            <div className="px-3 sm:px-5 py-3 bg-accent-cyan/5 border-t border-accent-cyan/10">
              <p className="text-xs font-semibold text-accent-cyan mb-2"><FormattedMessage id="listening.keyVocabulary" /></p>
              <div className="space-y-1.5">
                {p.vocabulary.map((v, i) => (
                  <div key={i} className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-text-primary">{v.word}</span>
                    <span className="text-[11px] text-text-muted">— {v.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.discussionQuestions && p.discussionQuestions.length > 0 && (
            <div className="px-3 sm:px-5 py-3 bg-accent-yellow/5 border-t border-accent-yellow/10">
              <p className="text-xs font-semibold text-accent-yellow mb-2"><FormattedMessage id="listening.discussionQuestions" /></p>
              <ul className="space-y-1">
                {p.discussionQuestions.map((q, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                    <span className="text-accent-yellow/60 mt-0.5 shrink-0">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-3 sm:px-4 py-3 border-t border-border bg-bg-tertiary/40 flex flex-wrap items-center gap-2">
            {done ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-accent-green bg-accent-green/10">
                <Icon icon="lucide:circle-check" width={14} /> <FormattedMessage id="listening.statusListened" />
              </span>
            ) : (
              <button
                onClick={() => markPracticed(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-green text-bg-primary hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Icon icon="lucide:check" width={14} /> <FormattedMessage id="listening.markListened" />
              </button>
            )}
            <PracticeButton
              topic={p.topic}
              focus={p.discussionQuestions?.[0] ?? `What are your thoughts on the podcast "${p.title}"?`}
              label={intl.formatMessage({ id: 'listening.discussEpisode' })}
            />
            <button
              onClick={onNext}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover/60 transition-colors cursor-pointer"
            >
              <FormattedMessage id="conversation.next" /> <Icon icon="lucide:arrow-right" width={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── The tab ────────────────────────────────────────────────── */
export function PodcastTab() {
  const intl = useIntl();
  const progress = useListeningProgress((s) => s.questions);
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [status, setStatus] = useState<Status>('all');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // A "Next episode" pick is shown alone at the top, the list folded away —
  // same as Short Conversation's random question.
  const [focusId, setFocusId] = useState<string | null>(null);
  const focused = focusId ? podcasts.find((p) => p.id === focusId) ?? null : null;

  // Overall + per-topic progress ignore the filters — they describe the bank.
  const { stats, listenedTotal, savedTotal, thisWeek } = useMemo(() => {
    const stats: Record<string, { done: number; total: number }> = {};
    let listenedTotal = 0, savedTotal = 0, thisWeek = 0;
    const weekAgo = Date.now() - 7 * 86_400_000;
    for (const p of podcasts) {
      const pr = progress[p.id];
      const s = (stats[p.topic] ??= { done: 0, total: 0 });
      s.total++;
      if (isPracticed(pr)) {
        s.done++;
        listenedTotal++;
        if (pr!.practicedAt! >= weekAgo) thisWeek++;
      }
      if (pr?.saved) savedTotal++;
    }
    return { stats, listenedTotal, savedTotal, thisWeek };
  }, [progress]);

  const needle = query.trim().toLowerCase();
  // Everything but the status filter, so the status chips can show live counts.
  const base = useMemo(
    () => podcasts.filter((p) =>
      (topic === 'all' || p.topic === topic)
      && (level === 'all' || p.level === level)
      && (!needle || p.title.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle))),
    [topic, level, needle],
  );
  const statusCounts = useMemo(() => {
    const c: Record<Status, number> = { all: base.length, todo: 0, listened: 0, saved: 0 };
    for (const p of base) {
      const pr = progress[p.id];
      if (isPracticed(pr)) c.listened++; else c.todo++;
      if (pr?.saved) c.saved++;
    }
    return c;
  }, [base, progress]);
  const visible = useMemo(() => base.filter((p) => matchesStatus(status, progress[p.id])), [base, status, progress]);

  // Changing what the list shows leaves the Next-episode view.
  const narrow = (fn: () => void) => { fn(); setExpandedId(null); setFocusId(null); };

  const selectTopic = useCallback((t: Topic | 'all') => {
    setTopic(t);
    setExpandedId(null);
    setFocusId(null);
    setSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** A random episode from the current view, preferring ones not yet heard. */
  const next = useCallback(() => {
    const pool = visible.filter((p) => p.id !== expandedId);
    const fresh = pool.filter((p) => !isPracticed(progress[p.id]));
    const from = fresh.length ? fresh : pool;
    if (!from.length) { toast(intl.formatMessage({ id: 'conversation.nothingElse' })); return; }
    if (!fresh.length) toast(intl.formatMessage({ id: 'listening.allListenedReview' }), { icon: '🎉' });
    const id = from[Math.floor(Math.random() * from.length)].id;
    setFocusId(id);
    setExpandedId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [visible, expandedId, progress, intl]);

  const resetFilters = () => narrow(() => { setStatus('all'); setLevel('all'); setQuery(''); setTopic('all'); });

  const card = (p: Podcast) => (
    <EpisodeCard
      key={p.id}
      p={p}
      progress={progress[p.id]}
      expanded={expandedId === p.id}
      showTopic={topic === 'all'}
      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
      onNext={next}
    />
  );

  const nav = (
    <TopicNav
      active={topic}
      all={{ done: listenedTotal, total: podcasts.length }}
      groups={[{ topics: podcastTopics.map((t) => ({ key: t, label: t, icon: TOPIC_ICON[t], done: stats[t]?.done ?? 0, total: stats[t]?.total ?? 0 })) }]}
      onSelect={selectTopic}
    />
  );
  const activeStats = topic === 'all' ? { done: listenedTotal, total: podcasts.length } : stats[topic] ?? { done: 0, total: 0 };

  return (
    <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block sticky top-[calc(4.75rem+env(safe-area-inset-top))] self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 space-y-4">
        <Overview done={listenedTotal} total={podcasts.length} saved={savedTotal} thisWeek={thisWeek} />
        {nav}
      </aside>

      <section className="min-w-0">
        <TopicPickerButton
          icon={topic === 'all' ? 'lucide:layout-grid' : TOPIC_ICON[topic]}
          label={topic === 'all' ? intl.formatMessage({ id: 'conversation.allTopics' }) : topic}
          done={activeStats.done}
          total={activeStats.total}
          onClick={() => setSheetOpen(true)}
        />

        {/* Toolbar */}
        <div className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-[5] mb-4 p-2.5 rounded-xl border border-border bg-bg-card/90 backdrop-blur shadow-sm space-y-2.5">
          <div className="flex gap-2">
            <label className="flex-1 min-w-0 flex items-center gap-2 px-3 rounded-full border border-border bg-bg-card focus-within:border-accent-cyan/50 transition-colors">
              <Icon icon="lucide:search" width={15} className="text-text-muted shrink-0" />
              <input
                value={query}
                onChange={(e) => { const v = e.target.value; narrow(() => setQuery(v)); }}
                placeholder={intl.formatMessage({ id: 'listening.searchEpisodes' })}
                className="flex-1 min-w-0 py-2 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
              {query && (
                <button onClick={() => narrow(() => setQuery(''))} className="text-text-muted hover:text-text-primary cursor-pointer" aria-label={intl.formatMessage({ id: 'conversation.clearSearch' })}>
                  <Icon icon="lucide:x" width={14} />
                </button>
              )}
            </label>
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-3.5 rounded-full text-xs font-bold bg-accent-green text-bg-primary hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              title={intl.formatMessage({ id: 'listening.nextEpisodeTitle' })}
            >
              <Icon icon="lucide:shuffle" width={14} />
              <span className="hidden sm:inline"><FormattedMessage id="listening.nextEpisode" /></span>
              <span className="sm:hidden"><FormattedMessage id="conversation.next" /></span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {STATUSES.map((s) => {
              const on = status === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => narrow(() => setStatus(s.id))}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    on ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Icon icon={s.icon} width={13} />
                  <FormattedMessage id={s.labelId} />
                  <span className={`text-[10px] px-1.5 rounded-full ${on ? 'bg-black/15' : 'bg-bg-primary/60'}`}>{statusCounts[s.id]}</span>
                </button>
              );
            })}
            <span className="w-px h-5 bg-border mx-1 shrink-0" />
            {LEVELS.map((l) => {
              const on = level === l;
              return (
                <button
                  key={l}
                  onClick={() => narrow(() => setLevel(on ? 'all' : l))}
                  aria-pressed={on}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                    on ? LEVEL_CLASS[l] : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Header for a single topic */}
        {topic !== 'all' && !focused && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Icon icon={TOPIC_ICON[topic]} className="text-accent-green shrink-0" width={18} />
              <h2 className="text-base font-bold text-text-primary truncate">{topic}</h2>
              <span className="text-xs text-text-muted shrink-0">
                <FormattedMessage id="listening.episodeCount" values={{ count: visible.length }} />
              </span>
            </div>
            <PracticeButton topic={topic} label={intl.formatMessage({ id: 'listening.practiceThisTopic' })} />
          </div>
        )}

        {/* List */}
        {focused ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-green">
                <Icon icon="lucide:shuffle" width={13} />
                <FormattedMessage id="conversation.randomPick" />
              </span>
              <button
                onClick={() => setFocusId(null)}
                className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <Icon icon="lucide:list" width={13} />
                <FormattedMessage id="listening.backToList" values={{ count: visible.length }} />
              </button>
            </div>
            {card(focused)}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-border">
            <Icon icon={status === 'saved' ? 'lucide:bookmark' : status === 'listened' ? 'lucide:circle-check' : 'lucide:search-x'} width={28} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">
              {intl.formatMessage({
                id: status === 'saved' ? 'listening.emptySaved'
                  : status === 'listened' ? 'listening.emptyListened'
                  : status === 'todo' ? 'listening.emptyTodo'
                  : 'listening.noPodcasts',
              })}
            </p>
            <button onClick={resetFilters} className="mt-3 text-xs font-semibold text-accent-cyan hover:underline cursor-pointer"><FormattedMessage id="conversation.resetFilters" /></button>
          </div>
        ) : (
          <div className="space-y-2">{visible.map(card)}</div>
        )}
      </section>

      <TopicSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>{nav}</TopicSheet>
    </div>
  );
}
