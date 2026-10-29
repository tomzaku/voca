import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl';
import {
  speakingQuestions,
  speakingTopicGroups,
  type SpeakingDifficulty,
  type SpeakingQuestion,
  type SpeakingTopic,
} from '../data/englishSpeaking';
import { useSpeakingProgress, isPracticed, type QuestionProgress } from '../hooks/useSpeakingProgress';
import { ReadAloud } from './ReadAloud';
import { PracticeButton } from './PracticeButton';

// "Short Conversation" — a big bank of everyday questions, organised so a
// learner can see what they've covered: topics grouped in a sidebar (a bottom
// sheet on mobile) with per-topic progress, status filters, and saved
// questions. Progress is device-local (`useSpeakingProgress`).

type Status = 'all' | 'todo' | 'practiced' | 'saved';
type TopicFilter = SpeakingTopic | 'all';

const DIFFICULTIES: SpeakingDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABEL: Record<SpeakingDifficulty, string> = {
  easy: 'conversation.levelEasy',
  medium: 'conversation.levelMedium',
  hard: 'conversation.levelHard',
};
// Spelled out in full — Tailwind only keeps classes it finds as whole strings.
const DIFFICULTY_CLASS: Record<SpeakingDifficulty, string> = {
  easy: 'text-accent-green bg-accent-green/10 border-accent-green/20',
  medium: 'text-accent-orange bg-accent-orange/10 border-accent-orange/20',
  hard: 'text-accent-red bg-accent-red/10 border-accent-red/20',
};

const TOPIC_ICON: Record<SpeakingTopic, string> = {
  'Self Introduction': 'lucide:smile',
  'Childhood & Memories': 'lucide:baby',
  'Relationships & Family': 'lucide:heart',
  'Future Plans': 'lucide:telescope',
  'Daily Life': 'lucide:sun',
  'Home & Neighborhood': 'lucide:house',
  'Food & Culture': 'lucide:utensils',
  'Shopping & Fashion': 'lucide:shopping-bag',
  'Money & Finance': 'lucide:wallet',
  'Health & Wellness': 'lucide:heart-pulse',
  'Hobbies & Interests': 'lucide:palette',
  'Movies, Music & Books': 'lucide:clapperboard',
  'Sports & Games': 'lucide:trophy',
  'Animals & Pets': 'lucide:paw-print',
  'Celebrations & Holidays': 'lucide:party-popper',
  'Hometown & Travel': 'lucide:plane',
  'Environment & Nature': 'lucide:leaf',
  'Opinions & Ideas': 'lucide:message-circle',
  'Education & Learning': 'lucide:graduation-cap',
  'Problem Solving': 'lucide:puzzle',
  'What If': 'lucide:sparkles',
  'Feelings & Emotions': 'lucide:smile-plus',
  'Friends & Social Life': 'lucide:heart-handshake',
  'Manners & Etiquette': 'lucide:handshake',
  'Art & Creativity': 'lucide:brush',
  'Weather & Seasons': 'lucide:cloud-sun',
  'Getting Around': 'lucide:bus',
  'Society & Community': 'lucide:landmark',
  'Languages & Communication': 'lucide:languages',
};

const STATUSES: { id: Status; labelId: string; icon: string }[] = [
  { id: 'all', labelId: 'conversation.statusAll', icon: 'lucide:layers' },
  { id: 'todo', labelId: 'conversation.statusTodo', icon: 'lucide:circle-dashed' },
  { id: 'practiced', labelId: 'conversation.statusPracticed', icon: 'lucide:circle-check' },
  { id: 'saved', labelId: 'conversation.statusSaved', icon: 'lucide:bookmark' },
];

/** Questions shown per topic in the grouped "All topics" view before "Show all". */
const PREVIEW_PER_TOPIC = 3;

function matchesStatus(status: Status, p: QuestionProgress | undefined): boolean {
  if (status === 'todo') return !isPracticed(p);
  if (status === 'practiced') return isPracticed(p);
  if (status === 'saved') return !!p?.saved;
  return true;
}

function timeAgo(intl: IntlShape, ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days < 30) return intl.formatRelativeTime(-days, 'day', { numeric: 'auto', style: 'narrow' });
  return intl.formatDate(ms, { month: 'short', day: 'numeric' });
}

/* ─── Progress bits ──────────────────────────────────────────── */
function Bar({ done, total, className = '' }: { done: number; total: number; className?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`h-1.5 rounded-full bg-bg-tertiary overflow-hidden ${className}`}>
      <div className="h-full rounded-full bg-accent-green transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Overview({ practiced, total, saved, thisWeek }: { practiced: number; total: number; saved: number; thisWeek: number }) {
  const pct = total ? Math.round((practiced / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"><FormattedMessage id="conversation.yourProgress" /></p>
          <p className="text-2xl font-extrabold text-text-primary leading-tight">
            {practiced}<span className="text-sm font-semibold text-text-muted"> / {total}</span>
          </p>
        </div>
        <span className="text-sm font-bold text-accent-green">{pct}%</span>
      </div>
      <Bar done={practiced} total={total} />
      <div className="flex items-center gap-4 mt-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1"><Icon icon="lucide:flame" className="text-accent-orange" /><FormattedMessage id="conversation.thisWeek" values={{ count: thisWeek }} /></span>
        <span className="flex items-center gap-1"><Icon icon="lucide:bookmark" className="text-accent-yellow" /><FormattedMessage id="conversation.savedCount" values={{ count: saved }} /></span>
      </div>
    </div>
  );
}

/* ─── Topic navigation (sidebar on desktop, sheet on mobile) ─── */
function TopicNav({ active, stats, total, practicedTotal, onSelect }: {
  active: TopicFilter;
  stats: Record<string, { done: number; total: number }>;
  total: number;
  practicedTotal: number;
  onSelect: (t: TopicFilter) => void;
}) {
  const intl = useIntl();
  const row = (key: TopicFilter, label: string, icon: string, done: number, count: number) => {
    const on = active === key;
    const complete = count > 0 && done === count;
    return (
      <button
        key={key}
        onClick={() => onSelect(key)}
        aria-current={on ? 'true' : undefined}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
          on ? 'bg-accent-green/10 text-text-primary' : 'text-text-secondary hover:bg-bg-hover/60'
        }`}
      >
        <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
          on ? 'bg-accent-green/20 text-accent-green' : 'bg-bg-tertiary text-text-muted'
        }`}>
          <Icon icon={complete ? 'lucide:check' : icon} width={14} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[13px] truncate ${on ? 'font-semibold' : 'font-medium'}`}>{label}</span>
          <Bar done={done} total={count} className="mt-1 h-1" />
        </span>
        <span className="text-[11px] tabular-nums text-text-muted shrink-0">{done}/{count}</span>
      </button>
    );
  };

  return (
    <nav className="space-y-4">
      {row('all', intl.formatMessage({ id: 'conversation.allTopics' }), 'lucide:layout-grid', practicedTotal, total)}
      {speakingTopicGroups.map((g) => (
        <div key={g.label}>
          <p className="px-2.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">{g.label}</p>
          <div className="space-y-0.5">
            {g.topics.map((t) => row(t, t, TOPIC_ICON[t], stats[t]?.done ?? 0, stats[t]?.total ?? 0))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function TopicSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const intl = useIntl();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={intl.formatMessage({ id: 'conversation.chooseTopic' })}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col rounded-t-2xl border-t border-border bg-bg-primary animate-fade-in">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
          <span className="text-sm font-bold text-text-primary"><FormattedMessage id="conversation.topics" /></span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-bg-hover cursor-pointer" aria-label={intl.formatMessage({ id: 'conversation.close' })}>
            <Icon icon="lucide:x" width={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-2 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/* ─── One question ───────────────────────────────────────────── */
function QuestionCard({ q, progress, expanded, showTopic, onToggle, onNext }: {
  q: SpeakingQuestion;
  progress: QuestionProgress | undefined;
  expanded: boolean;
  showTopic: boolean;
  onToggle: () => void;
  onNext: () => void;
}) {
  const intl = useIntl();
  const { markPracticed, clearPracticed, toggleSaved } = useSpeakingProgress();
  const [answerIdx, setAnswerIdx] = useState(0);
  const done = isPracticed(progress);
  const answer = q.sampleAnswers[Math.min(answerIdx, q.sampleAnswers.length - 1)];

  return (
    <div
      id={`q-${q.id}`}
      className={`rounded-xl border bg-bg-card overflow-hidden transition-colors scroll-mt-48 ${
        expanded ? 'border-accent-green/30 shadow-sm' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3">
        <button
          onClick={() => (done ? clearPracticed(q.id) : markPracticed(q.id))}
          className={`w-7 h-7 mt-0.5 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
            done
              ? 'bg-accent-green text-bg-primary border-accent-green'
              : 'border-border text-transparent hover:border-accent-green hover:text-accent-green/60'
          }`}
          aria-pressed={done}
          aria-label={intl.formatMessage({ id: done ? 'conversation.markNotPracticed' : 'conversation.markAsPracticed' })}
          title={intl.formatMessage({ id: done ? 'conversation.practicedUndo' : 'conversation.markAsPracticed' })}
        >
          <Icon icon="lucide:check" width={14} />
        </button>

        <button onClick={onToggle} className="flex-1 min-w-0 text-left cursor-pointer" aria-expanded={expanded}>
          <p className={`text-[15px] font-medium leading-snug ${done && !expanded ? 'text-text-secondary' : 'text-text-primary'}`}>
            {q.question}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${DIFFICULTY_CLASS[q.difficulty]}`}>
              <FormattedMessage id={DIFFICULTY_LABEL[q.difficulty]} />
            </span>
            {showTopic && (
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <Icon icon={TOPIC_ICON[q.topic as SpeakingTopic] ?? 'lucide:message-circle'} width={11} />
                {q.topic}
              </span>
            )}
            {done && progress?.practicedAt && (
              <span className="text-[11px] text-accent-green">
                <FormattedMessage
                  id="conversation.practicedAgo"
                  values={{ count: progress.count, when: timeAgo(intl, progress.practicedAt) }}
                />
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => toggleSaved(q.id)}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
            progress?.saved ? 'text-accent-yellow' : 'text-text-muted hover:text-accent-yellow hover:bg-bg-hover/60'
          }`}
          aria-pressed={!!progress?.saved}
          aria-label={intl.formatMessage({ id: progress?.saved ? 'conversation.removeFromSaved' : 'conversation.saveQuestion' })}
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
          <div className="px-3 sm:px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {q.sampleAnswers.length > 1 ? (
                <div className="flex gap-1 p-0.5 rounded-lg bg-bg-tertiary">
                  {q.sampleAnswers.map((sa, i) => (
                    <button
                      key={i}
                      onClick={() => setAnswerIdx(i)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        i === answerIdx ? 'bg-bg-card text-accent-cyan shadow-sm' : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {sa.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-accent-cyan"><FormattedMessage id="conversation.sampleAnswer" /></span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{answer.label}</span>
                </span>
              )}
              <ReadAloud text={answer.answer} />
            </div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{answer.answer}</p>
          </div>

          {q.usefulPhrases && q.usefulPhrases.length > 0 && (
            <div className="px-3 sm:px-4 py-3 bg-accent-yellow/5 border-t border-accent-yellow/10">
              <p className="text-xs font-semibold text-accent-yellow mb-2"><FormattedMessage id="conversation.usefulPhrases" /></p>
              <div className="flex flex-wrap gap-1.5">
                {q.usefulPhrases.map((phrase, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-accent-yellow/10 text-text-secondary border border-accent-yellow/15">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="px-3 sm:px-4 py-3 border-t border-border bg-bg-tertiary/40 flex flex-wrap items-center gap-2">
            {done ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-accent-green bg-accent-green/10">
                <Icon icon="lucide:circle-check" width={14} /> <FormattedMessage id="conversation.statusPracticed" />
              </span>
            ) : (
              <button
                onClick={() => markPracticed(q.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-green text-bg-primary hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Icon icon="lucide:check" width={14} /> <FormattedMessage id="conversation.iAnsweredIt" />
              </button>
            )}
            <PracticeButton topic={q.topic} focus={q.question} label={intl.formatMessage({ id: 'conversation.practiceWithAi' })} onStart={() => markPracticed(q.id)} />
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
export function ShortConversationTab() {
  const intl = useIntl();
  const progress = useSpeakingProgress((s) => s.questions);
  const [topic, setTopic] = useState<TopicFilter>('all');
  const [status, setStatus] = useState<Status>('all');
  const [level, setLevel] = useState<SpeakingDifficulty | 'all'>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingScroll = useRef<string | null>(null);

  // Overall + per-topic progress ignore the filters — they describe the bank.
  const { stats, practicedTotal, savedTotal, thisWeek } = useMemo(() => {
    const stats: Record<string, { done: number; total: number }> = {};
    let practicedTotal = 0, savedTotal = 0, thisWeek = 0;
    const weekAgo = Date.now() - 7 * 86_400_000;
    for (const q of speakingQuestions) {
      const p = progress[q.id];
      const s = (stats[q.topic] ??= { done: 0, total: 0 });
      s.total++;
      if (isPracticed(p)) {
        s.done++;
        practicedTotal++;
        if (p!.practicedAt! >= weekAgo) thisWeek++;
      }
      if (p?.saved) savedTotal++;
    }
    return { stats, practicedTotal, savedTotal, thisWeek };
  }, [progress]);

  const needle = query.trim().toLowerCase();
  // Everything but the status filter, so the status chips can show live counts.
  const base = useMemo(
    () => speakingQuestions.filter((q) =>
      (topic === 'all' || q.topic === topic)
      && (level === 'all' || q.difficulty === level)
      && (!needle || q.question.toLowerCase().includes(needle) || q.topic.toLowerCase().includes(needle))),
    [topic, level, needle],
  );
  const statusCounts = useMemo(() => {
    const c: Record<Status, number> = { all: base.length, todo: 0, practiced: 0, saved: 0 };
    for (const q of base) {
      const p = progress[q.id];
      if (isPracticed(p)) c.practiced++; else c.todo++;
      if (p?.saved) c.saved++;
    }
    return c;
  }, [base, progress]);
  const visible = useMemo(() => base.filter((q) => matchesStatus(status, progress[q.id])), [base, status, progress]);

  // Grouped by topic only on the plain "All topics" view; any narrowing filter
  // (search, a status) switches to one flat list so nothing hides behind
  // "Show all".
  const grouped = topic === 'all' && !needle && status === 'all';
  const sections = useMemo(() => {
    if (!grouped) return null;
    return speakingTopicGroups.flatMap((g) => g.topics).map((t) => ({
      topic: t,
      items: visible.filter((q) => q.topic === t),
    })).filter((s) => s.items.length > 0);
  }, [grouped, visible]);

  const selectTopic = useCallback((t: TopicFilter) => {
    setTopic(t);
    setExpandedId(null);
    setSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const open = useCallback((id: string) => {
    const q = speakingQuestions.find((x) => x.id === id);
    if (q) setOpenGroups((prev) => new Set(prev).add(q.topic));
    setExpandedId(id);
    pendingScroll.current = id;
  }, []);

  // Scroll after the card has rendered expanded (and its group opened).
  useEffect(() => {
    const id = pendingScroll.current;
    if (!id || expandedId !== id) return;
    pendingScroll.current = null;
    requestAnimationFrame(() => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [expandedId, openGroups]);

  /** A random question from the current view, preferring ones not yet practiced. */
  const next = useCallback(() => {
    const pool = visible.filter((q) => q.id !== expandedId);
    const fresh = pool.filter((q) => !isPracticed(progress[q.id]));
    const from = fresh.length ? fresh : pool;
    if (!from.length) { toast(intl.formatMessage({ id: 'conversation.nothingElse' })); return; }
    if (!fresh.length) toast(intl.formatMessage({ id: 'conversation.allPracticedReview' }), { icon: '🎉' });
    open(from[Math.floor(Math.random() * from.length)].id);
  }, [visible, expandedId, progress, open, intl]);

  const resetFilters = () => { setStatus('all'); setLevel('all'); setQuery(''); setTopic('all'); };

  const card = (q: SpeakingQuestion) => (
    <QuestionCard
      key={q.id}
      q={q}
      progress={progress[q.id]}
      expanded={expandedId === q.id}
      showTopic={topic === 'all' && !grouped}
      onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
      onNext={next}
    />
  );

  const nav = (
    <TopicNav active={topic} stats={stats} total={speakingQuestions.length} practicedTotal={practicedTotal} onSelect={selectTopic} />
  );
  const activeStats = topic === 'all' ? { done: practicedTotal, total: speakingQuestions.length } : stats[topic];

  return (
    <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block sticky top-[calc(4.75rem+env(safe-area-inset-top))] self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 space-y-4">
        <Overview practiced={practicedTotal} total={speakingQuestions.length} saved={savedTotal} thisWeek={thisWeek} />
        {nav}
      </aside>

      <section className="min-w-0">
        {/* Mobile: compact progress + topic picker */}
        <div className="lg:hidden mb-3">
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-bg-card px-3 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-transform"
          >
            <span className="w-9 h-9 rounded-lg bg-accent-green/15 text-accent-green flex items-center justify-center shrink-0">
              <Icon icon={topic === 'all' ? 'lucide:layout-grid' : TOPIC_ICON[topic]} width={18} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-text-primary truncate">{topic === 'all' ? intl.formatMessage({ id: 'conversation.allTopics' }) : topic}</span>
              <span className="flex items-center gap-2 mt-1">
                <Bar done={activeStats.done} total={activeStats.total} className="flex-1" />
                <span className="text-[11px] tabular-nums text-text-muted">{activeStats.done}/{activeStats.total}</span>
              </span>
            </span>
            <Icon icon="lucide:chevrons-up-down" width={16} className="text-text-muted shrink-0" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-[5] mb-4 p-2.5 rounded-xl border border-border bg-bg-card/90 backdrop-blur shadow-sm space-y-2.5">
          <div className="flex gap-2">
            <label className="flex-1 min-w-0 flex items-center gap-2 px-3 rounded-full border border-border bg-bg-card focus-within:border-accent-cyan/50 transition-colors">
              <Icon icon="lucide:search" width={15} className="text-text-muted shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={intl.formatMessage({ id: 'conversation.searchQuestions' })}
                className="flex-1 min-w-0 py-2 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-text-muted hover:text-text-primary cursor-pointer" aria-label={intl.formatMessage({ id: 'conversation.clearSearch' })}>
                  <Icon icon="lucide:x" width={14} />
                </button>
              )}
            </label>
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-3.5 rounded-full text-xs font-bold bg-accent-green text-bg-primary hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              title={intl.formatMessage({ id: 'conversation.nextQuestionTitle' })}
            >
              <Icon icon="lucide:shuffle" width={14} />
              <span className="hidden sm:inline"><FormattedMessage id="conversation.nextQuestion" /></span>
              <span className="sm:hidden"><FormattedMessage id="conversation.next" /></span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {STATUSES.map((s) => {
              const on = status === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setStatus(s.id); setExpandedId(null); }}
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
            {DIFFICULTIES.map((d) => {
              const on = level === d;
              return (
                <button
                  key={d}
                  onClick={() => { setLevel(on ? 'all' : d); setExpandedId(null); }}
                  aria-pressed={on}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                    on ? DIFFICULTY_CLASS[d] : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
                  }`}
                >
                  <FormattedMessage id={DIFFICULTY_LABEL[d]} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Header for a single topic */}
        {topic !== 'all' && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Icon icon={TOPIC_ICON[topic]} className="text-accent-green shrink-0" width={18} />
              <h2 className="text-base font-bold text-text-primary truncate">{topic}</h2>
              <span className="text-xs text-text-muted shrink-0">
                <FormattedMessage id="conversation.questionCount" values={{ count: visible.length }} />
              </span>
            </div>
            <PracticeButton topic={topic} label={intl.formatMessage({ id: 'conversation.freeTalk' })} />
          </div>
        )}

        {/* List */}
        {visible.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-border">
            <Icon icon={status === 'saved' ? 'lucide:bookmark' : status === 'practiced' ? 'lucide:circle-check' : 'lucide:search-x'} width={28} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">
              {intl.formatMessage({
                id: status === 'saved' ? 'conversation.emptySaved'
                  : status === 'practiced' ? 'conversation.emptyPracticed'
                  : status === 'todo' ? 'conversation.emptyTodo'
                  : 'conversation.emptyFilters',
              })}
            </p>
            <button onClick={resetFilters} className="mt-3 text-xs font-semibold text-accent-cyan hover:underline cursor-pointer"><FormattedMessage id="conversation.resetFilters" /></button>
          </div>
        ) : sections ? (
          <div className="space-y-6">
            {sections.map(({ topic: t, items }) => {
              const isOpen = openGroups.has(t);
              const shown = isOpen ? items : items.slice(0, PREVIEW_PER_TOPIC);
              const s = stats[t];
              return (
                <section key={t}>
                  <button onClick={() => selectTopic(t)} className="w-full flex items-center gap-2.5 mb-2 group cursor-pointer text-left">
                    <span className="w-7 h-7 rounded-md bg-bg-tertiary text-text-muted group-hover:text-accent-green flex items-center justify-center shrink-0 transition-colors">
                      <Icon icon={TOPIC_ICON[t]} width={14} />
                    </span>
                    <span className="text-sm font-bold text-text-primary group-hover:text-accent-green transition-colors">{t}</span>
                    <Bar done={s.done} total={s.total} className="flex-1 max-w-32 ml-1" />
                    <span className="text-[11px] tabular-nums text-text-muted">{s.done}/{s.total}</span>
                    <Icon icon="lucide:chevron-right" width={14} className="ml-auto text-text-muted" />
                  </button>
                  <div className="space-y-2">{shown.map(card)}</div>
                  {items.length > PREVIEW_PER_TOPIC && (
                    <button
                      onClick={() => setOpenGroups((prev) => {
                        const n = new Set(prev);
                        if (n.has(t)) n.delete(t); else n.add(t);
                        return n;
                      })}
                      className="mt-2 w-full py-2 rounded-lg text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-hover/50 transition-colors cursor-pointer"
                    >
                      {isOpen
                        ? intl.formatMessage({ id: 'conversation.showLess' })
                        : intl.formatMessage({ id: 'conversation.showAll' }, { count: items.length })}
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">{visible.map(card)}</div>
        )}
      </section>

      <TopicSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>{nav}</TopicSheet>
    </div>
  );
}
