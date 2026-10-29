import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { collectionShareUrl, useCollections } from '../hooks/useCollections';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useProgressForWords } from '../hooks/useProgressQuery';
import { getCollection, isCollectionId } from '../lib/collections';
import { PHOTO_SCRIM, topicCover, topicPhoto } from '../lib/topicTheme';
import {
  fetchCollectionDetail,
  fetchMembers,
  joinCollection,
  type Collection,
  type CollectionOwner,
  type MemberProgress,
} from '../lib/collectionsApi';
import { BUCKET_META, BUCKET_ORDER, progressLookup, whyLine, wordBucket, type WordBucket } from '../lib/progress';
import { peekWord } from '../hooks/useWordPeek';
import { speakText } from '../lib/tts';
import type { WordProgress } from '../types';
import { MemberRing } from './MemberAvatars';
import { MindMapButton } from './MindMapButton';
import { WordMindMap } from './WordMindMap';
import { QuizSetup } from './QuizSetup';
import { LoadWordDetails } from './WordDetails';

/** Podium colours, matching the team leaderboard's medals. */
const PODIUM = ['text-accent-yellow', 'text-text-secondary', 'text-accent-orange'];

const pctOf = (m: MemberProgress) => (m.total > 0 ? Math.round((m.done / m.total) * 100) : 0);

/**
 * Everyone who joined, ranked by how many of the list's words they know. The
 * server returns them in this order (and caps it), so the top of a big list
 * is the real top rather than the earliest joiners.
 */
function CollectionLeaderboard({ members, meId, ownerId, loading }: {
  members: MemberProgress[];
  meId: string | undefined;
  ownerId: string;
  loading: boolean;
}) {
  const intl = useIntl();
  if (loading && members.length === 0) {
    return <p className="text-xs text-text-muted"><FormattedMessage id="collections.loadingBoard" /></p>;
  }
  if (members.length === 0) {
    return <p className="text-xs text-text-muted"><FormattedMessage id="collections.nobodyJoined" /></p>;
  }
  return (
    <ol className="flex flex-col gap-1 -mx-1">
      {members.map((m, i) => {
        const pct = pctOf(m);
        const isMe = m.userId === meId;
        return (
          <li
            key={m.userId}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
              isMe ? 'bg-accent-cyan/10 ring-1 ring-accent-cyan/40' : ''
            }`}
          >
            <span className={`w-6 text-center font-display font-extrabold tabular-nums shrink-0 ${PODIUM[i] ?? 'text-text-muted'}`}>
              {i < 3 ? <Icon icon="lucide:medal" className="inline text-base" /> : i + 1}
            </span>
            <MemberRing m={m} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-text-primary truncate">{m.displayName || intl.formatMessage({ id: 'collections.learner' })}</span>
                {isMe && (
                  <span className="text-[9px] px-1 py-px rounded bg-accent-cyan/20 text-accent-cyan font-extrabold uppercase tracking-wider shrink-0">
                    <FormattedMessage id="collections.you" />
                  </span>
                )}
                {m.userId === ownerId && (
                  <span className="text-[9px] px-1 py-px rounded bg-accent-purple/20 text-accent-purple font-extrabold uppercase tracking-wider shrink-0">
                    <FormattedMessage id="collections.owner" />
                  </span>
                )}
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct >= 100 ? 'bg-accent-green' : 'bg-accent-cyan'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="text-right shrink-0">
              <span className={`block text-sm font-display font-extrabold tabular-nums ${pct >= 100 ? 'text-accent-green' : 'text-text-primary'}`}>
                {pct}%
              </span>
              <span className="block text-[10px] text-text-muted tabular-nums">{m.done}/{m.total}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Rows rendered at a time — a 2,000-word list shouldn't mount 2,000 rows up front. */
const ROWS_PAGE = 50;

/**
 * One word of the list. Tapping the word opens the app-wide peek popup (a
 * quick meaning without leaving the page); "More" unfolds the full entry under
 * the row, like History.
 */
function WordRow({ word, bucket, p, open, onToggle, onTriage }: {
  word: string;
  bucket: WordBucket;
  p: WordProgress | undefined;
  open: boolean;
  onToggle: () => void;
  /** Mark as known (graduate it out of rotation) or bring it back. */
  onTriage: (known: boolean) => void;
}) {
  const intl = useIntl();
  const meta = BUCKET_META[bucket];
  return (
    <li className={`rounded-xl border transition-colors ${open ? 'border-accent-cyan/30' : 'border-border hover:border-border-light'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <button
            onClick={(e) => peekWord(word, e.currentTarget)}
            className="font-display font-bold text-text-primary hover:text-accent-cyan hover:underline text-left break-words"
            title={intl.formatMessage({ id: 'collections.whatDoesMean' }, { word })}
          >
            {word}
          </button>
          <div className="text-[10px] text-text-muted mt-0.5">{p ? whyLine(p) : intl.formatMessage({ id: 'collections.notStudiedYet' })}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${meta.chip}`}
          title={intl.formatMessage({ id: meta.hintId })}
        >
          <Icon icon={meta.icon} className="text-xs" />
          <span className="hidden sm:inline"><FormattedMessage id={meta.labelId} /></span>
        </span>
        {/* Same one-button triage as the stats popup: a mastered word offers
            to come back, anything else offers to graduate. */}
        {bucket === 'mastered' ? (
          <button
            onClick={() => onTriage(false)}
            title={intl.formatMessage({ id: 'collections.bringBackTitle' })}
            className="shrink-0 text-[11px] font-bold px-2 h-8 rounded-lg border border-border bg-bg-tertiary text-text-muted hover:text-accent-red hover:border-accent-red/40 transition-all"
          >
            <FormattedMessage id="collections.dontKnow" />
          </button>
        ) : (
          <button
            onClick={() => onTriage(true)}
            title={intl.formatMessage({ id: 'collections.knowItTitle' })}
            className="shrink-0 text-[11px] font-bold px-2 h-8 rounded-lg border border-border bg-bg-tertiary text-text-muted hover:text-accent-green hover:border-accent-green/40 transition-all"
          >
            <FormattedMessage id="collections.knowIt" />
          </button>
        )}
        <button
          onClick={() => void speakText(word)}
          title={intl.formatMessage({ id: 'collections.listen' })}
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
        >
          <Icon icon="lucide:volume-2" className="text-sm" />
        </button>
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-1 shrink-0 px-2 h-8 rounded-lg text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
        >
          <span className="hidden sm:inline"><FormattedMessage id={open ? 'collections.less' : 'collections.more'} /></span>
          <Icon icon="lucide:chevron-down" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-4 border-t border-border animate-fade-in">
          <LoadWordDetails word={word} />
        </div>
      )}
    </li>
  );
}

/**
 * Pick which learning groups to quiz on — "just my struggling words" is a
 * different quiz from "everything I haven't started". QuizSetup still lets the
 * learner trim the words after this.
 */
function QuizGroupPicker({ counts, initial, onStart, onClose }: {
  counts: Record<WordBucket, number>;
  initial: Set<WordBucket>;
  onStart: (groups: Set<WordBucket>) => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const [picked, setPicked] = useState(initial);
  const groups = BUCKET_ORDER.filter((b) => counts[b] > 0);
  const total = groups.filter((b) => picked.has(b)).reduce((n, b) => n + counts[b], 0);
  const toggle = (b: WordBucket) => setPicked((s) => {
    const next = new Set(s);
    if (next.has(b)) next.delete(b); else next.add(b);
    return next;
  });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="flex items-center gap-2 font-display font-bold text-text-primary">
            <Icon icon="lucide:play" className="text-accent-green" />
            <FormattedMessage id="collections.quizTheseWords" />
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
            title={intl.formatMessage({ id: 'collections.close' })}
          >
            <Icon icon="lucide:x" />
          </button>
        </div>
        <p className="text-xs text-text-muted mb-4"><FormattedMessage id="collections.pickGroups" /></p>

        <div className="flex flex-col gap-2 mb-5">
          {groups.map((b) => {
            const on = picked.has(b);
            const meta = BUCKET_META[b];
            return (
              <button
                key={b}
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(b)}
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                  on ? 'border-accent-cyan bg-accent-cyan/5' : 'border-border hover:border-border-light'
                }`}
              >
                <Icon
                  icon={on ? 'lucide:square-check' : 'lucide:square'}
                  className={`text-lg shrink-0 ${on ? 'text-accent-cyan' : 'text-text-muted'}`}
                />
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.chip}`}>
                  <Icon icon={meta.icon} className="text-sm" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-text-primary"><FormattedMessage id={meta.labelId} /></span>
                  <span className="block text-[11px] text-text-muted leading-snug"><FormattedMessage id={meta.hintId} /></span>
                </span>
                <span className="text-sm font-display font-extrabold tabular-nums text-text-secondary shrink-0">
                  {counts[b]}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onStart(picked)}
          disabled={total === 0}
          className="btn-3d w-full px-4 py-3 text-sm font-bold bg-accent-green text-bg-primary disabled:opacity-50"
        >
          {total === 0
            ? <FormattedMessage id="collections.pickAGroup" />
            : <FormattedMessage id="collections.quizCount" values={{ count: total }} />}
        </button>
      </div>
    </div>
  );
}

/**
 * One collection on its own page: every word in it (tinted by where *you*
 * stand on each), the ways to study it — quiz, stats, mind map — and, for a
 * shared list, everyone who joined it ranked on a leaderboard. Works for the
 * bundled Levels too, minus the parts that need a server row.
 *
 * It's also where a share link lands, so a stranger's list has to read well
 * before they've joined: joining is one button, and the board is visible
 * either way.
 */
export function CollectionDetailPage() {
  const { id = '' } = useParams();
  return <CollectionDetail id={id} />;
}

/**
 * The detail view itself. On its own route it's a full page; given `onClose`
 * it's the body of the desktop popup on /collections (CollectionDetailModal),
 * so it drops the back link and page chrome, and opens quiz / mind map as a
 * full-screen layer over the popup instead of replacing it.
 */
export function CollectionDetail({ id, onClose }: { id: string; onClose?: () => void }) {
  const intl = useIntl();
  const inModal = !!onClose;
  const { user } = useAuth();
  const { isPro } = useIsPro();
  const navigate = useNavigate();
  const activeId = useCollections((s) => s.activeId);
  const setActive = useCollections((s) => s.setActive);
  const joinedIds = useCollections((s) => s.joinedIds);
  const cached = useCollections((s) => s.getUserCollection(id));
  const localProgress = useVocabularyStore((s) => s.progress);
  const triageWord = useVocabularyStore((s) => s.triageWord);

  const system = isCollectionId(id) ? getCollection(id) : null;
  const topic = system?.kind === 'topic' ? { icon: system.icon ?? 'lucide:book-open' } : null;

  // The store's copy answers first (and offline); the server's replaces it.
  const [fetched, setFetched] = useState<{ collection: Collection; owner: CollectionOwner } | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (system) return;
    let cancelled = false;
    fetchCollectionDetail(id).then((res) => {
      if (cancelled) return;
      if (res) setFetched(res);
      else if (!useCollections.getState().getUserCollection(id)) setMissing(true);
    });
    return () => { cancelled = true; };
  }, [id, system]);
  const col = fetched?.collection ?? cached ?? null;

  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [membersLoading, setMembersLoading] = useState(!system);
  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembers(await fetchMembers(id));
    setMembersLoading(false);
  }, [id]);
  useEffect(() => {
    if (!system) void loadMembers();
  }, [system, loadMembers]);

  const name = system?.name ?? col?.name ?? '';
  const description = system?.description ?? col?.description ?? null;
  const words = useMemo(
    () => (system ? system.words.map((w) => w.word) : col?.words ?? []),
    [system, col],
  );

  // ── Your standing on each word ──
  const progress = useProgressForWords(words, localProgress);
  const prog = useMemo(() => progressLookup(progress), [progress]);
  const { bucketOf, counts, known } = useMemo(() => {
    const bucketOf = new Map<string, WordBucket>();
    const counts: Record<WordBucket, number> = { pending: 0, difficult: 0, learning: 0, mastered: 0, dismissed: 0 };
    // "Known" is the leaderboard's own test (collection_members_progress), so
    // this number and your row on the board agree.
    let known = 0;
    for (const w of words) {
      const p = prog(w);
      const b = wordBucket(p);
      bucketOf.set(w, b);
      counts[b]++;
      if (p?.status === 'known' || p?.mastered) known++;
    }
    return { bucketOf, counts, known };
  }, [prog, words]);

  const [filter, setFilter] = useState<WordBucket | 'all'>('all');
  const [query, setQuery] = useState('');
  const shownWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) =>
      (filter === 'all' || bucketOf.get(w) === filter) && (!q || w.toLowerCase().includes(q)));
  }, [words, bucketOf, filter, query]);

  // Paging and open rows start over whenever the list being looked at changes.
  const [limit, setLimit] = useState(ROWS_PAGE);
  const [openWords, setOpenWords] = useState<Set<string>>(() => new Set());
  useEffect(() => { setLimit(ROWS_PAGE); }, [filter, query]);
  const toggleWord = (w: string) => setOpenWords((s) => {
    const next = new Set(s);
    if (next.has(w)) next.delete(w); else next.add(w);
    return next;
  });

  const [mode, setMode] = useState<'detail' | 'quiz' | 'mindmap'>('detail');
  const [quizWords, setQuizWords] = useState<string[]>([]);
  const [pickingQuiz, setPickingQuiz] = useState(false);
  // The picker opens on the filter already chosen; otherwise on what still
  // needs work, leaving out what's mastered or skipped.
  const quizDefault = (): Set<WordBucket> => {
    if (filter !== 'all') return new Set([filter]);
    const open = BUCKET_ORDER.filter((b) => counts[b] > 0 && b !== 'mastered' && b !== 'dismissed');
    return new Set(open.length > 0 ? open : BUCKET_ORDER.filter((b) => counts[b] > 0));
  };
  const startQuiz = (groups: Set<WordBucket>) => {
    setQuizWords(words.filter((w) => groups.has(bucketOf.get(w) ?? 'pending')));
    setPickingQuiz(false);
    setMode('quiz');
  };
  const [joining, setJoining] = useState(false);

  const isOwner = !!col && col.ownerId === user?.id;
  const joined = joinedIds.includes(id) || members.some((m) => m.userId === user?.id);
  const active = activeId === id;

  /**
   * Studying a server list is what joins it (see useCollections.setActive).
   * The join is awaited here, not left to the store's fire-and-forget, so the
   * board can be reloaded with this learner on it.
   */
  const study = async () => {
    if (system) {
      setActive(id);
      toast.success(intl.formatMessage({ id: 'collections.toastStudying' }, { name }));
      return;
    }
    setJoining(true);
    try {
      // setActive only accepts a list the store already holds.
      if (!(await useCollections.getState().fetchById(id))) return;
      setActive(id);
      await joinCollection(id);
      toast.success(intl.formatMessage({ id: joined ? 'collections.toastStudying' : 'collections.toastJoined' }, { name }));
      await loadMembers();
    } finally {
      setJoining(false);
    }
  };

  const share = async () => {
    try {
      const url = isOwner
        ? await useCollections.getState().shareCollection(id)
        : collectionShareUrl(id);
      await navigator.clipboard.writeText(url);
      toast.success(intl.formatMessage({ id: 'collections.shareLinkCopied' }));
      if (isOwner && fetched && !fetched.collection.isPublic) {
        setFetched({ ...fetched, collection: { ...fetched.collection, isPublic: true } });
      }
    } catch (err) {
      toast.error((err as Error).message || intl.formatMessage({ id: 'collections.couldNotShare' }));
    }
  };

  if (mode === 'quiz' || mode === 'mindmap') {
    const view = mode === 'quiz'
      ? <QuizSetup words={quizWords} recordProgress onBack={() => setMode('detail')} />
      : <WordMindMap words={words} onBack={() => setMode('detail')} />;
    // In the popup there's no page to take over, so cover the screen instead.
    return inModal ? <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg-primary">{view}</div> : view;
  }

  // Page chrome — the popup supplies its own frame and close button. A plain
  // function, not a component: a component defined in render would remount
  // the whole view (and drop input focus) on every keystroke.
  const shell = (children: React.ReactNode) => inModal ? children : (
    <div className="mx-auto max-w-page px-4 py-8">
      <Link to="/collections" className="inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary mb-4">
        <Icon icon="lucide:arrow-left" /> <FormattedMessage id="collections.backToCollections" />
      </Link>
      {children}
    </div>
  );

  if (!system && !col) {
    return shell(
      <div className="p-4 rounded-2xl border-2 border-border bg-bg-card text-sm text-text-muted">
        <FormattedMessage id={missing ? 'collections.missing' : 'collections.loadingCollection'} />
      </div>,
    );
  }

  const owner = fetched?.owner;
  const shownBuckets = BUCKET_ORDER.filter((b) => counts[b] > 0);

  return shell(
    <>
      {/* ── Header ── (topic collections open on their gradient cover) */}
      <header className="mb-6">
        {topic ? (
          <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 pt-20 sm:pt-28 text-white" style={topicCover(id)}>
            <img src={topicPhoto(id)} alt="" decoding="async" className="pointer-events-none absolute inset-0 w-full h-full object-cover" />
            <div aria-hidden className="pointer-events-none absolute inset-0" style={PHOTO_SCRIM} />
            <div className="relative flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
                <Icon icon={topic.icon} className="text-3xl" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold break-words [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">{name}</h1>
                {description && <p className="text-sm text-white/90 mt-0.5">{description}</p>}
              </div>
            </div>
            <div className="relative flex flex-wrap items-center gap-2 mt-4 text-xs font-bold">
              <span className="px-2 py-1 rounded-full bg-white/20 ring-1 ring-white/25"><FormattedMessage id="collections.wordCount" values={{ count: words.length }} /></span>
              <span className="px-2 py-1 rounded-full bg-white/20 ring-1 ring-white/25"><FormattedMessage id="collections.builtInTopic" /></span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-display font-bold text-text-primary break-words">{name}</h1>
              <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs text-text-muted">
                <span className="px-1.5 py-0.5 rounded-full bg-bg-tertiary font-bold"><FormattedMessage id="collections.wordCount" values={{ count: words.length }} /></span>
                {col && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple font-bold">
                    <Icon icon="lucide:users" className="text-[11px]" />
                    <FormattedMessage id="collections.learnerCount" values={{ count: col.memberCount }} />
                  </span>
                )}
                {col && !col.isPublic && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-bg-tertiary font-bold">
                    <Icon icon="lucide:lock" className="text-[11px]" /> <FormattedMessage id="collections.private" />
                  </span>
                )}
                {system && <span className="px-1.5 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan font-bold"><FormattedMessage id="collections.builtIn" /></span>}
                {owner?.name && (
                  <span className="flex items-center gap-1.5">
                    {owner.avatarUrl ? (
                      <img src={owner.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full" />
                    ) : (
                      <Icon icon="lucide:user" />
                    )}
                    <FormattedMessage
                      id={isOwner ? 'collections.byYou' : 'collections.byOwner'}
                      values={{ name: owner.name, b: (c) => <span className="font-bold text-text-secondary">{c}</span> }}
                    />
                  </span>
                )}
              </div>
              {description && <p className="text-sm text-text-muted mt-2">{description}</p>}
            </div>
          </div>
        )}

        <div className="relative flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={study}
            disabled={active || joining}
            className={`btn-3d px-4 py-2 text-sm font-bold disabled:opacity-80 ${
              joined || system || isOwner ? 'bg-accent-cyan text-bg-primary' : 'bg-accent-purple text-bg-primary'
            }`}
          >
            <FormattedMessage
              id={active ? 'collections.studyingCheck' : joining ? 'collections.joining' : joined || system || isOwner ? 'collections.studyThis' : 'collections.joinAndStudy'}
            />
          </button>
          <button
            onClick={() => setPickingQuiz(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-tertiary text-text-secondary text-xs font-medium hover:text-accent-green hover:border-accent-green/30 transition-all"
          >
            <Icon icon="lucide:play" className="text-sm" /> <FormattedMessage id="collections.quiz" />
          </button>
          <MindMapButton words={words} isPro={isPro} onOpenInteractive={() => setMode('mindmap')} />
          {col && (isOwner || col.isPublic) && (
            <button
              onClick={share}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-tertiary text-text-secondary text-xs font-medium hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
            >
              <Icon icon="lucide:share-2" className="text-sm" /> <FormattedMessage id="collections.share" />
            </button>
          )}
        </div>
      </header>

      <div className={`grid gap-6 ${system ? '' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]'}`}>
        {/* ── Words ── */}
        <section className="rounded-2xl border-[3px] border-border bg-bg-card p-5 sm:p-6 flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
              <Icon icon="lucide:book-open" className="text-accent-cyan" />
              <FormattedMessage id="collections.words" />
            </h2>
            <span className="text-[11px] text-text-muted">
              <FormattedMessage id="collections.youKnowOf" values={{ known, total: words.length }} />
            </span>
          </div>

          <div className="relative">
            <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={intl.formatMessage({ id: 'collections.findAWord' })}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-bg-tertiary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50"
            />
          </div>

          {/* Each filter carries an icon and a label, so state never rests on colour alone. */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                filter === 'all' ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan' : 'border-border text-text-muted hover:text-text-primary'
              }`}
            >
              <FormattedMessage id="collections.all" /> <span className="tabular-nums opacity-70">{words.length}</span>
            </button>
            {shownBuckets.map((b) => (
              <button
                key={b}
                onClick={() => setFilter(filter === b ? 'all' : b)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  filter === b ? `${BUCKET_META[b].chip} border-current` : 'border-border text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon icon={BUCKET_META[b].icon} className="text-[11px]" />
                <FormattedMessage id={BUCKET_META[b].labelId} /> <span className="tabular-nums opacity-70">{counts[b]}</span>
              </button>
            ))}
          </div>

          {shownWords.length === 0 ? (
            <p className="text-xs text-text-muted"><FormattedMessage id="collections.noWordsMatch" /></p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {shownWords.slice(0, limit).map((w) => (
                  <WordRow
                    key={w}
                    word={w}
                    bucket={bucketOf.get(w) ?? 'pending'}
                    p={prog(w)}
                    open={openWords.has(w)}
                    onToggle={() => toggleWord(w)}
                    onTriage={(known) => triageWord(w, known, user?.id)}
                  />
                ))}
              </ul>
              {shownWords.length > limit && (
                <button
                  onClick={() => setLimit((n) => n + ROWS_PAGE)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-border text-sm font-extrabold text-text-secondary hover:border-border-light hover:text-text-primary transition-all"
                >
                  <Icon icon="lucide:chevron-down" />
                  <FormattedMessage id="collections.showMoreWords" values={{ count: shownWords.length - limit }} />
                </button>
              )}
            </>
          )}
        </section>

        {/* ── Leaderboard ── (server lists only — the Levels have no members) */}
        {col && (
          <section className="rounded-2xl border-[3px] border-border bg-bg-card p-5 sm:p-6 flex flex-col gap-4 self-start w-full">
            <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
              <Icon icon="lucide:trophy" className="text-accent-yellow" />
              <FormattedMessage id="collections.leaderboard" />
            </h2>

            {!col.isPublic && isOwner && (
              <p className="text-xs text-text-muted leading-relaxed">
                <FormattedMessage id="collections.privateBoardHint" />
              </p>
            )}

            {!joined && !isOwner && user && (
              <div className="flex flex-col gap-3 rounded-xl bg-bg-tertiary/50 p-4">
                <p className="text-xs text-text-secondary leading-relaxed">
                  <FormattedMessage id="collections.joinToAppear" />
                </p>
                <button
                  onClick={study}
                  disabled={joining}
                  className="btn-3d self-start px-4 py-2 text-xs font-bold bg-accent-purple text-bg-primary disabled:opacity-50"
                >
                  <FormattedMessage id={joining ? 'collections.joining' : 'collections.joinThisCollection'} />
                </button>
              </div>
            )}

            <CollectionLeaderboard members={members} meId={user?.id} ownerId={col.ownerId} loading={membersLoading} />

            <p className="text-[11px] text-text-muted/70">
              <FormattedMessage id="collections.rankedBy" />
            </p>
          </section>
        )}
      </div>

      {!inModal && (
        <button
          onClick={() => navigate('/')}
          className="btn-3d block w-full sm:w-auto sm:min-w-72 mx-auto mt-8 px-10 py-3 bg-accent-cyan text-bg-primary font-bold"
        >
          <FormattedMessage id="collections.startLearning" />
        </button>
      )}

      {pickingQuiz && (
        <QuizGroupPicker
          counts={counts}
          initial={quizDefault()}
          onStart={startQuiz}
          onClose={() => setPickingQuiz(false)}
        />
      )}
    </>,
  );
}
