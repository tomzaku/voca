import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { t } from '../i18n';
import { hasChosenCollection, useCollections } from '../hooks/useCollections';
import { useGameMode } from '../hooks/useGameMode';
import { useWorldStations } from '../hooks/useWorldStations';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { dueWords } from '../lib/spacedRepetition';
import { onAnswerEvent } from '../lib/answerEvents';
import { vocabularyAdvice } from '../lib/keeperAdvice';
import { keeperLookFor } from '../game/textures';
import { COLLECTIONS_KEEPER, type WorldActivity, type WorldFeature, type WorldSkill } from '../game/features';
import { WORLD_SKILLS, findActivity } from './worldgames/registry';
import { WorldContext, type WorldApi } from './worldgames/world';
import type { WorldStation } from '../game/types';
import { PreviewModal, sampleWords } from './PreviewModal';
import { CollectionForm } from './CollectionForm';
import { CollectionStats } from './CollectionStats';
import { QuizSetup } from './QuizSetup';
import { useWordSearch } from '../hooks/useWordSearch';
import { SkillMenu, SkillToolbar } from './worldgames/SkillMenu';
import { useCompanion } from '../hooks/useCompanion';
import { DEFAULT_LOOK, type Look } from '../game/wardrobe';
import { KeeperDialog } from './worldgames/KeeperDialog';
import { CollectionsHall } from './worldgames/CollectionsHall';

// The world pulls in Phaser (~1 MB) — only load it when the page mounts.
const GameWorld = lazy(() => import('./GameWorld').then((m) => ({ default: m.GameWorld })));

/**
 * The standalone World game at /world: your buddy walks Huế to reach the
 * skills' keepers (whose menus hold every activity) and the collections'
 * keeper (whose list holds every collection and level). Enabled and configured from Settings only — visiting while off
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
  // A learner's first time in the world begins at the tailor's.
  const [open, setOpen] = useState<{ skill: WorldSkill; activity: WorldActivity | null } | null>(
    () => (useCompanion.getState().dress === null ? findActivity('wardrobe') : null),
  );
  // The collections' keeper's list, open on a collection when one was picked
  // from the travel drawer. Only one of `open` and `hall` is ever set.
  const [hall, setHall] = useState<{ focus: string | null } | null>(null);
  // The keeper talking — on walking in, and on coming back from an activity
  // with how it went. "Something else" (or picking an activity) hushes them.
  const [talk, setTalk] = useState<{ recap?: { right: number; total: number } } | null>(null);
  const openSkill = (f: WorldFeature) => {
    if (f.id === COLLECTIONS_KEEPER.id) { setOpen(null); setHall({ focus: null }); return; }
    const skill = WORLD_SKILLS.find((x) => x.id === f.id);
    if (skill) { setHall(null); setOpen({ skill, activity: null }); setTalk({}); }
  };
  const openActivity = (id: string) => {
    const found = findActivity(id);
    if (found) { setHall(null); setOpen(found); setTalk(null); }
  };

  // Answers given in the activity open now, for the keeper's recap.
  const tally = useRef({ right: 0, total: 0 });
  const activityId = open?.activity?.id;
  useEffect(() => {
    if (!activityId) return;
    tally.current = { right: 0, total: 0 };
    return onAnswerEvent((e) => {
      if (e.kind === 'correct') tally.current = { right: tally.current.right + 1, total: tally.current.total + 1 };
      else if (e.kind === 'wrong') tally.current = { ...tally.current, total: tally.current.total + 1 };
    });
  }, [activityId]);
  const openCollection = (id: string) => { setOpen(null); setHall({ focus: id }); };

  // The tailor's: what the buddy wears (null until the first visit, which is
  // where the world starts), and what's being tried on.
  const dress = useCompanion((s) => s.dress);
  const setDress = useCompanion((s) => s.setDress);
  const buddyName = useCompanion((s) => s.name);
  const rename = useCompanion((s) => s.rename);
  const [trying, setTrying] = useState<Look | null>(null);
  const firstVisit = dress === null;
  const leaveTailor = (look: Look) => { setDress(look); setTrying(null); setOpen(null); };

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

  // The collections list — the collections' keeper's, and Vocabulary's
  // "Collections" activity, so a list can be picked without leaving the skill.
  const collectionsHall = (focus: string | null, prompt?: string) => (
    <CollectionsHall
      stations={stations}
      focusId={focus}
      prompt={prompt}
      onStudy={study}
      onPreview={(s) => setPreview({ name: s.name, all: s.words, sample: sampleWords(s.words) })}
      onQuiz={(s) => setQuiz({ name: s.name, words: s.words })}
      onStats={(s) => setStats({ name: s.name, words: s.words })}
      onCreate={() => setForm({ editingId: null, name: '', words: [] })}
      onEdit={openEdit}
      onShare={share}
      onDelete={remove}
    />
  );

  const chosen = hasChosenCollection();
  const active = stations.find((s) => s.active);
  const activeName = active?.name;
  const progress = useVocabularyStore((s) => s.progress);
  const due = useMemo(() => dueWords(progress).length, [progress]);

  /** The keeper's line and suggestion, for skills whose keeper has one. */
  const keeperTalk = (skill: WorldSkill) => {
    if (skill.id !== 'vocabulary' || !talk) return null;
    const advice = vocabularyAdvice({
      chosen, due, recap: talk.recap,
      collection: active && { name: active.name, pct: active.pct },
    });
    const line = [
      advice.recapId && intl.formatMessage({ id: advice.recapId }, advice.values),
      intl.formatMessage({ id: advice.lineId }, advice.values),
    ].filter(Boolean).join(' ');
    return (
      <KeeperDialog
        look={keeperLookFor(WORLD_SKILLS.indexOf(skill))}
        name={<FormattedMessage id="world.keeperVocabulary" />}
        line={line}
        primary={<FormattedMessage id={advice.actionId} />}
        onPrimary={() => openActivity(advice.action)}
        secondary={<FormattedMessage id="world.kvOther" />}
        onSecondary={() => setTalk(null)}
      />
    );
  };
  /** Where you stand in each Vocabulary activity, on its menu card. */
  const badges = {
    review: due > 0 ? intl.formatMessage({ id: 'world.badgeDue' }, { count: due }) : undefined,
    learn: active ? `${active.name} · ${active.pct}%` : undefined,
  };

  /** What the activities' screens take from the world (./worldgames/world.ts). */
  const world: WorldApi = {
    wordPool,
    openActivity,
    learnWord: learnAtDongBa,
    chosen,
    collectionsHall,
    tailor: {
      initial: dress ?? DEFAULT_LOOK,
      firstVisit,
      name: buddyName,
      rename,
      tryOn: setTrying,
      done: leaveTailor,
    },
  };
  /** The screen that plays an activity — its own file declares it. */
  const activityScreen = (id: string) => {
    const Screen = findActivity(id)?.activity.Screen;
    return Screen ? <Screen /> : null;
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

      <WorldContext.Provider value={world}>
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
            onOpenCollection={openCollection}
            paused={open !== null || hall !== null}
            panel={hall ? {
              title: intl.formatMessage({ id: COLLECTIONS_KEEPER.nameId }),
              emoji: COLLECTIONS_KEEPER.emoji,
              onClose: () => setHall(null),
              content: collectionsHall(hall.focus),
            } : open && {
              title: open.activity
                ? `${intl.formatMessage({ id: open.skill.nameId })} › ${intl.formatMessage({ id: open.activity.nameId })}`
                : intl.formatMessage({ id: open.skill.nameId }),
              emoji: open.activity?.emoji ?? open.skill.emoji,
              // Leaving the tailor's on a first visit keeps what you have on, so
              // the shop doesn't greet you again next time.
              onClose: () => (open.activity?.id === 'wardrobe' && firstVisit ? leaveTailor(trying ?? DEFAULT_LOOK) : setOpen(null)),
              // Inside an activity, step back out to the keeper, who says how it went.
              onBack: open.activity ? () => { setOpen({ skill: open.skill, activity: null }); setTalk({ recap: tally.current }); } : undefined,
              room: open.activity?.id === 'wardrobe' ? 'tailor' : open.skill.id,
              dress: open.activity?.id === 'wardrobe' ? trying ?? dress ?? DEFAULT_LOOK : undefined,
              // The keeper's speech bubble while they talk: their message box,
              // or the tailor fitting you.
              talking: open.activity?.id === 'wardrobe' || (!open.activity && open.skill.id === 'vocabulary' && talk !== null),
              tools: (
                <SkillToolbar
                  skill={open.skill}
                  current={open.activity?.id}
                  // Collections names the list you're studying, and asks for
                  // one until you've picked.
                  labels={chosen && activeName ? { collections: activeName } : {}}
                  attention={chosen ? undefined : 'collections'}
                  onPick={(activity) => { setOpen({ skill: open.skill, activity }); setTalk(null); }}
                />
              ),
              content: open.activity
                ? activityScreen(open.activity.id)
                : keeperTalk(open.skill) ?? (
                  <SkillMenu
                    skill={open.skill}
                    badges={open.skill.id === 'vocabulary' ? badges : undefined}
                    onPick={(activity) => setOpen({ skill: open.skill, activity })}
                  />
                ),
            }}
            onCreate={() => setForm({ editingId: null, name: '', words: [] })}
          />
        </Suspense>
      </WorldContext.Provider>

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
