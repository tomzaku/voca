import { Link } from 'react-router-dom';
import { useCompanion } from '../hooks/useCompanion';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useGameScore } from '../hooks/useGameScore';
import { getAnimal, SKILL_THRESHOLDS, stageIndex } from '../lib/companion';
import { AnimalAvatar } from './AnimalAvatar';

/**
 * Compact progress badge for the Learn page: the buddy, its points, and how many
 * more words unlock its next skill. Tapping it opens the Companion page. Skills
 * are gated by words learned (not points), so the bar is measured in words.
 */
export function BuddyBadge() {
  const animalId = useCompanion((s) => s.animalId);
  const name = useCompanion((s) => s.name);
  const known = useVocabularyStore(
    (s) => Object.values(s.progress).filter((e) => e.status === 'known').length,
  );
  const points = useGameScore((s) => s.points);

  if (!animalId) return null;
  const a = getAnimal(animalId);

  const nextIdx = SKILL_THRESHOLDS.findIndex((t) => known < t);
  const nextSkill = nextIdx >= 0 ? a.skills[nextIdx] : null;
  const nextAt = nextIdx >= 0 ? SKILL_THRESHOLDS[nextIdx] : 0;
  const prevAt = nextIdx > 0 ? SKILL_THRESHOLDS[nextIdx - 1] : 0;
  const remaining = nextSkill ? nextAt - known : 0;
  const progress = nextSkill ? Math.round(((known - prevAt) / (nextAt - prevAt)) * 100) : 100;

  return (
    <Link
      to="/companion"
      className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 border-border bg-bg-card tile-lip hover:border-border-light hover:-translate-y-0.5 transition-all"
      title="View your companion"
    >
      <span className="w-9 h-9 shrink-0"><AnimalAvatar animalId={animalId} mood="static" stage={stageIndex(known)} size={36} /></span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 leading-none">
          <span className="text-sm font-display font-bold text-text-primary truncate">{name || a.name}</span>
          <span className="text-xs font-extrabold text-accent-cyan shrink-0">{points} pts</span>
        </div>

        {nextSkill ? (
          <>
            <div className="flex items-center justify-between text-[10px] text-text-muted mt-1">
              <span className="truncate">Next: {nextSkill.icon} {nextSkill.name}</span>
              <span className="shrink-0 ml-2 font-bold">{remaining} word{remaining === 1 ? '' : 's'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1">
              <div className="h-full rounded-full bg-accent-cyan transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <p className="text-[10px] text-text-muted mt-1">All skills unlocked ✨</p>
        )}
      </div>
    </Link>
  );
}
