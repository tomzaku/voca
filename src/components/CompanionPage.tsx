import { lazy, Suspense, useEffect, useState } from 'react';
import { useCompanion } from '../hooks/useCompanion';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useGameScore } from '../hooks/useGameScore';
import { AnimalAvatar } from './AnimalAvatar';
import {
  ANIMALS,
  getAnimal,
  STAGES,
  SKILL_THRESHOLDS,
  stageIndex,
  nextStage,
  type AnimalId,
} from '../lib/companion';

// SVG motion per skill index (0–4), defined in index.css. Paired with a Lottie
// effect burst (SkillFx) overlaid on top for richer, non-trivial previews.
const PREVIEW_ANIMS = ['companion-pounce', 'companion-spin', 'companion-wiggle', 'companion-pop', 'companion-float'];

// Lazy so lottie-react + the clips only load on the first skill preview.
const SkillFx = lazy(() => import('./SkillFx'));

export function CompanionPage() {
  const { animalId, name, choose, rename } = useCompanion();
  const known = useVocabularyStore(
    (s) => Object.values(s.progress).filter((e) => e.status === 'known').length,
  );
  const [picking, setPicking] = useState(false);

  if (!animalId || picking) {
    return (
      <Picker
        current={animalId}
        onPick={(id) => { choose(id); setPicking(false); }}
        onCancel={animalId ? () => setPicking(false) : undefined}
      />
    );
  }

  return (
    <Companion
      animalId={animalId}
      name={name}
      known={known}
      onRename={rename}
      onChange={() => setPicking(true)}
    />
  );
}

// ─── Picker ─────────────────────────────────────────────────────────

function Picker({ current, onPick, onCancel }: {
  current: AnimalId | null;
  onPick: (id: AnimalId) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-1">Choose your companion</h1>
      <p className="text-sm text-text-muted mb-6">
        It grows and learns tricks as you master more words. Pick the one whose style fits you.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {ANIMALS.map((a) => {
          const active = current === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onPick(a.id)}
              className={`flex flex-col items-center text-center rounded-2xl border-[3px] p-4 transition-all tile-lip hover:-translate-y-0.5 ${
                active ? 'border-accent-cyan bg-accent-cyan/10' : 'border-border bg-bg-card hover:border-border-light'
              }`}
            >
              <div
                className="rounded-full mb-2"
                style={{ background: `radial-gradient(circle at 50% 40%, ${a.colors.belly}, transparent 70%)` }}
              >
                <AnimalAvatar animalId={a.id} stage={2} size={92} />
              </div>
              <span className="font-display font-extrabold text-text-primary">{a.name}</span>
              <span className="text-xs text-text-muted mb-2">{a.tagline}</span>
              <span className="text-[11px] font-bold text-accent-cyan">{a.perkTitle}</span>
              <span className="text-[11px] text-text-muted leading-tight mt-0.5">{a.perkDesc}</span>
            </button>
          );
        })}
      </div>

      {onCancel && (
        <button onClick={onCancel} className="mt-5 w-full text-xs font-bold text-text-muted hover:text-text-primary">
          Cancel
        </button>
      )}
    </div>
  );
}

// ─── Companion view ─────────────────────────────────────────────────

function Companion({ animalId, name, known, onRename, onChange }: {
  animalId: AnimalId;
  name: string;
  known: number;
  onRename: (n: string) => void;
  onChange: () => void;
}) {
  const a = getAnimal(animalId);
  const { points, best, winId } = useGameScore();
  const idx = stageIndex(known);
  const stage = STAGES[idx];
  const next = nextStage(known);

  // Bounce with joy on every game win.
  const [mood, setMood] = useState<'idle' | 'happy'>('idle');
  useEffect(() => {
    if (winId === 0) return;
    setMood('happy');
    const t = setTimeout(() => setMood('idle'), 800);
    return () => clearTimeout(t);
  }, [winId]);

  // Preview a skill: bounce the SVG avatar (per-skill CSS motion) AND burst a
  // Lottie effect over it. `id` bumps each click so both replay.
  const [preview, setPreview] = useState<{ i: number; id: number } | null>(null);
  useEffect(() => {
    if (!preview) return;
    const t = setTimeout(() => setPreview(null), 1600);
    return () => clearTimeout(t);
  }, [preview]);
  const doPreview = (i: number) => setPreview((p) => ({ i, id: (p?.id ?? 0) + 1 }));

  const toNext = next ? next.min - known : 0;
  const progress = next
    ? Math.min(100, Math.round(((known - stage.min) / (next.min - stage.min)) * 100))
    : 100;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Avatar */}
      <div className="flex flex-col items-center text-center">
        <div
          className="relative rounded-full mb-3"
          style={{ background: `radial-gradient(circle at 50% 42%, ${a.colors.belly}, transparent 68%)` }}
        >
          <AnimalAvatar
            key={preview?.id ?? 'idle'}
            animalId={animalId}
            stage={idx}
            mood={mood}
            anim={preview ? PREVIEW_ANIMS[preview.i % PREVIEW_ANIMS.length] : undefined}
            size={180}
          />
          {preview && (
            <Suspense fallback={null}>
              <SkillFx key={preview.id} index={preview.i} />
            </Suspense>
          )}
        </div>

        <input
          value={name}
          onChange={(e) => onRename(e.target.value)}
          placeholder={`Name your ${a.name.toLowerCase()}`}
          className="text-center text-xl font-display font-bold text-text-primary bg-transparent border-b-2 border-transparent hover:border-border focus:border-accent-cyan focus:outline-none px-2 py-0.5 max-w-[16rem]"
        />
        <div className="mt-1.5 flex items-center gap-2 text-sm">
          <span className="text-text-muted">{a.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan text-xs font-bold">
            {stage.name}
          </span>
        </div>
      </div>

      {/* Growth bar */}
      <div className="mt-6">
        <div className="flex justify-between text-xs font-bold text-text-muted mb-1.5">
          <span>{stage.name}</span>
          <span>{next ? `${toNext} word${toNext === 1 ? '' : 's'} to ${next.name}` : 'Fully grown ✨'}</span>
        </div>
        <div className="h-3 rounded-full bg-bg-tertiary overflow-hidden border border-border">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${a.colors.secondary}, ${a.colors.primary})` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mt-6">
        <Stat label="Words learned" value={known} />
        <Stat label="Points" value={points} />
        <Stat label="Best streak" value={best} />
      </div>

      {/* Perk */}
      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl border border-border bg-bg-card">
        <span className="text-2xl">{a.emoji}</span>
        <div>
          <p className="text-sm font-bold text-text-primary">{a.perkTitle}</p>
          <p className="text-xs text-text-muted">{a.perkDesc}</p>
        </div>
      </div>

      {/* Skill tree */}
      <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mt-8 mb-3">Skills</h2>
      <div className="space-y-2">
        {a.skills.map((skill, i) => {
          const need = SKILL_THRESHOLDS[i];
          const unlocked = known >= need;
          return (
            <div
              key={skill.name}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                unlocked ? 'border-accent-cyan/30 bg-accent-cyan/5' : 'border-border bg-bg-tertiary opacity-70'
              }`}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xl bg-bg-card">
                <span className={unlocked ? '' : 'grayscale opacity-60'}>{skill.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${unlocked ? 'text-text-primary' : 'text-text-muted'}`}>{skill.name}</span>
                  {unlocked ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-cyan">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-muted">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                      {need} words
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted leading-snug mt-0.5">{skill.desc}</p>
              </div>
              <button
                onClick={() => doPreview(i)}
                title={`Preview ${skill.name}`}
                className="shrink-0 self-center flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-bg-card text-xs font-bold text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/40 transition-all"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                Preview
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onChange} className="mt-8 w-full text-xs font-bold text-text-muted hover:text-text-primary">
        Change companion
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3 text-center">
      <div className="text-xl font-display font-extrabold text-text-primary">{value}</div>
      <div className="text-[11px] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}
