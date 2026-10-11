import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { collectionShareUrl, useCollections } from '../hooks/useCollections';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useProgressForWords } from '../hooks/useProgressQuery';
import { getCollection, isCollectionId } from '../lib/collections';
import {
  fetchCollectionDetail,
  fetchMembers,
  joinCollection,
  type Collection,
  type CollectionOwner,
  type MemberProgress,
} from '../lib/collectionsApi';
import { BUCKET_META, BUCKET_ORDER, progressLookup, wordBucket, type WordBucket } from '../lib/progress';
import { MemberRing } from './MemberAvatars';
import { MindMapButton } from './MindMapButton';
import { WordMindMap } from './WordMindMap';
import { QuizSetup } from './QuizSetup';
import { CollectionStats } from './CollectionStats';

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
  if (loading && members.length === 0) {
    return <p className="text-xs text-text-muted">Loading the board…</p>;
  }
  if (members.length === 0) {
    return <p className="text-xs text-text-muted">Nobody has joined yet — be the first name up there.</p>;
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
                <span className="text-sm font-bold text-text-primary truncate">{m.displayName || 'Learner'}</span>
                {isMe && (
                  <span className="text-[9px] px-1 py-px rounded bg-accent-cyan/20 text-accent-cyan font-extrabold uppercase tracking-wider shrink-0">
                    You
                  </span>
                )}
                {m.userId === ownerId && (
                  <span className="text-[9px] px-1 py-px rounded bg-accent-purple/20 text-accent-purple font-extrabold uppercase tracking-wider shrink-0">
                    Owner
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
  const { user } = useAuth();
  const { isPro } = useIsPro();
  const navigate = useNavigate();
  const activeId = useCollections((s) => s.activeId);
  const setActive = useCollections((s) => s.setActive);
  const joinedIds = useCollections((s) => s.joinedIds);
  const cached = useCollections((s) => s.getUserCollection(id));
  const localProgress = useVocabularyStore((s) => s.progress);

  const system = isCollectionId(id) ? getCollection(id) : null;

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
  const { bucketOf, counts, known } = useMemo(() => {
    const prog = progressLookup(progress);
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
  }, [progress, words]);

  const [filter, setFilter] = useState<WordBucket | 'all'>('all');
  const [query, setQuery] = useState('');
  const shownWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) =>
      (filter === 'all' || bucketOf.get(w) === filter) && (!q || w.toLowerCase().includes(q)));
  }, [words, bucketOf, filter, query]);

  const [mode, setMode] = useState<'detail' | 'quiz' | 'mindmap'>('detail');
  const [showStats, setShowStats] = useState(false);
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
      toast.success(`Studying “${name}”`);
      return;
    }
    setJoining(true);
    try {
      // setActive only accepts a list the store already holds.
      if (!(await useCollections.getState().fetchById(id))) return;
      setActive(id);
      await joinCollection(id);
      toast.success(joined ? `Studying “${name}”` : `Joined “${name}”`);
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
      toast.success('Share link copied!');
      if (isOwner && fetched && !fetched.collection.isPublic) {
        setFetched({ ...fetched, collection: { ...fetched.collection, isPublic: true } });
      }
    } catch (err) {
      toast.error((err as Error).message || 'Could not share.');
    }
  };

  if (mode === 'quiz') {
    return <QuizSetup words={words} recordProgress onBack={() => setMode('detail')} />;
  }
  if (mode === 'mindmap') {
    return <WordMindMap words={words} onBack={() => setMode('detail')} />;
  }

  if (!system && !col) {
    return (
      <div className="mx-auto max-w-page px-4 py-8">
        <Link to="/collections" className="inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary mb-4">
          <Icon icon="lucide:arrow-left" /> Collections
        </Link>
        <div className="p-4 rounded-2xl border-2 border-border bg-bg-card text-sm text-text-muted">
          {missing ? "This collection doesn't exist or isn't public anymore." : 'Loading collection…'}
        </div>
      </div>
    );
  }

  const owner = fetched?.owner;
  const shownBuckets = BUCKET_ORDER.filter((b) => counts[b] > 0);

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <Link to="/collections" className="inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary mb-4">
        <Icon icon="lucide:arrow-left" /> Collections
      </Link>

      {/* ── Header ── */}
      <header className="mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-text-primary break-words">{name}</h1>
            <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs text-text-muted">
              <span className="px-1.5 py-0.5 rounded-full bg-bg-tertiary font-bold">{words.length} words</span>
              {col && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple font-bold">
                  <Icon icon="lucide:users" className="text-[11px]" />
                  {col.memberCount} {col.memberCount === 1 ? 'learner' : 'learners'}
                </span>
              )}
              {col && !col.isPublic && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-bg-tertiary font-bold">
                  <Icon icon="lucide:lock" className="text-[11px]" /> Private
                </span>
              )}
              {system && <span className="px-1.5 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan font-bold">Built-in</span>}
              {owner?.name && (
                <span className="flex items-center gap-1.5">
                  {owner.avatarUrl ? (
                    <img src={owner.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full" />
                  ) : (
                    <Icon icon="lucide:user" />
                  )}
                  by <span className="font-bold text-text-secondary">{isOwner ? 'you' : owner.name}</span>
                </span>
              )}
            </div>
            {description && <p className="text-sm text-text-muted mt-2">{description}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={study}
            disabled={active || joining}
            className={`btn-3d px-4 py-2 text-sm font-bold disabled:opacity-80 ${
              joined || system || isOwner ? 'bg-accent-cyan text-bg-primary' : 'bg-accent-purple text-bg-primary'
            }`}
          >
            {active ? 'Studying ✓' : joining ? 'Joining…' : joined || system || isOwner ? 'Study this' : 'Join & study'}
          </button>
          <button
            onClick={() => setMode('quiz')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-tertiary text-text-secondary text-xs font-medium hover:text-accent-green hover:border-accent-green/30 transition-all"
          >
            <Icon icon="lucide:play" className="text-sm" /> Quiz
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-tertiary text-text-secondary text-xs font-medium hover:text-accent-purple hover:border-accent-purple/30 transition-all"
          >
            <Icon icon="lucide:chart-pie" className="text-sm" /> Stats
          </button>
          <MindMapButton words={words} isPro={isPro} onOpenInteractive={() => setMode('mindmap')} />
          {col && (isOwner || col.isPublic) && (
            <button
              onClick={share}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-tertiary text-text-secondary text-xs font-medium hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
            >
              <Icon icon="lucide:share-2" className="text-sm" /> Share
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
              Words
            </h2>
            <span className="text-[11px] text-text-muted">
              You know {known} of {words.length}
            </span>
          </div>

          <div className="relative">
            <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a word"
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
              All <span className="tabular-nums opacity-70">{words.length}</span>
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
                {BUCKET_META[b].label} <span className="tabular-nums opacity-70">{counts[b]}</span>
              </button>
            ))}
          </div>

          {shownWords.length === 0 ? (
            <p className="text-xs text-text-muted">No words match.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {shownWords.map((w) => {
                const b = bucketOf.get(w) ?? 'pending';
                return (
                  <span
                    key={w}
                    title={BUCKET_META[b].label}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-transparent ${BUCKET_META[b].chip}`}
                  >
                    <Icon icon={BUCKET_META[b].icon} className="text-[10px] opacity-80" />
                    {w}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Leaderboard ── (server lists only — the Levels have no members) */}
        {col && (
          <section className="rounded-2xl border-[3px] border-border bg-bg-card p-5 sm:p-6 flex flex-col gap-4 self-start w-full">
            <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
              <Icon icon="lucide:trophy" className="text-accent-yellow" />
              Leaderboard
            </h2>

            {!col.isPublic && isOwner && (
              <p className="text-xs text-text-muted leading-relaxed">
                This list is private, so the board is just you. Share it and everyone who joins shows up here.
              </p>
            )}

            {!joined && !isOwner && user && (
              <div className="flex flex-col gap-3 rounded-xl bg-bg-tertiary/50 p-4">
                <p className="text-xs text-text-secondary leading-relaxed">
                  Join to appear on this board — the other learners will see your name, avatar and how many of
                  these words you know. Nothing else is shared.
                </p>
                <button
                  onClick={study}
                  disabled={joining}
                  className="btn-3d self-start px-4 py-2 text-xs font-bold bg-accent-purple text-bg-primary disabled:opacity-50"
                >
                  {joining ? 'Joining…' : 'Join this collection'}
                </button>
              </div>
            )}

            <CollectionLeaderboard members={members} meId={user?.id} ownerId={col.ownerId} loading={membersLoading} />

            <p className="text-[11px] text-text-muted/70">
              Ranked by words known (answered right or mastered). Top 50 learners.
            </p>
          </section>
        )}
      </div>

      <button
        onClick={() => navigate('/')}
        className="btn-3d block w-full sm:w-auto sm:min-w-72 mx-auto mt-8 px-10 py-3 bg-accent-cyan text-bg-primary font-bold"
      >
        Start learning
      </button>

      {showStats && <CollectionStats name={name} words={words} onClose={() => setShowStats(false)} />}
    </div>
  );
}
