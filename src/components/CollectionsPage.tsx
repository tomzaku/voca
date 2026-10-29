import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCollections, type UserCollection } from '../hooks/useCollections';
import { listCollections, getCollection, isCollectionId, type CollectionInfo } from '../lib/collections';
import { QuizSetup } from './QuizSetup';
import { CollectionStats } from './CollectionStats';
import { MemberAvatars } from './MemberAvatars';
import { CollectionForm } from './CollectionForm';
import { CollectionDetail } from './CollectionDetailPage';
import { LevelTest } from './LevelTestPage';
import { completionPct } from '../lib/completion';
import { PHOTO_SCRIM, topicCover, topicPhoto } from '../lib/topicTheme';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';

// CEFR band for each level collection, and its colour on the "ladder". Classes
// are spelled out — Tailwind only keeps classes it finds as complete strings.
// `tint` washes the card in its band's colour: a plain stand-in for the photo
// and gradient covers the other cards on this page have.
const LEVEL_META: Record<string, { badge: string; chip: string; bar: string; tint: string }> = {
  curated: { badge: '★', chip: 'bg-accent-cyan/15 text-accent-cyan', bar: 'bg-accent-cyan', tint: 'from-accent-cyan/10' },
  'level-1': { badge: 'A1', chip: 'bg-accent-green/15 text-accent-green', bar: 'bg-accent-green', tint: 'from-accent-green/10' },
  'level-2': { badge: 'A2', chip: 'bg-accent-cyan/15 text-accent-cyan', bar: 'bg-accent-cyan', tint: 'from-accent-cyan/10' },
  'level-3': { badge: 'B1', chip: 'bg-accent-blue/15 text-accent-blue', bar: 'bg-accent-blue', tint: 'from-accent-blue/10' },
  'level-4': { badge: 'B2', chip: 'bg-accent-purple/15 text-accent-purple', bar: 'bg-accent-purple', tint: 'from-accent-purple/10' },
  'level-5': { badge: 'C1', chip: 'bg-accent-orange/15 text-accent-orange', bar: 'bg-accent-orange', tint: 'from-accent-orange/10' },
  'level-6': { badge: 'C2', chip: 'bg-accent-red/15 text-accent-red', bar: 'bg-accent-red', tint: 'from-accent-red/10' },
};

/** Words of a bundled collection, by id. */
const systemWords = (id: string) => getCollection(id).words.map((w) => w.word);

/** Small square action button. `glass` sits on a photo/gradient cover. */
function IconAction({ icon, label, onClick, glass }: { icon: string; label: string; onClick: () => void; glass?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      aria-label={label}
      className={`relative w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
        glass
          ? 'bg-white/15 ring-1 ring-white/25 backdrop-blur-sm text-white hover:bg-white/30'
          : 'border border-border bg-bg-tertiary text-text-muted hover:text-text-primary hover:border-border-light'
      }`}
    >
      <Icon icon={icon} className="text-sm" />
    </button>
  );
}

function SectionHeader({ id, icon, title, subtitle, action }: {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 flex items-end justify-between gap-3 mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-8 h-8 rounded-lg bg-bg-tertiary text-accent-cyan flex items-center justify-center shrink-0">
          <Icon icon={icon} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-text-primary leading-tight">{title}</h2>
          <p className="text-[11px] text-text-muted truncate">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

/** White progress bar for covers. */
function CoverProgress({ pct, label }: { pct: number; label: string }) {
  return (
    <>
      <div className="mt-3 h-1.5 rounded-full bg-white/25 overflow-hidden">
        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] font-bold text-white/90 mt-1">{label}</p>
    </>
  );
}

/** Photo-covered topic tile. */
function TopicTile({ c, active, pct, onPick, onView, onQuiz }: {
  c: CollectionInfo;
  active: boolean;
  pct: number;
  onPick: () => void;
  onView: () => void;
  onQuiz: () => void;
}) {
  const intl = useIntl();
  return (
    <div
      className={`group relative overflow-hidden flex flex-col min-h-44 rounded-2xl p-3.5 text-white transition-all duration-200 hover:-translate-y-1 ${
        active ? 'ring-[3px] ring-accent-cyan ring-offset-2 ring-offset-bg-primary' : ''
      }`}
      style={topicCover(c.id)}
    >
      <img
        src={topicPhoto(c.id)}
        alt=""
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={PHOTO_SCRIM} />
      {/* The whole cover picks the topic; the two small actions sit above it. */}
      <button
        onClick={onPick}
        aria-pressed={active}
        aria-label={intl.formatMessage({ id: 'collections.studyName' }, { name: c.name })}
        className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-white focus-visible:-outline-offset-4"
      />
      <div className="relative pointer-events-none flex items-start justify-between gap-2">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 ring-1 ring-white/30 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
          <Icon icon={c.icon ?? 'lucide:book-open'} className="text-lg" />
        </span>
        <div className="flex gap-1 pointer-events-auto">
          <IconAction glass icon="lucide:eye" label={intl.formatMessage({ id: 'collections.viewName' }, { name: c.name })} onClick={onView} />
          <IconAction glass icon="lucide:play" label={intl.formatMessage({ id: 'collections.quizName' }, { name: c.name })} onClick={onQuiz} />
        </div>
      </div>
      <div className="relative pointer-events-none mt-auto pt-4">
        {active && (
          <span className="inline-block mb-1.5 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white text-gray-900">
            <FormattedMessage id="collections.studying" />
          </span>
        )}
        <p className="font-display font-extrabold text-[17px] leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">{c.name}</p>
        <p className="text-[11px] leading-snug text-white/90 mt-0.5 line-clamp-2">{c.description}</p>
        <CoverProgress pct={pct} label={intl.formatMessage({ id: 'collections.wordsPctKnown' }, { count: c.count, pct })} />
      </div>
    </div>
  );
}

/** One rung of the level ladder (Curated + CEFR A1–C2). */
function LevelCard({ c, active, pct, onPick, onView, onStats, onQuiz }: {
  c: CollectionInfo;
  active: boolean;
  pct: number;
  onPick: () => void;
  onView: () => void;
  onStats: () => void;
  onQuiz: () => void;
}) {
  const intl = useIntl();
  const meta = LEVEL_META[c.id] ?? LEVEL_META.curated;
  return (
    <div
      className={`group relative flex flex-col rounded-2xl border-2 bg-bg-card bg-linear-to-br ${meta.tint} to-transparent p-4 transition-all hover:-translate-y-0.5 ${
        active ? 'border-accent-cyan ring-2 ring-accent-cyan/25' : 'border-border hover:border-border-light'
      }`}
    >
      <button onClick={onPick} aria-pressed={active} aria-label={intl.formatMessage({ id: 'collections.studyName' }, { name: c.name })} className="absolute inset-0 rounded-2xl" />
      <div className="relative pointer-events-none flex items-start justify-between gap-2">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center font-display font-extrabold text-base ${meta.chip}`}>
          {meta.badge}
        </span>
        {active && (
          <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-cyan text-bg-primary">
            <FormattedMessage id="collections.studying" />
          </span>
        )}
      </div>
      <p className="relative pointer-events-none mt-3 font-display font-bold text-text-primary leading-tight">{c.name}</p>
      <p className="relative pointer-events-none text-[11px] text-text-muted mt-0.5 line-clamp-1">{c.description}</p>
      <div className="relative pointer-events-none mt-3 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
        <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="relative flex items-center gap-1.5 mt-2">
        <span className="pointer-events-none text-[11px] font-bold text-text-muted mr-auto">
          <FormattedMessage id="collections.wordsPct" values={{ count: c.count, pct }} />
        </span>
        <IconAction icon="lucide:eye" label={intl.formatMessage({ id: 'collections.viewName' }, { name: c.name })} onClick={onView} />
        <IconAction icon="lucide:chart-pie" label={intl.formatMessage({ id: 'collections.nameProgress' }, { name: c.name })} onClick={onStats} />
        <IconAction icon="lucide:play" label={intl.formatMessage({ id: 'collections.quizName' }, { name: c.name })} onClick={onQuiz} />
      </div>
    </div>
  );
}

/** A server collection — yours or one you joined — with a generated cover. */
function UserCard({ c, active, pct, owned, menuOpen, membersSignal, onPick, onView, onStats, onQuiz, onToggleMenu, onCloseMenu, onMembers, onEdit, onShare, onDelete }: {
  c: UserCollection;
  active: boolean;
  pct: number;
  owned: boolean;
  menuOpen: boolean;
  membersSignal: number;
  onPick: () => void;
  onView: () => void;
  onStats: () => void;
  onQuiz: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onMembers: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const intl = useIntl();
  const showMembers = !owned || c.isPublic;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 bg-bg-card transition-all ${
        active ? 'border-accent-cyan ring-2 ring-accent-cyan/25' : 'border-border hover:border-border-light'
      }`}
    >
      {/* Cover strip */}
      <button
        onClick={onPick}
        aria-pressed={active}
        aria-label={intl.formatMessage({ id: 'collections.studyName' }, { name: c.name })}
        className="relative h-20 rounded-t-[14px] overflow-hidden text-left text-white px-4 py-3"
        style={topicCover(c.id)}
      >
        <span className="absolute -right-2 -bottom-5 font-display font-extrabold text-6xl text-white/15 select-none" aria-hidden>
          {c.name.trim().charAt(0).toUpperCase() || '#'}
        </span>
        <span className="relative flex items-center gap-1.5 flex-wrap">
          {active && (
            <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white text-gray-900">
              <FormattedMessage id="collections.studying" />
            </span>
          )}
          {owned && c.isPublic && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 ring-1 ring-white/25">
              <FormattedMessage id="collections.public" />
            </span>
          )}
          {!owned && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 ring-1 ring-white/25">
              <Icon icon="lucide:users" className="text-[11px]" /> {c.memberCount}
            </span>
          )}
        </span>
      </button>

      <div className="flex-1 flex flex-col p-4 pt-3">
        <button onClick={onPick} className="text-left">
          <p className="font-display font-bold text-text-primary leading-tight truncate">{c.name}</p>
          {c.description && <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{c.description}</p>}
        </button>
        {showMembers && <MemberAvatars collectionId={c.id} name={c.name} openSignal={membersSignal} />}
        <div className="mt-3 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
          <div className="h-full rounded-full bg-accent-cyan transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[11px] font-bold text-text-muted mr-auto"><FormattedMessage id="collections.wordsPct" values={{ count: c.words.length, pct }} /></span>
          <IconAction icon="lucide:eye" label={intl.formatMessage({ id: 'collections.viewName' }, { name: c.name })} onClick={onView} />
          <IconAction icon="lucide:chart-pie" label={intl.formatMessage({ id: 'collections.nameProgress' }, { name: c.name })} onClick={onStats} />
          <IconAction icon="lucide:play" label={intl.formatMessage({ id: 'collections.quizName' }, { name: c.name })} onClick={onQuiz} />
          {(owned || showMembers) && (
            <div className="relative shrink-0">
              <IconAction icon="lucide:ellipsis-vertical" label={intl.formatMessage({ id: 'collections.options' })} onClick={onToggleMenu} />
              {menuOpen && (
                <>
                  {/* click-away backdrop */}
                  <div className="fixed inset-0 z-30" onClick={onCloseMenu} />
                  <div className="absolute right-0 bottom-10 z-40 w-40 rounded-xl border-2 border-border bg-bg-card shadow-xl overflow-hidden animate-fade-in">
                    {showMembers && (
                      <button
                        onClick={onMembers}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-accent-purple transition-colors"
                      >
                        <Icon icon="lucide:users" className="text-sm" /> <FormattedMessage id="collections.learners" />
                      </button>
                    )}
                    {owned && (
                      <>
                        <button
                          onClick={onEdit}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                        >
                          <Icon icon="lucide:pencil" className="text-sm" /> <FormattedMessage id="collections.edit" />
                        </button>
                        <button
                          onClick={onShare}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-accent-cyan transition-colors"
                        >
                          <Icon icon="lucide:share-2" className="text-sm" /> <FormattedMessage id="collections.share" />
                        </button>
                        <button
                          onClick={onDelete}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-muted hover:bg-accent-red/10 hover:text-accent-red transition-colors"
                        >
                          <Icon icon="lucide:trash-2" className="text-sm" /> <FormattedMessage id="collections.delete" />
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Wide enough for the detail view to sit in a popup; narrower screens get
 *  the full page, where a modal would only be a cramped copy of it. */
const DETAIL_POPUP_QUERY = '(min-width: 1024px)';

/**
 * A dimmed popup over /collections (desktop only). Portalled to <body>, and
 * the backdrop is a sibling of the panel, not its parent: a filter or
 * transform on an ancestor would trap the content's own fixed-position layers
 * (quiz picker, full-screen quiz) inside it.
 */
function Popup({ width, actions, onClose, children }: {
  width: string;
  actions?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const intl = useIntl();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 lg:p-10" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-full overflow-y-auto rounded-3xl border-2 border-border bg-bg-primary shadow-2xl p-6`}>
        <div className="sticky top-0 z-10 flex justify-end gap-2 -mt-2 -mr-2 mb-2 h-0">
          {actions}
          <button
            onClick={onClose}
            title={intl.formatMessage({ id: 'collections.close' })}
            aria-label={intl.formatMessage({ id: 'collections.close' })}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-bg-card/90 border border-border text-text-muted hover:text-text-primary shadow-sm"
          >
            <Icon icon="lucide:x" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** A collection's detail view in a popup. */
function CollectionDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const intl = useIntl();
  const navigate = useNavigate();
  return (
    <Popup
      width="max-w-5xl"
      onClose={onClose}
      actions={
        <button
          onClick={() => navigate(`/collections/${id}`)}
          title={intl.formatMessage({ id: 'collections.openAsPage' })}
          aria-label={intl.formatMessage({ id: 'collections.openAsPage' })}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-bg-card/90 border border-border text-text-muted hover:text-text-primary shadow-sm"
        >
          <Icon icon="lucide:maximize-2" />
        </button>
      }
    >
      <CollectionDetail id={id} onClose={onClose} />
    </Popup>
  );
}

/**
 * Browse and pick the active vocabulary collection: a hero for what you're
 * studying now, then the Curated + CEFR level ladder (where a newcomer starts),
 * themed Topics, and your own collections (create / share / delete) and ones
 * you've joined. A search
 * filters every section at once. Each opens on its own page
 * (CollectionDetailPage).
 */
export function CollectionsPage() {
  const intl = useIntl();
  const activeId = useCollections((s) => s.activeId);
  const setActive = useCollections((s) => s.setActive);
  const mine = useCollections((s) => s.mine);
  const shared = useCollections((s) => s.shared);
  const joinedIds = useCollections((s) => s.joinedIds);
  const progress = useVocabularyStore((s) => s.progress);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Collections joined via share links (someone else's) — durable across
  // refreshes: hydrated from collection_members on login, cached locally.
  const joined = useMemo(() => joinedIds
    .filter((id) => !mine.some((c) => c.id === id))
    .map((id) => shared[id])
    .filter((c): c is UserCollection => Boolean(c)), [joinedIds, mine, shared]);
  const [searchParams] = useSearchParams();
  // Not memoised: the built-ins' names are read in the current language, so a
  // cached copy would keep the old one after switching. Both lists are tiny.
  const levelCollections = listCollections('level');
  const topicCollections = listCollections('topic');

  // Old share links (?c=<id>) land on the detail page now.
  const sharedId = searchParams.get('c');
  // The eye button: a popup on desktop, the full page on smaller screens.
  const [viewing, setViewing] = useState<string | null>(null);
  const openDetails = (id: string) => {
    if (window.matchMedia(DETAIL_POPUP_QUERY).matches) setViewing(id);
    else navigate(`/collections/${id}`);
  };
  // "Find my level": the same split. Picking the result stays here, where
  // the hero and ladder show the new level straight away.
  const [testingLevel, setTestingLevel] = useState(false);
  const openLevelTest = () => {
    if (window.matchMedia(DETAIL_POPUP_QUERY).matches) setTestingLevel(true);
    else navigate('/level-test');
  };

  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const matches = (name: string, description?: string | null) =>
    !needle || name.toLowerCase().includes(needle) || (description ?? '').toLowerCase().includes(needle);
  const shownMine = mine.filter((c) => matches(c.name, c.description));
  const shownJoined = joined.filter((c) => matches(c.name, c.description));
  const shownTopics = topicCollections.filter((c) => matches(c.name, c.description));
  const shownLevels = levelCollections.filter((c) => matches(c.name, c.description));
  const nothingFound = needle && !shownMine.length && !shownJoined.length && !shownTopics.length && !shownLevels.length;

  // ── Quiz ──
  const [quiz, setQuiz] = useState<{ name: string; words: string[] } | null>(null);

  // ── Analytics popup ──
  const [stats, setStats] = useState<{ name: string; words: string[] } | null>(null);

  // ── Options menu (edit / share / delete / learners live behind ⋯) ──
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
  // Collections of your own live on the server — browsing is open to anyone,
  // but making one is where signing in comes in.
  const openCreate = () => (user ? setForm({ editingId: null, name: '', words: [] }) : navigate('/login'));
  const openEdit = (col: UserCollection) => setForm({ editingId: col.id, name: col.name, words: col.words });

  const pick = (id: string, label: string) => {
    setActive(id);
    toast.success(intl.formatMessage({ id: 'collections.toastStudying' }, { name: label }));
  };

  const handleShare = async (id: string) => {
    try {
      const url = await useCollections.getState().shareCollection(id);
      await navigator.clipboard.writeText(url);
      toast.success(intl.formatMessage({ id: 'collections.shareLinkCopied' }));
    } catch (err) {
      toast.error((err as Error).message || intl.formatMessage({ id: 'collections.couldNotShare' }));
    }
  };

  const handleDelete = async (col: UserCollection) => {
    if (!window.confirm(intl.formatMessage({ id: 'collections.confirmDelete' }, { name: col.name }))) return;
    try {
      await useCollections.getState().deleteCollection(col.id);
      toast.success(intl.formatMessage({ id: 'collections.deleted' }, { name: col.name }));
    } catch (err) {
      toast.error((err as Error).message || intl.formatMessage({ id: 'collections.couldNotDelete' }));
    }
  };

  // What the hero shows — the active collection, wherever it lives.
  const activeUser = mine.find((c) => c.id === activeId) ?? shared[activeId];
  const activeSystem = !activeUser && isCollectionId(activeId) ? getCollection(activeId) : null;
  const activeName = activeUser?.name ?? activeSystem?.name ?? getCollection(activeId).name;
  const activeWords = activeUser?.words ?? systemWords(activeSystem?.id ?? activeId);
  const activePct = completionPct(activeWords, progress);
  const activeIsTopic = activeSystem?.kind === 'topic';

  if (sharedId) return <Navigate to={`/collections/${sharedId}`} replace />;

  if (quiz) {
    // Same shareable quiz engine as the History page — with progress recording
    // on, so collection completion still tracks quiz answers.
    return <QuizSetup words={quiz.words} recordProgress onBack={() => setQuiz(null)} />;
  }

  const userCard = (c: UserCollection, owned: boolean) => (
    <UserCard
      key={c.id}
      c={c}
      owned={owned}
      active={c.id === activeId}
      pct={completionPct(c.words, progress)}
      menuOpen={menuId === c.id}
      membersSignal={membersSignal[c.id] ?? 0}
      onPick={() => pick(c.id, c.name)}
      onView={() => openDetails(c.id)}
      onStats={() => setStats({ name: c.name, words: c.words })}
      onQuiz={() => setQuiz({ name: c.name, words: c.words })}
      onToggleMenu={() => setMenuId(menuId === c.id ? null : c.id)}
      onCloseMenu={() => setMenuId(null)}
      onMembers={() => openMembers(c.id)}
      onEdit={() => { setMenuId(null); openEdit(c); }}
      onShare={() => { setMenuId(null); handleShare(c.id); }}
      onDelete={() => { setMenuId(null); handleDelete(c); }}
    />
  );

  const jumps = [
    { id: 'levels', labelId: 'collections.levels', count: levelCollections.length },
    { id: 'topics', labelId: 'collections.topics', count: topicCollections.length },
    { id: 'yours', labelId: 'collections.jumpYours', count: mine.length + joined.length },
  ];

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      {/* ── Hero: what you're studying now ── */}
      <section
        className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 mb-6"
        style={topicCover(activeId)}
      >
        {activeIsTopic && (
          <img src={topicPhoto(activeId)} alt="" decoding="async" className="pointer-events-none absolute inset-0 w-full h-full object-cover" />
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={PHOTO_SCRIM} />
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/80"><FormattedMessage id="collections.nowStudying" /></p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-display font-extrabold leading-tight break-words [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">
              {activeName}
            </h1>
            <div className="mt-4 max-w-md">
              <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${activePct}%` }} />
              </div>
              <p className="text-xs font-bold text-white/90 mt-1.5">
                <FormattedMessage id="collections.pctKnownWords" values={{ pct: activePct, count: activeWords.length }} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="btn-3d px-5 py-2.5 bg-white text-gray-900 text-sm font-bold flex items-center gap-1.5"
            >
              <Icon icon="lucide:play" /> <FormattedMessage id="collections.continueLearning" />
            </button>
            <IconAction glass icon="lucide:eye" label={intl.formatMessage({ id: 'collections.viewName' }, { name: activeName })} onClick={() => openDetails(activeId)} />
            <IconAction glass icon="lucide:chart-pie" label={intl.formatMessage({ id: 'collections.nameProgress' }, { name: activeName })} onClick={() => setStats({ name: activeName, words: activeWords })} />
          </div>
        </div>
      </section>

      {/* ── Search + jump links ── */}
      <div className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-[5] mb-8 flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-2xl border border-border bg-bg-card/90 backdrop-blur shadow-sm">
        <label className="flex-1 min-w-0 flex items-center gap-2 px-3 rounded-xl bg-bg-tertiary focus-within:ring-2 focus-within:ring-accent-cyan/30">
          <Icon icon="lucide:search" className="text-text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={intl.formatMessage({ id: 'collections.searchPlaceholder' })}
            className="flex-1 min-w-0 py-2 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label={intl.formatMessage({ id: 'collections.clearSearch' })} className="text-text-muted hover:text-text-primary">
              <Icon icon="lucide:x" />
            </button>
          )}
        </label>
        <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {jumps.map((j) => (
            <a
              key={j.id}
              href={`#${j.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(j.id)?.scrollIntoView({ behavior: 'smooth' }); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <FormattedMessage id={j.labelId} /> <span className="opacity-60">{j.count}</span>
            </a>
          ))}
        </nav>
      </div>

      {nothingFound && (
        <div className="text-center py-12 mb-8 rounded-2xl border-2 border-dashed border-border">
          <Icon icon="lucide:search-x" className="mx-auto text-3xl text-text-muted mb-2" />
          <p className="text-sm text-text-secondary"><FormattedMessage id="collections.noMatch" values={{ query: query.trim() }} /></p>
          <button onClick={() => setQuery('')} className="mt-2 text-xs font-bold text-accent-cyan hover:underline"><FormattedMessage id="collections.clearSearch" /></button>
        </div>
      )}

      {/* ── Level ladder ── */}
      {shownLevels.length > 0 && (
        <section className="mb-10">
          <SectionHeader id="levels" icon="lucide:signal" title={intl.formatMessage({ id: 'collections.levels' })} subtitle={intl.formatMessage({ id: 'collections.levelsSubtitle' })} />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {shownLevels.map((c) => {
              const words = systemWords(c.id);
              return (
                <LevelCard
                  key={c.id}
                  c={c}
                  active={c.id === activeId}
                  pct={completionPct(words, progress)}
                  onPick={() => pick(c.id, c.name)}
                  onView={() => openDetails(c.id)}
                  onStats={() => setStats({ name: c.name, words })}
                  onQuiz={() => setQuiz({ name: c.name, words })}
                />
              );
            })}
            {!needle && (
              <button
                onClick={openLevelTest}
                className="rounded-2xl border-2 border-dashed border-accent-cyan/40 bg-accent-cyan/5 hover:bg-accent-cyan/10 p-4 flex flex-col items-start justify-between gap-3 text-left transition-colors"
              >
                <span className="w-11 h-11 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
                  <Icon icon="lucide:target" className="text-xl" />
                </span>
                <span>
                  <span className="block font-display font-bold text-text-primary"><FormattedMessage id="collections.findMyLevel" /></span>
                  <span className="block text-[11px] text-text-muted mt-0.5"><FormattedMessage id="collections.findMyLevelHint" /></span>
                </span>
                <span className="text-xs font-bold text-accent-cyan flex items-center gap-1">
                  <FormattedMessage id="collections.takeTheTest" /> <Icon icon="lucide:arrow-right" />
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Topic collections ── */}
      {shownTopics.length > 0 && (
        <section className="mb-10">
          <SectionHeader id="topics" icon="lucide:layout-grid" title={intl.formatMessage({ id: 'collections.topics' })} subtitle={intl.formatMessage({ id: 'collections.topicsSubtitle' })} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shownTopics.map((c) => {
              const words = systemWords(c.id);
              return (
                <TopicTile
                  key={c.id}
                  c={c}
                  active={c.id === activeId}
                  pct={completionPct(words, progress)}
                  onPick={() => pick(c.id, c.name)}
                  onView={() => openDetails(c.id)}
                  onQuiz={() => setQuiz({ name: c.name, words })}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Your collections (+ joined) ── */}
      {(!needle || shownMine.length > 0 || shownJoined.length > 0) && (
        <section>
          <SectionHeader
            id="yours"
            icon="lucide:folder-heart"
            title={intl.formatMessage({ id: 'collections.yourCollections' })}
            subtitle={intl.formatMessage({ id: 'collections.yourCollectionsSubtitle' })}
            action={
              <button
                onClick={() => (creating ? closeForm() : openCreate())}
                className="flex items-center gap-1 text-xs font-bold text-accent-cyan hover:underline shrink-0"
              >
                <Icon icon={creating ? 'lucide:x' : 'lucide:plus'} />
                <FormattedMessage id={creating ? 'collections.cancel' : 'collections.newCollection'} />
              </button>
            }
          />

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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shownMine.map((c) => userCard(c, true))}
            {!needle && !creating && (
              <button
                onClick={openCreate}
                className="min-h-40 rounded-2xl border-2 border-dashed border-border hover:border-accent-cyan/60 hover:bg-accent-cyan/5 text-text-muted hover:text-accent-cyan flex flex-col items-center justify-center gap-2 p-4 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
                  <Icon icon="lucide:plus" className="text-lg" />
                </span>
                <span className="text-sm font-bold"><FormattedMessage id="collections.newCollection" /></span>
                <span className="text-[11px] text-center max-w-52">
                  <FormattedMessage id={mine.length === 0 ? 'collections.newFirstHint' : 'collections.newAnotherHint'} />
                </span>
              </button>
            )}
          </div>

          {shownJoined.length > 0 && (
            <>
              <p className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-wider text-text-muted"><FormattedMessage id="collections.joinedFromFriends" /></p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shownJoined.map((c) => userCard(c, false))}
              </div>
            </>
          )}
        </section>
      )}

      {stats && (
        <CollectionStats name={stats.name} words={stats.words} onClose={() => setStats(null)} />
      )}
      {viewing && <CollectionDetailModal id={viewing} onClose={() => setViewing(null)} />}
      {testingLevel && (
        <Popup width="max-w-lg" onClose={() => setTestingLevel(false)}>
          <LevelTest onBack={() => setTestingLevel(false)} onStudy={() => setTestingLevel(false)} />
        </Popup>
      )}
    </div>
  );
}
