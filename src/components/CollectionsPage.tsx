import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCollections, type UserCollection } from '../hooks/useCollections';
import { listCollections, getCollection } from '../lib/collections';
import { useAuth } from '../hooks/useAuth';
import { useVocabularyStore } from '../hooks/useVocabulary';
import type { WordProgress } from '../types';

/** Parse a free-form words input (newlines/commas) into clean single words. */
function parseWords(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[\n,;]+/)) {
    const w = raw.trim().toLowerCase();
    if (/^[a-z]+(?:[ '-][a-z]+)*$/.test(w) && w.length >= 2) seen.add(w);
  }
  return [...seen].slice(0, 1000);
}

/** Percent of a collection's words the viewer has finished (known or mastered). */
function completionPct(words: string[], progress: Record<string, WordProgress>): number {
  if (words.length === 0) return 0;
  let done = 0;
  for (const w of words) {
    const p = progress[w];
    if (p?.status === 'known' || p?.mastered) done++;
  }
  return Math.round((done / words.length) * 100);
}

/** Thin progress bar + percent label for a collection row. */
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

/** "N learners" chip for server collections. */
function Learners({ count }: { count: number }) {
  return (
    <span
      className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple font-bold shrink-0"
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
  const joined = joinedIds
    .filter((id) => !mine.some((c) => c.id === id))
    .map((id) => shared[id])
    .filter((c): c is UserCollection => Boolean(c));
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

  // ── Create form ──
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [wordsInput, setWordsInput] = useState('');
  const [saving, setSaving] = useState(false);

  const pick = (id: string, label: string) => {
    setActive(id);
    toast.success(`Studying “${label}”`);
  };

  const handleCreate = async () => {
    const words = parseWords(wordsInput);
    if (!name.trim()) { toast.error('Give your collection a name.'); return; }
    if (words.length < 2) { toast.error('Add at least 2 words (one per line).'); return; }
    setSaving(true);
    try {
      const created = await useCollections.getState().createCollection(name.trim(), words);
      toast.success(`Created “${created.name}” (${words.length} words)`);
      setName(''); setWordsInput(''); setCreating(false);
    } catch (err) {
      toast.error((err as Error).message || 'Could not create collection.');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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
              <CompletionBar pct={completionPct(sharedCol.words, progress)} />
            </div>
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
            onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-1 text-xs font-bold text-accent-cyan hover:underline"
          >
            <Icon icon={creating ? 'lucide:x' : 'lucide:plus'} />
            {creating ? 'Cancel' : 'New collection'}
          </button>
        </div>

        {creating && (
          <div className="mb-3 p-4 rounded-2xl border-2 border-accent-cyan/40 bg-bg-card space-y-3 animate-fade-in">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Collection name (e.g. IELTS Essentials)"
              maxLength={60}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50"
            />
            <textarea
              value={wordsInput}
              onChange={(e) => setWordsInput(e.target.value)}
              placeholder={'One word per line (or comma-separated):\nserendipity\nebullient\nmeticulous'}
              rows={6}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm font-code text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">{parseWords(wordsInput).length} words detected</span>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="btn-3d px-4 py-2 text-sm bg-accent-cyan text-bg-primary font-bold disabled:opacity-60"
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
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
                      <Learners count={c.memberCount} />
                    </div>
                    <CompletionBar pct={completionPct(c.words, progress)} />
                  </button>
                  <button
                    onClick={() => handleShare(c.id)}
                    title="Copy share link (makes the collection public)"
                    className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
                  >
                    <Icon icon="lucide:share-2" className="text-sm" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    title="Delete collection"
                    className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-all"
                  >
                    <Icon icon="lucide:trash-2" className="text-sm" />
                  </button>
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
                <button
                  key={c.id}
                  onClick={() => pick(c.id, c.name)}
                  className={`w-full flex items-center gap-3 text-left rounded-2xl border-2 p-4 transition-all ${
                    active
                      ? 'border-accent-purple bg-accent-purple/10'
                      : 'border-border bg-bg-card hover:border-border-light hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`font-display font-bold truncate ${active ? 'text-accent-purple' : 'text-text-primary'}`}>{c.name}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-bold shrink-0">
                        {c.words.length} words
                      </span>
                      <Learners count={c.memberCount} />
                    </div>
                    {c.description && <p className="text-xs text-text-muted mt-0.5">{c.description}</p>}
                    <CompletionBar pct={completionPct(c.words, progress)} />
                  </div>
                  {active && <Icon icon="lucide:check-circle-2" className="text-xl text-accent-purple shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── System collections ── */}
      <section>
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Levels</h2>
        <div className="space-y-2">
          {systemCollections.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => pick(c.id, c.name)}
                className={`w-full flex items-center gap-3 text-left rounded-2xl border-2 p-4 transition-all ${
                  active
                    ? 'border-accent-cyan bg-accent-cyan/10'
                    : 'border-border bg-bg-card hover:border-border-light hover:-translate-y-0.5'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-display font-bold ${active ? 'text-accent-cyan' : 'text-text-primary'}`}>{c.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-bold">
                      {c.count} words
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{c.description}</p>
                  <CompletionBar pct={completionPct(getCollection(c.id).words.map((w) => w.word), progress)} />
                </div>
                {active ? (
                  <Icon icon="lucide:check-circle-2" className="text-xl text-accent-cyan shrink-0" />
                ) : (
                  <Icon icon="lucide:circle" className="text-xl text-text-muted/40 shrink-0" />
                )}
              </button>
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
    </div>
  );
}
