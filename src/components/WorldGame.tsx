import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { t } from '../i18n';
import { useCollections } from '../hooks/useCollections';
import { useGameMode } from '../hooks/useGameMode';
import { useWorldStations } from '../hooks/useWorldStations';
import { WORLD_SKILLS, findActivity, type WorldActivity, type WorldFeature, type WorldSkill } from '../game/features';
import type { WorldStation } from '../game/types';
import { PreviewModal, sampleWords } from './PreviewModal';
import { CollectionForm } from './CollectionForm';
import { CollectionStats } from './CollectionStats';
import { QuizSetup } from './QuizSetup';
import { DongBaStall } from './worldgames/DongBaStall';
import { LibrarySearch } from './worldgames/LibrarySearch';
import { ThienMuReview } from './worldgames/ThienMuReview';
import { ConHenStall } from './worldgames/ConHenStall';
import { DragonBoat } from './worldgames/DragonBoat';
import { NguBinhClimb } from './worldgames/NguBinhClimb';
import { KhaiDinhTomb } from './worldgames/KhaiDinhTomb';
import { AnHienHome } from './worldgames/AnHienHome';
import { VanMieuStele } from './worldgames/VanMieuStele';
import { DuyetThiDuong } from './worldgames/DuyetThiDuong';
import { useWordSearch } from '../hooks/useWordSearch';
import { QuizArena } from './worldgames/QuizArena';
import { SkillMenu } from './worldgames/SkillMenu';

// The world pulls in Phaser (~1 MB) — only load it when the page mounts.
const GameWorld = lazy(() => import('./GameWorld').then((m) => ({ default: m.GameWorld })));

/**
 * The standalone World game at /world: your buddy walks Huế to reach the
 * skills' keepers (whose menus hold every activity) and your collections
 * (stations). Enabled and configured from Settings only — visiting while off
 * bounces to Collections.
 */
export function WorldGame() {
  const intl = useIntl();
  const enabled = useGameMode((s) => s.enabled);
  const setActive = useCollections((s) => s.setActive);
  const navigate = useNavigate();
  const { stations, mine } = useWorldStations();

  // Words the in-game activities draw from: the collection you're studying, or
  // everything you have if none is active.
  const wordPool = useMemo(() => {
    const active = stations.find((s) => s.active);
    const src = active?.words.length ? active.words : stations.flatMap((s) => s.words);
    return [...new Set(src)];
  }, [stations]);

  const [preview, setPreview] = useState<{ name: string; all: string[]; sample: string[] } | null>(null);
  const [stats, setStats] = useState<{ name: string; words: string[] } | null>(null);
  const [quiz, setQuiz] = useState<{ name: string; words: string[] } | null>(null);
  // form set = the create/edit modal is open (editingId null = creating).
  const [form, setForm] = useState<{ editingId: string | null; name: string; words: string[] } | null>(null);
  // What's open over the world: a skill keeper's menu (activity null), or
  // one of its activities. Null = just the map.
  const [open, setOpen] = useState<{ skill: WorldSkill; activity: WorldActivity | null } | null>(null);
  const openSkill = (f: WorldFeature) => {
    const skill = WORLD_SKILLS.find((x) => x.id === f.id);
    if (skill) setOpen({ skill, activity: null });
  };
  const openActivity = (id: string) => {
    const found = findActivity(id);
    if (found) setOpen(found);
  };

  // Search lives in the library: the header's search (button, ⌘K, "/") opens
  // it here instead of the app's modal, and "learn it" hands the word to the
  // Đông Ba stall, which plays it next.
  useEffect(() => useWordSearch.subscribe((s, prev) => {
    if (s.openCount === prev.openCount) return;
    const found = findActivity('search');
    if (found) setOpen(found);
  }), []);
  const openStall = () => openActivity('learn');
  const learnAtDongBa = (word: string) => {
    useWordSearch.getState().requestSearch(word);
    openStall();
  };

  const study = (s: WorldStation) => {
    setActive(s.id);
    toast.success(t('world.toastStudying', { name: s.name }));
  };

  const openEdit = (s: WorldStation) => {
    const c = mine.find((x) => x.id === s.id);
    if (c) setForm({ editingId: c.id, name: c.name, words: c.words });
  };

  const share = async (s: WorldStation) => {
    try {
      const url = await useCollections.getState().shareCollection(s.id);
      await navigator.clipboard.writeText(url);
      toast.success(t('world.toastShareCopied'));
    } catch (err) {
      toast.error((err as Error).message || t('world.toastShareFailed'));
    }
  };

  const remove = async (s: WorldStation) => {
    if (!window.confirm(t('world.confirmDelete', { name: s.name }))) return;
    try {
      await useCollections.getState().deleteCollection(s.id);
      toast.success(t('world.toastDeleted', { name: s.name }));
    } catch (err) {
      toast.error((err as Error).message || t('world.toastDeleteFailed'));
    }
  };

  /** The in-world screen that plays an activity. */
  const activityScreen = (id: string) => {
    switch (id) {
      case 'learn': return <DongBaStall />;
      case 'review': return <ThienMuReview onLearnMore={openStall} />;
      case 'quizzes': return <QuizArena words={wordPool} />;
      case 'level-test': return <NguBinhClimb onStudy={openStall} />;
      case 'search': return <LibrarySearch onLearn={learnAtDongBa} />;
      case 'history': return <KhaiDinhTomb onLearn={learnAtDongBa} />;
      case 'ipa': return <DuyetThiDuong />;
      case 'speak': return <ConHenStall />;
      case 'dictation': return <DragonBoat key="dictation" initialMode="dictation" />;
      case 'comprehension': return <DragonBoat key="comprehension" initialMode="comprehension" />;
      case 'writing': return <VanMieuStele />;
      case 'buddy': return <AnHienHome />;
      default: return null;
    }
  };

  if (!enabled) return <Navigate to="/collections" replace />;

  if (quiz) {
    // Same shareable quiz engine as elsewhere — with progress recording on so
    // collection completion still tracks quiz answers.
    return <QuizSetup words={quiz.words} recordProgress onBack={() => setQuiz(null)} />;
  }

  return (
    <div className="mx-auto max-w-none px-2 sm:px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary"><FormattedMessage id="world.title" /></h1>
          <p className="text-sm text-text-muted"><FormattedMessage id="world.subtitle" /></p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          title={intl.formatMessage({ id: 'world.gameSettings' })}
          className="flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 border border-border bg-bg-card text-text-secondary hover:text-text-primary transition-all shrink-0"
        >
          <Icon icon="lucide:settings" className="text-sm" />
          <span className="hidden sm:inline"><FormattedMessage id="world.settings" /></span>
        </button>
      </div>

      <Suspense
        fallback={
          <div className="h-[440px] rounded-2xl border-2 border-border bg-bg-card flex items-center justify-center text-sm font-bold text-text-muted">
            <FormattedMessage id="world.loading" />
          </div>
        }
      >
        <GameWorld
          stations={stations}
          skills={WORLD_SKILLS}
          onOpenFeature={openSkill}
          onOpenActivity={openActivity}
          paused={open !== null}
          panel={open && {
            title: open.activity
              ? `${intl.formatMessage({ id: open.skill.nameId })} › ${intl.formatMessage({ id: open.activity.nameId })}`
              : intl.formatMessage({ id: open.skill.nameId }),
            emoji: open.activity?.emoji ?? open.skill.emoji,
            onClose: () => setOpen(null),
            // Inside an activity, step back out to the keeper's menu.
            onBack: open.activity ? () => setOpen({ skill: open.skill, activity: null }) : undefined,
            content: open.activity
              ? activityScreen(open.activity.id)
              : <SkillMenu skill={open.skill} onPick={(activity) => setOpen({ skill: open.skill, activity })} />,
          }}
          onStudy={study}
          onPreview={(s) => setPreview({ name: s.name, all: s.words, sample: sampleWords(s.words) })}
          onQuiz={(s) => setQuiz({ name: s.name, words: s.words })}
          onStats={(s) => setStats({ name: s.name, words: s.words })}
          onCreate={() => setForm({ editingId: null, name: '', words: [] })}
          onEdit={openEdit}
          onShare={share}
          onDelete={remove}
        />
      </Suspense>

      {/* Create / edit collection — a modal over the map. */}
      {form && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setForm(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-bg-card shadow-2xl p-4 max-h-[85vh] overflow-y-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
            // Keep typing (Space, arrows) away from the Phaser keyboard captures.
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-bold text-text-primary">
                <FormattedMessage id={form.editingId ? 'world.editCollection' : 'world.buildCollection'} />
              </h3>
              <button
                onClick={() => setForm(null)}
                className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
                title={intl.formatMessage({ id: 'world.close' })}
              >
                <Icon icon="lucide:x" />
              </button>
            </div>
            <CollectionForm
              editingId={form.editingId}
              initialName={form.name}
              initialWords={form.words}
              onDone={() => setForm(null)}
            />
          </div>
        </div>
      )}

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
