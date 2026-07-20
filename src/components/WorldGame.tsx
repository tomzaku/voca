import { lazy, Suspense, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCollections } from '../hooks/useCollections';
import { useGameMode } from '../hooks/useGameMode';
import { useWorldStations } from '../hooks/useWorldStations';
import { WORLD_FEATURES, type WorldFeature } from '../game/features';
import type { WorldStation } from '../game/types';
import { PreviewModal, sampleWords } from './PreviewModal';
import { CollectionForm } from './CollectionForm';
import { CollectionStats } from './CollectionStats';
import { QuizSetup } from './QuizSetup';
import { ScrambleMinigame } from './worldgames/ScrambleMinigame';
import { QuizArena } from './worldgames/QuizArena';

// The world pulls in Phaser (~1 MB) — only load it when the page mounts.
const GameWorld = lazy(() => import('./GameWorld').then((m) => ({ default: m.GameWorld })));

/** Placeholder for buildings whose in-game activity isn't built yet. */
function ComingSoon({ feature }: { feature: WorldFeature }) {
  return (
    <div className="py-6 text-center">
      <div className="text-4xl mb-3">{feature.emoji}</div>
      <p className="text-sm text-text-muted">This building's game is still under construction.</p>
    </div>
  );
}

/**
 * The standalone World game at /world: your buddy walks a village to reach the
 * app's pages (feature buildings) and your collections (stations). Enabled and
 * configured from Settings only — visiting while off bounces to Collections.
 */
export function WorldGame() {
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
  // The feature building whose page is open over the world (null = none).
  const [feature, setFeature] = useState<WorldFeature | null>(null);

  const study = (s: WorldStation) => {
    setActive(s.id);
    toast.success(`Studying “${s.name}”`);
  };

  const openEdit = (s: WorldStation) => {
    const c = mine.find((x) => x.id === s.id);
    if (c) setForm({ editingId: c.id, name: c.name, words: c.words });
  };

  const share = async (s: WorldStation) => {
    try {
      const url = await useCollections.getState().shareCollection(s.id);
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied!');
    } catch (err) {
      toast.error((err as Error).message || 'Could not share.');
    }
  };

  const remove = async (s: WorldStation) => {
    if (!window.confirm(`Delete “${s.name}”? This can't be undone.`)) return;
    try {
      await useCollections.getState().deleteCollection(s.id);
      toast.success(`Deleted “${s.name}”`);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete.');
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
          <h1 className="text-2xl font-display font-bold text-text-primary">World</h1>
          <p className="text-sm text-text-muted">Walk your buddy up to a building to open it.</p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          title="Game settings"
          className="flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 border border-border bg-bg-card text-text-secondary hover:text-text-primary transition-all shrink-0"
        >
          <Icon icon="lucide:settings" className="text-sm" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      <Suspense
        fallback={
          <div className="h-[440px] rounded-2xl border-2 border-border bg-bg-card flex items-center justify-center text-sm font-bold text-text-muted">
            Loading the world…
          </div>
        }
      >
        <GameWorld
          stations={stations}
          features={WORLD_FEATURES}
          onOpenFeature={setFeature}
          paused={feature !== null}
          panel={feature && {
            feature,
            onClose: () => setFeature(null),
            content: feature.id === 'learn' ? <ScrambleMinigame words={wordPool} />
              : feature.id === 'quizzes' ? <QuizArena words={wordPool} />
              : <ComingSoon feature={feature} />,
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
                {form.editingId ? 'Edit collection' : 'Build a new collection'}
              </h3>
              <button
                onClick={() => setForm(null)}
                className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
                title="Close"
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
