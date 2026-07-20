import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCollections, type UserCollection } from '../hooks/useCollections';
import { listCollections, getCollection } from '../lib/collections';
import { QuizSetup } from './QuizSetup';
import { CollectionStats } from './CollectionStats';
import { MemberAvatars } from './MemberAvatars';
import { PreviewModal, sampleWords } from './PreviewModal';
import { CollectionForm } from './CollectionForm';
import { completionPct } from '../lib/completion';
import { useAuth } from '../hooks/useAuth';
import { useVocabularyStore } from '../hooks/useVocabulary';

/** Thin progress bar + percent label — used on the system Level collections. */
function CompletionBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-accent-green' : 'bg-accent-cyan'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-text-muted shrink-0">{pct}%</span>
    </div>
  );
}

/** Small eye button that opens the word preview for a collection. */
function PreviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Preview words"
      className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
    >
      <Icon icon="lucide:eye" className="text-sm" />
    </button>
  );
}

/** Small play button that starts a quiz on a collection. */
function QuizButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Quiz this collection"
      className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-green hover:border-accent-green/30 transition-all"
    >
      <Icon icon="lucide:play" className="text-sm" />
    </button>
  );
}

/** Small chart button that opens the analytics popup for a collection. */
function StatsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Progress stats"
      className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-purple hover:border-accent-purple/30 transition-all"
    >
      <Icon icon="lucide:chart-pie" className="text-sm" />
    </button>
  );
}

/** "N learners" chip for server collections (desktop only — mobile rows are tight,
 *  and the Members button below already carries the count). */
function Learners({ count }: { count: number }) {
  return (
    <span
      className="hidden sm:flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple font-bold shrink-0"
      title={`${count} learner${count === 1 ? '' : 's'} study this collection`}
    >
      <Icon icon="lucide:users" className="text-[11px]" />
      {count}
    </span>
  );
}

/**
 * Browse and pick the active vocabulary collection: bundled system collections
 * (Curated + CEFR Levels), your own collections (create / share / delete), and
 * collections shared with you via link (?c=<id>).
 */
export function CollectionsPage() {
  const { user } = useAuth();
  const activeId = useCollections((s) => s.activeId);
  const setActive = useCollections((s) => s.setActive);
  const mine = useCollections((s) => s.mine);
  const shared = useCollections((s) => s.shared);
  const joinedIds = useCollections((s) => s.joinedIds);
  const progress = useVocabularyStore((s) => s.progress);
  const navigate = useNavigate();

  // Collections joined via share links (someone else's) — durable across
  // refreshes: hydrated from collection_members on login, cached locally.
  const joined = useMemo(() => joinedIds
    .filter((id) => !mine.some((c) => c.id === id))
    .map((id) => shared[id])
    .filter((c): c is UserCollection => Boolean(c)), [joinedIds, mine, shared]);
  const [searchParams] = useSearchParams();
  const systemCollections = useMemo(() => listCollections(), []);

  // ── Shared link (?c=<id>) ──
  const sharedId = searchParams.get('c');
  const [sharedCol, setSharedCol] = useState<UserCollection | null>(null);
  const [sharedMissing, setSharedMissing] = useState(false);
  useEffect(() => {
    if (!sharedId) return;
    let cancelled = false;
    useCollections.getState().fetchById(sharedId).then((col) => {
      if (cancelled) return;
      if (col) setSharedCol(col);
      else setSharedMissing(true);
    });
    return () => { cancelled = true; };
  }, [sharedId]);

  // ── Word preview ──
  const [preview, setPreview] = useState<{ name: string; all: string[]; sample: string[] } | null>(null);
  const openPreview = (name: string, all: string[]) =>
    setPreview({ name, all, sample: sampleWords(all) });

  // ── Quiz ──
  const [quiz, setQuiz] = useState<{ name: string; words: string[] } | null>(null);

  // ── Analytics popup ──
  const [stats, setStats] = useState<{ name: string; words: string[] } | null>(null);

  // ── Owner options menu (edit / share / delete live behind ⋯) ──
  const [menuId, setMenuId] = useState<string | null>(null);

  // Per-collection bump counters that open the members modal from a menu item.
  const [membersSignal, setMembersSignal] = useState<Record<string, number>>({});
  const openMembers = (id: string) => {
    setMenuId(null);
    setMembersSignal((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));
  };

  // ── Create / edit form ── (form set = open; editingId null = creating new)
  const [form, setForm] = useState<{ editingId: string | null; name: string; words: string[] } | null>(null);
  const creating = form !== null;
  const closeForm = () => setForm(null);
  const openCreate = () => setForm({ editingId: null, name: '', words: [] });
  const openEdit = (col: UserCollection) => setForm({ editingId: col.id, name: col.name, words: col.words });

  const pick = (id: string, label: string) => {
    setActive(id);
    toast.success(`Studying “${label}”`);
  };

  const handleShare = async (id: string) => {
    try {
      const url = await useCollections.getState().shareCollection(id);
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied!');
    } catch (err) {
      toast.error((err as Error).message || 'Could not share.');
    }
  };

  const handleDelete = async (col: UserCollection) => {
    if (!window.confirm(`Delete “${col.name}”? This can't be undone.`)) return;
    try {
      await useCollections.getState().deleteCollection(col.id);
      toast.success(`Deleted “${col.name}”`);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete.');
    }
  };

  const isForeignShared = sharedCol && sharedCol.ownerId !== user?.id;

  if (quiz) {
    // Same shareable quiz engine as the History page — with progress recording
    // on, so collection completion still tracks quiz answers.
    return <QuizSetup words={quiz.words} recordProgress onBack={() => setQuiz(null)} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-1">Collections</h1>
      <p className="text-sm text-text-muted mb-6">
        Pick the set of words you want to study. Your choice syncs across devices.
      </p>

      {/* ── Shared with you (via link) ── */}
      {sharedId && isForeignShared && (
        <div className="mb-6 p-4 rounded-2xl border-2 border-accent-purple/40 bg-accent-purple/5">
          <div className="flex items-center gap-2 mb-1">
            <Icon icon="lucide:gift" className="text-accent-purple" />
            <span className="text-xs font-bold text-accent-purple uppercase tracking-wider">Shared with you</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-display font-bold text-text-primary">{sharedCol.name}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-bold">
                  {sharedCol.words.length} words
                </span>
                <Learners count={sharedCol.memberCount} />
              </div>
              {sharedCol.description && <p className="text-xs text-text-muted mt-0.5">{sharedCol.description}</p>}
              <MemberAvatars collectionId={sharedCol.id} name={sharedCol.name} />
            </div>
            <PreviewButton onClick={() => openPreview(sharedCol.name, sharedCol.words)} />
            <StatsButton onClick={() => setStats({ name: sharedCol.name, words: sharedCol.words })} />
            <QuizButton onClick={() => setQuiz({ name: sharedCol.name, words: sharedCol.words })} />
            <button
              onClick={() => pick(sharedCol.id, sharedCol.name)}
              className="btn-3d shrink-0 px-4 py-2 text-sm bg-accent-purple text-bg-primary font-bold"
            >
              {activeId === sharedCol.id ? 'Studying ✓' : 'Study this'}
            </button>
          </div>
        </div>
      )}
      {sharedId && sharedMissing && (
        <div className="mb-6 p-4 rounded-2xl border-2 border-border bg-bg-card text-sm text-text-muted">
          This shared collection doesn't exist or isn't public anymore.
        </div>
      )}

      {/* ── My collections ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">My collections</h2>
          <button
            onClick={() => (creating ? closeForm() : openCreate())}
            className="flex items-center gap-1 text-xs font-bold text-accent-cyan hover:underline"
          >
            <Icon icon={creating ? 'lucide:x' : 'lucide:plus'} />
            {creating ? 'Cancel' : 'New collection'}
          </button>
        </div>

        {form && (
          <div className="mb-3 p-4 rounded-2xl border-2 border-accent-cyan/40 bg-bg-card space-y-3 animate-fade-in">
            <CollectionForm
              editingId={form.editingId}
              initialName={form.name}
              initialWords={form.words}
              onDone={closeForm}
            />
          </div>
        )}

        {mine.length === 0 && !creating ? (
          <p className="text-xs text-text-muted px-1">
            No collections yet — create one from your own word list and share it with friends.
          </p>
        ) : (
          <div className="space-y-2">
            {mine.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                    active ? 'border-accent-cyan bg-accent-cyan/10' : 'border-border bg-bg-card hover:border-border-light'
                  }`}
                >
                  <button onClick={() => pick(c.id, c.name)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className={`font-display font-bold truncate ${active ? 'text-accent-cyan' : 'text-text-primary'}`}>{c.name}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-bold shrink-0">
                        {c.words.length} words
                      </span>
                      {c.isPublic && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-green/10 text-accent-green font-bold shrink-0">
                          Public
                        </span>
                      )}
                    </div>
                    {c.isPublic && <MemberAvatars collectionId={c.id} name={c.name} openSignal={membersSignal[c.id] ?? 0} />}
                  </button>
                  <PreviewButton onClick={() => openPreview(c.name, c.words)} />
                  <StatsButton onClick={() => setStats({ name: c.name, words: c.words })} />
                  <QuizButton onClick={() => setQuiz({ name: c.name, words: c.words })} />
                  {/* Owner actions tucked behind an options menu */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                      title="Options"
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-text-primary hover:border-border-light transition-all"
                    >
                      <Icon icon="lucide:ellipsis-vertical" className="text-sm" />
                    </button>
                    {menuId === c.id && (
                      <>
                        {/* click-away backdrop */}
                        <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                        <div className="absolute right-0 top-9 z-40 w-40 rounded-xl border-2 border-border bg-bg-card shadow-xl overflow-hidden animate-fade-in">
                          {c.isPublic && (
                            <button
                              onClick={() => openMembers(c.id)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-accent-purple transition-colors"
                            >
                              <Icon icon="lucide:users" className="text-sm" /> Learners
                            </button>
                          )}
                          <button
                            onClick={() => { setMenuId(null); openEdit(c); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                          >
                            <Icon icon="lucide:pencil" className="text-sm" /> Edit
                          </button>
                          <button
                            onClick={() => { setMenuId(null); handleShare(c.id); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-accent-cyan transition-colors"
                          >
                            <Icon icon="lucide:share-2" className="text-sm" /> Share
                          </button>
                          <button
                            onClick={() => { setMenuId(null); handleDelete(c); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-muted hover:bg-accent-red/10 hover:text-accent-red transition-colors"
                          >
                            <Icon icon="lucide:trash-2" className="text-sm" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {active && <Icon icon="lucide:check-circle-2" className="text-xl text-accent-cyan shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Joined via share links ── */}
      {joined.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Joined</h2>
          <div className="space-y-2">
            {joined.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                    active
                      ? 'border-accent-purple bg-accent-purple/10'
                      : 'border-border bg-bg-card hover:border-border-light'
                  }`}
                >
                  <button onClick={() => pick(c.id, c.name)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`font-display font-bold truncate ${active ? 'text-accent-purple' : 'text-text-primary'}`}>{c.name}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-bold shrink-0">
                        {c.words.length} words
                      </span>
                      <Learners count={c.memberCount} />
                    </div>
                    {c.description && <p className="text-xs text-text-muted mt-0.5">{c.description}</p>}
                    <MemberAvatars collectionId={c.id} name={c.name} openSignal={membersSignal[c.id] ?? 0} />
                  </button>
                  <PreviewButton onClick={() => openPreview(c.name, c.words)} />
                  <StatsButton onClick={() => setStats({ name: c.name, words: c.words })} />
                  <QuizButton onClick={() => setQuiz({ name: c.name, words: c.words })} />
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                      title="Options"
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-text-primary hover:border-border-light transition-all"
                    >
                      <Icon icon="lucide:ellipsis-vertical" className="text-sm" />
                    </button>
                    {menuId === c.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                        <div className="absolute right-0 top-9 z-40 w-40 rounded-xl border-2 border-border bg-bg-card shadow-xl overflow-hidden animate-fade-in">
                          <button
                            onClick={() => openMembers(c.id)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-accent-purple transition-colors"
                          >
                            <Icon icon="lucide:users" className="text-sm" /> Learners
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {active && <Icon icon="lucide:check-circle-2" className="text-xl text-accent-purple shrink-0" />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── System collections ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Levels</h2>
          <button
            onClick={() => navigate('/level-test')}
            className="flex items-center gap-1 text-xs font-bold text-accent-cyan hover:underline"
          >
            <Icon icon="lucide:target" />
            Find my level
          </button>
        </div>
        <div className="space-y-2">
          {systemCollections.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                className={`flex items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                  active
                    ? 'border-accent-cyan bg-accent-cyan/10'
                    : 'border-border bg-bg-card hover:border-border-light'
                }`}
              >
                <button onClick={() => pick(c.id, c.name)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`font-display font-bold ${active ? 'text-accent-cyan' : 'text-text-primary'}`}>{c.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-bold">
                      {c.count} words
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{c.description}</p>
                  <CompletionBar pct={completionPct(getCollection(c.id).words.map((w) => w.word), progress)} />
                </button>
                <PreviewButton onClick={() => openPreview(c.name, getCollection(c.id).words.map((w) => w.word))} />
                <StatsButton onClick={() => setStats({ name: c.name, words: getCollection(c.id).words.map((w) => w.word) })} />
                <QuizButton onClick={() => setQuiz({ name: c.name, words: getCollection(c.id).words.map((w) => w.word) })} />
                {active ? (
                  <Icon icon="lucide:check-circle-2" className="text-xl text-accent-cyan shrink-0" />
                ) : (
                  <Icon icon="lucide:circle" className="text-xl text-text-muted/40 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <button
        onClick={() => navigate('/')}
        className="btn-3d w-full mt-6 py-3 bg-accent-cyan text-bg-primary font-bold"
      >
        Start learning
      </button>

      {preview && (
        <PreviewModal
          name={preview.name}
          total={preview.all.length}
          words={preview.sample}
          onReshuffle={() => setPreview({ ...preview, sample: sampleWords(preview.all) })}
          onClose={() => setPreview(null)}
        />
      )}

      {stats && (
        <CollectionStats name={stats.name} words={stats.words} onClose={() => setStats(null)} />
      )}
    </div>
  );
}
