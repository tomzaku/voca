import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { collectionShareUrl, presentPath, useCollections } from '../hooks/useCollections';
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
import { CollectionTests } from './tests/CollectionTests';
import { AddFriendButton } from './AddFriendButton';
import { useFriendStatuses } from '../hooks/useFriendStatuses';
import { LoadWordDetails } from './WordDetails';
import { CollectionSlides } from './CollectionSlides';
import { asSlideThemeId, suggestedSlideTheme } from '../lib/slideThemes';

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
  const [statuses, setStatus] = useFriendStatuses(members.map((m) => m.userId), !!meId);
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
            <AddFriendButton
              userId={m.userId}
              name={m.displayName || intl.formatMessage({ id: 'collections.learner' })}
              status={statuses[m.userId]}
              onChange={(s) => setStatus(m.userId, s)}
            />
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
    <li className={`transition-colors ${open ? 'bg-accent-cyan/5' : 'hover:bg-bg-tertiary/40'}`}>
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
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
        <div className="px-4 sm:px-5 pb-5 pt-1 animate-fade-in">
          <LoadWordDetails word={word} />
        </div>
      )}
    </li>
  );
}

/**
 * Where you stand on the list, group by group — the same groups as the
 * filter chips, and each row is one: tapping "Struggling" shows those words.
 */
function ProgressCard({ counts, total, known, filter, onFilter }: {
  counts: Record<WordBucket, number>;
  total: number;
  known: number;
  filter: WordBucket | 'all';
  onFilter: (f: WordBucket | 'all') => void;
}) {
  const pct = total ? Math.round((known / total) * 100) : 0;
  const groups = BUCKET_ORDER.filter((b) => counts[b] > 0);
  return (
    <section className="rounded-2xl border border-border bg-bg-card p-5 flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
          <Icon icon="lucide:chart-pie" className="text-accent-cyan" />
          <FormattedMessage id="collections.yourProgress" />
        </h2>
        <span className="text-2xl font-display font-extrabold tabular-nums text-text-primary leading-none">{pct}%</span>
      </div>
      {/* One bar, a segment per group, in the groups' own order. */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-bg-tertiary">
        {groups.map((b) => (
          <div key={b} className={BUCKET_META[b].bar} style={{ width: `${(counts[b] / Math.max(total, 1)) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-col gap-0.5 -mx-2">
        {groups.map((b) => {
          const meta = BUCKET_META[b];
          const on = filter === b;
          return (
            <li key={b}>
              <button
                onClick={() => onFilter(on ? 'all' : b)}
                aria-pressed={on}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${on ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary/60'}`}
              >
                <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${meta.chip}`}>
                  <Icon icon={meta.icon} className="text-xs" />
                </span>
                <span className="flex-1 min-w-0 text-sm font-bold text-text-secondary"><FormattedMessage id={meta.labelId} /></span>
                <span className="text-sm font-display font-extrabold tabular-nums text-text-primary">{counts[b]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
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
 * /collections/:id/present — the collection as slides, at a link of its own,
 * so a teacher can bookmark it, open it on the classroom computer, or reload
 * mid-lesson. `?filter=` and `?q=` narrow the words the way the list's chips
 * and search do; `?slide=` is where the deck is.
 */
export function CollectionPresentPage() {
  const { id = '' } = useParams();
  return <CollectionDetail id={id} present />;
}

/**
 * The detail view itself. On its own route it's a full page; given `onClose`
 * it's the body of the desktop popup on /collections (CollectionDetailModal),
 * so it drops the back link and page chrome, and opens quiz / mind map as a
 * full-screen layer over the popup instead of replacing it.
 */
export function CollectionDetail({ id, onClose, present = false }: { id: string; onClose?: () => void; present?: boolean }) {
  const intl = useIntl();
  const inModal = !!onClose;
  const { user, signInWithGoogle } = useAuth();
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
  const [membersLoading, setMembersLoading] = useState(!system && !!user);
  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembers(await fetchMembers(id));
    setMembersLoading(false);
  }, [id]);
  // The board needs an account to read; a visitor gets a sign-in prompt there.
  useEffect(() => {
    if (!system && user) void loadMembers();
  }, [system, user, loadMembers]);

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

  // The slides' link carries the list's filter and search, so it opens on the
  // same words the presenter picked.
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<WordBucket | 'all'>(() => {
    const f = present ? searchParams.get('filter') : null;
    return f && (BUCKET_ORDER as string[]).includes(f) ? (f as WordBucket) : 'all';
  });
  const [query, setQuery] = useState(() => (present ? searchParams.get('q') ?? '' : ''));
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
  // Studying a list means flash cards from it — so the button takes you
  // there, rather than ticking itself and leaving you to work out where to go.
  const study = async () => {
    if (active) {
      goStudy();
      return;
    }
    if (system) {
      setActive(id);
      toast.success(intl.formatMessage({ id: 'collections.toastStudying' }, { name }));
      goStudy();
      return;
    }
    setJoining(true);
    try {
      // setActive only accepts a list the store already holds.
      if (!(await useCollections.getState().fetchById(id))) {
        toast.error(intl.formatMessage({ id: 'collections.couldNotStudy' }));
        return;
      }
      setActive(id);
      await joinCollection(id);
      toast.success(intl.formatMessage({ id: joined ? 'collections.toastStudying' : 'collections.toastJoined' }, { name }));
      goStudy();
    } catch (err) {
      toast.error((err as Error).message || intl.formatMessage({ id: 'collections.couldNotStudy' }));
    } finally {
      setJoining(false);
    }
  };

  // Going to the flash card also closes the popup this may be in — over the
  // flash card itself, navigating to "/" alone would leave it open.
  function goStudy() {
    navigate('/');
    onClose?.();
  }

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

  // The deck covers the screen on its own. It shows the words as filtered, so
  // a teacher can present just part of a long list.
  if (present) {
    const slideParam = Number(searchParams.get('slide'));
    const themeParam = asSlideThemeId(searchParams.get('theme'));
    // One writer for the deck's params, so a slide change and a theme pick
    // landing together don't overwrite each other.
    const setParam = (key: string, value: string | null) => setSearchParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
    return (
      <CollectionSlides
        name={name}
        description={description}
        words={shownWords}
        photo={topic ? topicPhoto(id) : undefined}
        suggestedTheme={suggestedSlideTheme(id)}
        linkTheme={themeParam}
        onThemeChange={(t) => setParam('theme', t)}
        initialSlide={Number.isInteger(slideParam) ? slideParam : 0}
        onSlideChange={(n) => setParam('slide', n > 0 ? String(n) : null)}
        shareUrl={collectionShareUrl(id, presentPath(id, { filter, q: query }))}
        onClose={() => navigate(`/collections/${encodeURIComponent(id)}`)}
      />
    );
  }

  const owner = fetched?.owner;
  const shownBuckets = BUCKET_ORDER.filter((b) => counts[b] > 0);
  const knownPct = words.length ? Math.round((known / words.length) * 100) : 0;
  // On the cover: translucent, so the photo or gradient stays the backdrop.
  const glass = 'flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm text-white text-xs font-bold hover:bg-white/25 transition-colors disabled:opacity-50';
  const chipOnCover = 'flex items-center gap-1 px-2 py-1 rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm';

  return shell(
    <>
      {/* ── Cover ── the same art as the collection's banner and card, so the
          popup reads as that card opened up. Edge to edge in the popup (which
          floats its close buttons over the top-right), rounded on the page. */}
      <header
        className={`relative overflow-hidden text-white ${inModal ? 'px-6 pb-6 pt-16' : 'rounded-3xl px-5 sm:px-7 pb-6 pt-14 sm:pt-20 mb-6'}`}
        // The card's drop shadow reads as a stray glow line inside the popup.
        style={inModal ? { ...topicCover(id), boxShadow: 'none' } : topicCover(id)}
      >
        {topic && <img src={topicPhoto(id)} alt="" decoding="async" className="pointer-events-none absolute inset-0 w-full h-full object-cover" />}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={PHOTO_SCRIM} />

        <div className="relative flex flex-col lg:flex-row lg:items-end gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {topic && (
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
                  <Icon icon={topic.icon} className="text-2xl" />
                </span>
              )}
              <h1 className="min-w-0 text-3xl sm:text-4xl font-display font-extrabold leading-tight break-words [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">
                {name}
              </h1>
            </div>
            {description && <p className="mt-2 max-w-2xl text-sm text-white/90">{description}</p>}

            <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px] font-bold">
              <span className={chipOnCover}>
                <Icon icon="lucide:book-open" /> <FormattedMessage id="collections.wordCount" values={{ count: words.length }} />
              </span>
              {col && (
                <span className={chipOnCover}>
                  <Icon icon="lucide:users" /> <FormattedMessage id="collections.learnerCount" values={{ count: col.memberCount }} />
                </span>
              )}
              {col && !col.isPublic && (
                <span className={chipOnCover}><Icon icon="lucide:lock" /> <FormattedMessage id="collections.private" /></span>
              )}
              {system && (
                <span className={chipOnCover}>
                  <Icon icon="lucide:sparkles" /> <FormattedMessage id={topic ? 'collections.builtInTopic' : 'collections.builtIn'} />
                </span>
              )}
              {owner?.name && (
                <span className={chipOnCover}>
                  {owner.avatarUrl
                    ? <img src={owner.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-4 h-4 rounded-full" />
                    : <Icon icon="lucide:user" />}
                  <FormattedMessage
                    id={isOwner ? 'collections.byYou' : 'collections.byOwner'}
                    values={{ name: owner.name, b: (c) => <span>{c}</span> }}
                  />
                </span>
              )}
            </div>

            <div className="mt-4 max-w-md">
              <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${knownPct}%` }} />
              </div>
              <p className="text-xs font-bold text-white/90 mt-1.5">
                <FormattedMessage id="collections.youKnowOf" values={{ known, total: words.length }} />
              </p>
            </div>
          </div>

          {/* One clear next step, and the other ways in beside it, quieter. */}
          <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:max-w-[22rem]">
            {/* A visitor can read and present someone's list, but studying it
                means joining, and joining needs an account. Built-in lists
                study on this device alone, so they need none. */}
            {!user && !system ? (
              <button
                onClick={() => void signInWithGoogle()}
                className="btn-3d px-5 py-2.5 bg-white text-gray-900 text-sm font-bold flex items-center gap-1.5"
              >
                <Icon icon="lucide:log-in" /> <FormattedMessage id="collections.signInToStudy" />
              </button>
            ) : (
              <button
                onClick={study}
                disabled={joining}
                className="btn-3d px-5 py-2.5 bg-white text-gray-900 text-sm font-bold flex items-center gap-1.5 disabled:opacity-80"
              >
                <Icon icon={joined || system || isOwner ? 'lucide:play' : 'lucide:user-plus'} />
                <FormattedMessage
                  id={active ? 'collections.continueStudying' : joining ? 'collections.joining' : joined || system || isOwner ? 'collections.studyThis' : 'collections.joinAndStudy'}
                />
              </button>
            )}
            <button onClick={() => setPickingQuiz(true)} className={glass}>
              <Icon icon="lucide:circle-check-big" className="text-sm" /> <FormattedMessage id="collections.quiz" />
            </button>
            <button
              onClick={() => navigate(presentPath(id, { filter, q: query }))}
              disabled={shownWords.length === 0}
              title={intl.formatMessage({ id: 'collections.presentTitle' })}
              className={glass}
            >
              <Icon icon="lucide:presentation" className="text-sm" /> <FormattedMessage id="collections.present" />
            </button>
            <MindMapButton words={words} isPro={isPro} onOpenInteractive={() => setMode('mindmap')} className={glass}>
              <Icon icon="lucide:git-fork" className="text-sm" />
              <FormattedMessage id="mindmap.button" />
              <Icon icon="lucide:chevron-down" className="text-[11px] opacity-70" />
            </MindMapButton>
            {col && (isOwner || col.isPublic) && (
              <button onClick={share} className={glass}>
                <Icon icon="lucide:share-2" className="text-sm" /> <FormattedMessage id="collections.share" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] ${inModal ? 'p-6' : ''}`}>
        {/* ── Words ── */}
        <section className="rounded-2xl border border-border bg-bg-card flex flex-col min-w-0">
          {/* Search and filters stay in reach while a long list scrolls under
              them — the popup scrolls itself, the page under the navbar. */}
          <div className={`sticky z-[5] flex flex-col gap-3 p-4 sm:p-5 pb-3 rounded-t-2xl bg-bg-card/95 backdrop-blur border-b border-border ${
            inModal ? 'top-0' : 'top-[calc(4.5rem+env(safe-area-inset-top))]'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
                <Icon icon="lucide:book-open" className="text-accent-cyan" />
                <FormattedMessage id="collections.words" />
              </h2>
              <span className="text-[11px] tabular-nums text-text-muted">
                {shownWords.length === words.length ? words.length : `${shownWords.length} / ${words.length}`}
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
          </div>

          {shownWords.length === 0 ? (
            <p className="p-5 text-xs text-text-muted"><FormattedMessage id="collections.noWordsMatch" /></p>
          ) : (
            <>
              <ul className="divide-y divide-border">
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
                  className="flex items-center justify-center gap-2 py-3 border-t border-border rounded-b-2xl text-sm font-extrabold text-text-secondary hover:bg-bg-tertiary/50 hover:text-text-primary transition-all"
                >
                  <Icon icon="lucide:chevron-down" />
                  <FormattedMessage id="collections.showMoreWords" values={{ count: shownWords.length - limit }} />
                </button>
              )}
            </>
          )}
        </section>

        {/* The side column — one grid cell, so nothing in it drops below the
            word list: where you stand, then tests, then everyone else. */}
        <div className="flex flex-col gap-6 self-start w-full min-w-0">
          <ProgressCard counts={counts} total={words.length} known={known} filter={filter} onFilter={setFilter} />

          {/* ── Tests ── the owner sends them; members take them. A built-in
              collection has practice tests, no deadline. */}
          {system && user && <CollectionTests collectionId={system.id} isOwner={false} />}
          {col && user && (isOwner || joined || col.isPublic) && (
            <CollectionTests collectionId={col.id} isOwner={isOwner} />
          )}

          {/* ── Leaderboard ── (server lists only — the Levels have no members) */}
          {col && (
            <section className="rounded-2xl border border-border bg-bg-card p-5 flex flex-col gap-4 w-full">
              <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
                <Icon icon="lucide:trending-up" className="text-accent-cyan" />
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

              {user ? (
                <CollectionLeaderboard members={members} meId={user.id} ownerId={col.ownerId} loading={membersLoading} />
              ) : (
                <div className="flex flex-col gap-3 rounded-xl bg-bg-tertiary/50 p-4">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    <FormattedMessage id="collections.signInForBoard" values={{ count: col.memberCount }} />
                  </p>
                  <button
                    onClick={() => void signInWithGoogle()}
                    className="btn-3d self-start px-4 py-2 text-xs font-bold bg-accent-purple text-bg-primary"
                  >
                    <FormattedMessage id="collections.signInToJoin" />
                  </button>
                </div>
              )}

              <p className="text-[11px] text-text-muted/70">
                <FormattedMessage id="collections.rankedBy" />
              </p>
            </section>
          )}
        </div>
      </div>

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
