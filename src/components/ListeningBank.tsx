import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl';
import type { PracticeProgressStore } from '../hooks/useListeningProgress';
import { isPracticed, type QuestionProgress } from '../hooks/useSpeakingProgress';
import { Overview, TopicNav, TopicPickerButton, TopicSheet } from './TopicBrowser';

// The layout every Listening bank shares — Podcasts, Comprehension, IELTS —
// modelled on Speaking's Short Conversation: topics in a sidebar (a sheet on
// mobile) with per-topic progress, a sticky toolbar to search and filter by
// status plus one bank-specific chip row (level, or IELTS section), and
// "Random" to be handed an item you haven't done, shown alone at the top so it
// can't be scrolled away from. Each bank supplies its data, the card's meta
// line and its expanded body; the done/saved state lives in its own store.

export interface BankItem { id: string; title: string; topic: string }

export interface BankChip<C extends string> {
  key: C;
  label: string;
  /** Full class string for the "on" state — Tailwind needs whole strings. */
  className: string;
}

/** Message ids for the words that change between banks. */
export interface BankLabels {
  search: string;
  nextTitle: string;
  backToList: string;
  count: string;
  allDoneReview: string;
  todo: string;
  done: string;
  markDone: string;
  markNotDone: string;
  doneAgo: string;
  emptyMatch: string;
  emptySaved: string;
  emptyDone: string;
  emptyTodo: string;
}

export interface BodyContext {
  done: boolean;
  /** Record an attempt — every check counts, and replaces the last score. */
  markDone: (score?: QuestionProgress['score']) => void;
}

type Status = 'all' | 'todo' | 'done' | 'saved';

function matchesStatus(status: Status, p: QuestionProgress | undefined): boolean {
  if (status === 'todo') return !isPracticed(p);
  if (status === 'done') return isPracticed(p);
  if (status === 'saved') return !!p?.saved;
  return true;
}

function timeAgo(intl: IntlShape, ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days < 30) return intl.formatRelativeTime(-days, 'day', { numeric: 'auto', style: 'narrow' });
  return intl.formatDate(ms, { month: 'short', day: 'numeric' });
}

/* ─── One item ───────────────────────────────────────────────── */
function BankCard<T extends BankItem>({ item, progress, store, labels, expanded, showTopic, topicIcon, meta, body, actions, onToggle, onNext }: {
  item: T;
  progress: QuestionProgress | undefined;
  store: PracticeProgressStore;
  labels: BankLabels;
  expanded: boolean;
  showTopic: boolean;
  topicIcon: string;
  meta: ReactNode;
  body: (ctx: BodyContext) => ReactNode;
  actions?: ReactNode;
  onToggle: () => void;
  onNext: () => void;
}) {
  const intl = useIntl();
  const { markPracticed, clearPracticed, toggleSaved } = store();
  const done = isPracticed(progress);
  const markDone = (score?: QuestionProgress['score']) => markPracticed(item.id, score);
  const score = done ? progress?.score : undefined;

  return (
    <div className={`rounded-xl border bg-bg-card overflow-hidden transition-colors ${expanded ? 'border-accent-green/30 shadow-sm' : 'border-border'}`}>
      <div className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3">
        <button
          onClick={() => (done ? clearPracticed(item.id) : markPracticed(item.id))}
          className={`w-7 h-7 mt-0.5 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
            done
              ? 'bg-accent-green text-bg-primary border-accent-green'
              : 'border-border text-transparent hover:border-accent-green hover:text-accent-green/60'
          }`}
          aria-pressed={done}
          aria-label={intl.formatMessage({ id: done ? labels.markNotDone : labels.markDone })}
          title={intl.formatMessage({ id: done ? labels.markNotDone : labels.markDone })}
        >
          <Icon icon="lucide:check" width={14} />
        </button>

        <button onClick={onToggle} className="flex-1 min-w-0 text-left cursor-pointer" aria-expanded={expanded}>
          <p className={`text-[15px] font-medium leading-snug ${done && !expanded ? 'text-text-secondary' : 'text-text-primary'}`}>{item.title}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            {meta}
            {showTopic && (
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <Icon icon={topicIcon} width={11} /> {item.topic}
              </span>
            )}
            {done && progress?.practicedAt && (
              <span className="text-[11px] text-accent-green">
                <FormattedMessage id={labels.doneAgo} values={{ when: timeAgo(intl, progress.practicedAt) }} />
                {score && <> · <span className="font-semibold tabular-nums">{score.correct}/{score.total}</span></>}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => toggleSaved(item.id)}
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
          {body({ done, markDone })}

          <div className="px-3 sm:px-4 py-3 border-t border-border bg-bg-tertiary/40 flex flex-wrap items-center gap-2">
            {done ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-accent-green bg-accent-green/10">
                <Icon icon="lucide:circle-check" width={14} /> <FormattedMessage id={labels.done} />
              </span>
            ) : (
              <button
                onClick={() => markDone()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-green text-bg-primary hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Icon icon="lucide:check" width={14} /> <FormattedMessage id={labels.markDone} />
              </button>
            )}
            {actions}
            <button
              onClick={onNext}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover/60 transition-colors cursor-pointer"
            >
              <Icon icon="lucide:shuffle" width={14} /> <FormattedMessage id="conversation.random" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── The bank ───────────────────────────────────────────────── */
export function ListeningBank<T extends BankItem, C extends string>({
  items, topics, topicIcon, store, labels, chips, chipOf, matches, intro,
  meta, body, actions, topicAction,
}: {
  items: T[];
  topics: readonly string[];
  topicIcon: (topic: string) => string;
  store: PracticeProgressStore;
  labels: BankLabels;
  /** One row of toggle chips next to the status filter — level, section… */
  chips: BankChip<C>[];
  chipOf: (item: T) => C;
  /** Search match against an already-lowercased needle. */
  matches: (item: T, needle: string) => boolean;
  intro?: ReactNode;
  meta: (item: T) => ReactNode;
  body: (item: T, ctx: BodyContext) => ReactNode;
  actions?: (item: T) => ReactNode;
  topicAction?: (topic: string) => ReactNode;
}) {
  const intl = useIntl();
  const progress = store((s) => s.questions);
  const [topic, setTopic] = useState<string>('all');
  const [status, setStatus] = useState<Status>('all');
  const [chip, setChip] = useState<C | 'all'>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focused = focusId ? items.find((p) => p.id === focusId) ?? null : null;

  const statuses: { id: Status; labelId: string; icon: string }[] = [
    { id: 'all', labelId: 'conversation.statusAll', icon: 'lucide:layers' },
    { id: 'todo', labelId: labels.todo, icon: 'lucide:circle-dashed' },
    { id: 'done', labelId: labels.done, icon: 'lucide:circle-check' },
    { id: 'saved', labelId: 'conversation.statusSaved', icon: 'lucide:bookmark' },
  ];

  // Overall + per-topic progress ignore the filters — they describe the bank.
  const { stats, doneTotal, savedTotal, thisWeek } = useMemo(() => {
    const stats: Record<string, { done: number; total: number }> = {};
    let doneTotal = 0, savedTotal = 0, thisWeek = 0;
    const weekAgo = Date.now() - 7 * 86_400_000;
    for (const p of items) {
      const pr = progress[p.id];
      const s = (stats[p.topic] ??= { done: 0, total: 0 });
      s.total++;
      if (isPracticed(pr)) {
        s.done++;
        doneTotal++;
        if (pr!.practicedAt! >= weekAgo) thisWeek++;
      }
      if (pr?.saved) savedTotal++;
    }
    return { stats, doneTotal, savedTotal, thisWeek };
  }, [items, progress]);

  const needle = query.trim().toLowerCase();
  // Everything but the status filter, so the status chips can show live counts.
  const base = useMemo(
    () => items.filter((p) =>
      (topic === 'all' || p.topic === topic)
      && (chip === 'all' || chipOf(p) === chip)
      && (!needle || matches(p, needle))),
    [items, topic, chip, chipOf, needle, matches],
  );
  const statusCounts = useMemo(() => {
    const c: Record<Status, number> = { all: base.length, todo: 0, done: 0, saved: 0 };
    for (const p of base) {
      const pr = progress[p.id];
      if (isPracticed(pr)) c.done++; else c.todo++;
      if (pr?.saved) c.saved++;
    }
    return c;
  }, [base, progress]);
  const visible = useMemo(() => base.filter((p) => matchesStatus(status, progress[p.id])), [base, status, progress]);

  // Changing what the list shows leaves the Random view.
  const narrow = (fn: () => void) => { fn(); setExpandedId(null); setFocusId(null); };

  const selectTopic = useCallback((t: string) => {
    setTopic(t);
    setExpandedId(null);
    setFocusId(null);
    setSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** A random item from the current view, preferring ones not yet done. */
  const next = useCallback(() => {
    const pool = visible.filter((p) => p.id !== expandedId);
    const fresh = pool.filter((p) => !isPracticed(progress[p.id]));
    const from = fresh.length ? fresh : pool;
    if (!from.length) { toast(intl.formatMessage({ id: 'conversation.nothingElse' })); return; }
    if (!fresh.length) toast(intl.formatMessage({ id: labels.allDoneReview }), { icon: '🎉' });
    const id = from[Math.floor(Math.random() * from.length)].id;
    setFocusId(id);
    setExpandedId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [visible, expandedId, progress, intl, labels.allDoneReview]);

  const resetFilters = () => narrow(() => { setStatus('all'); setChip('all'); setQuery(''); setTopic('all'); });

  const card = (p: T) => (
    <BankCard
      key={p.id}
      item={p}
      progress={progress[p.id]}
      store={store}
      labels={labels}
      expanded={expandedId === p.id}
      showTopic={topic === 'all'}
      topicIcon={topicIcon(p.topic)}
      meta={meta(p)}
      body={(ctx) => body(p, ctx)}
      actions={actions?.(p)}
      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
      onNext={next}
    />
  );

  const nav = (
    <TopicNav
      active={topic}
      all={{ done: doneTotal, total: items.length }}
      groups={[{ topics: topics.map((t) => ({ key: t, label: t, icon: topicIcon(t), done: stats[t]?.done ?? 0, total: stats[t]?.total ?? 0 })) }]}
      onSelect={selectTopic}
    />
  );
  const activeStats = topic === 'all' ? { done: doneTotal, total: items.length } : stats[topic] ?? { done: 0, total: 0 };

  return (
    <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block sticky top-[calc(4.75rem+env(safe-area-inset-top))] self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 space-y-4">
        <Overview done={doneTotal} total={items.length} saved={savedTotal} thisWeek={thisWeek} />
        {nav}
      </aside>

      <section className="min-w-0">
        <TopicPickerButton
          icon={topic === 'all' ? 'lucide:layout-grid' : topicIcon(topic)}
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
                placeholder={intl.formatMessage({ id: labels.search })}
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
              title={intl.formatMessage({ id: labels.nextTitle })}
            >
              <Icon icon="lucide:shuffle" width={14} />
              <FormattedMessage id="conversation.random" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {statuses.map((s) => {
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
            {chips.map((c) => {
              const on = chip === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => narrow(() => setChip(on ? 'all' : c.key))}
                  aria-pressed={on}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                    on ? c.className : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Header for a single topic */}
        {topic !== 'all' && !focused && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Icon icon={topicIcon(topic)} className="text-accent-green shrink-0" width={18} />
              <h2 className="text-base font-bold text-text-primary truncate">{topic}</h2>
              <span className="text-xs text-text-muted shrink-0">
                <FormattedMessage id={labels.count} values={{ count: visible.length }} />
              </span>
            </div>
            {topicAction?.(topic)}
          </div>
        )}

        {intro && !focused && <p className="text-xs text-text-muted mb-3 px-1">{intro}</p>}

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
                <FormattedMessage id={labels.backToList} values={{ count: visible.length }} />
              </button>
            </div>
            {card(focused)}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-border">
            <Icon icon={status === 'saved' ? 'lucide:bookmark' : status === 'done' ? 'lucide:circle-check' : 'lucide:search-x'} width={28} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">
              {intl.formatMessage({
                id: status === 'saved' ? labels.emptySaved
                  : status === 'done' ? labels.emptyDone
                  : status === 'todo' ? labels.emptyTodo
                  : labels.emptyMatch,
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
