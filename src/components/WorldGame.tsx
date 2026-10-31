import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { t } from '../i18n';
import { hasChosenCollection, useCollections } from '../hooks/useCollections';
import { useGameMode } from '../hooks/useGameMode';
import { useWorldStations } from '../hooks/useWorldStations';
import { onAnswerEvent } from '../lib/answerEvents';
import type { Recap } from '../lib/keeperAdvice';
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
import { SkillToolbar } from './worldgames/SkillMenu';
import { useCompanion } from '../hooks/useCompanion';
import { DEFAULT_LOOK, type Look } from '../game/wardrobe';
import { KEEPERS } from './worldgames/keepers';
import { KeeperMenu, KeeperTalk } from './worldgames/KeeperTalk';
import { CollectionsHall } from './worldgames/CollectionsHall';
import { WorldLoading } from './worldgames/WorldLoading';

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
  // The collections' keeper's list, when it's open (`focus`, a collection to
  // open it on). Only one of `open` and `hall` is ever set.
  const [hall, setHall] = useState<{ focus: string | null } | null>(null);
  // The keeper talking — on coming back from an activity, with how it went.
  // Walking in goes straight to their menu. "Something else" (or picking an
  // activity) hushes them.
  const [talk, setTalk] = useState<{ recap?: Recap } | null>(null);
  const openSkill = (f: WorldFeature) => {
    if (f.id === COLLECTIONS_KEEPER.id) { setOpen(null); setHall({ focus: null }); return; }
    const skill = WORLD_SKILLS.find((x) => x.id === f.id);
    if (skill) { setHall(null); setOpen({ skill, activity: null }); setTalk(null); }
  };
  // Your portrait: straight to An Hiên's menu — clothes and buddy.
  const openProfile = () => {
    const skill = WORLD_SKILLS.find((x) => x.id === 'you');
    if (skill) { setHall(null); setOpen({ skill, activity: null }); setTalk(null); }
  };
  const openActivity = (id: string) => {
    const found = findActivity(id);
    if (found) { setHall(null); setOpen(found); setTalk(null); }
  };

  // Answers given in the activity open now, for the keeper's recap.
  const tally = useRef<Recap>({ right: 0, total: 0 });
  const activityId = open?.activity?.id;
  useEffect(() => {
    if (!activityId) return;
    tally.current = { right: 0, total: 0, from: activityId };
    return onAnswerEvent((e) => {
      if (e.kind === 'correct') tally.current = { ...tally.current, right: tally.current.right + 1, total: tally.current.total + 1 };
      else if (e.kind === 'wrong') tally.current = { ...tally.current, total: tally.current.total + 1 };
    });
  }, [activityId]);

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
  // archive's word desk, which plays it next.
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
  /** The skill's keeper talking: their advice when you walk in, and how the
   *  last activity went when you come back. */
  const keeperTalk = (skill: WorldSkill) => {
    const keeper = KEEPERS[skill.id];
    if (!keeper || !talk) return null;
    return (
      <KeeperTalk
        key={skill.id}
        keeper={keeper}
        look={keeperLookFor(WORLD_SKILLS.findIndex((s) => s.id === skill.id))}
        recap={talk.recap}
        onAction={openActivity}
        onOther={() => setTalk(null)}
      />
    );
  };

  /** What the activities' screens take from the world (./worldgames/world.ts). */
  const world: WorldApi = {
    wordPool,
    openActivity,
    learnWord: learnAtDongBa,
    chosen,
    activeCollection: active ? { name: active.name, pct: active.pct } : null,
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
    // Full-screen: the world is the page (App hides the header and rail
    // here); its own menu, in the status bar, leads back to the app.
    <div className="relative">
      <WorldContext.Provider value={world}>
        <Suspense fallback={<div className="relative h-screen"><WorldLoading /></div>}>
          <GameWorld
            skills={WORLD_SKILLS}
            onOpenFeature={openSkill}
            onOpenProfile={openProfile}
            onOpenActivity={openActivity}
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
              talking: open.activity?.id === 'wardrobe' || (!open.activity && !!KEEPERS[open.skill.id] && talk !== null),
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
                  <KeeperMenu
                    key={open.skill.id}
                    keeper={KEEPERS[open.skill.id]}
                    skill={open.skill}
                    onPick={(activity) => setOpen({ skill: open.skill, activity })}
                  />
                ),
            }}
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
