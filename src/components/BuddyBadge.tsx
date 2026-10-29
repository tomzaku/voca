import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCompanion, useWordsKnown } from '../hooks/useCompanion';
import { useGameScore } from '../hooks/useGameScore';
import { getAnimal, SKILL_THRESHOLDS, stageIndex } from '../lib/companion';
import { AnimalAvatar } from './AnimalAvatar';
import { MiniLeaderboard } from './MiniLeaderboard';

/**
 * Compact progress badge for the Learn page: the buddy, its points, and how many
 * more words unlock its next skill. Tapping it opens the Companion page. Skills
 * are gated by words learned (not points), so the bar is measured in words.
 *
 * The learner's place on the team board rides on top of it — two readings of the
 * same studying, and the two of them are the whole of "how am I doing?" while a
 * word is on screen. They lead to different pages, so the card is a container
 * with a link in each half rather than one big link.
 */
export function BuddyBadge() {
  const intl = useIntl();
  const animalId = useCompanion((s) => s.animalId);
  const name = useCompanion((s) => s.name);
  const known = useWordsKnown();
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
    <div className="w-full rounded-2xl border-2 border-border bg-bg-card tile-lip overflow-hidden">
      <MiniLeaderboard />

      <Link
        to="/companion"
        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-bg-tertiary/40 transition-colors"
        title={intl.formatMessage({ id: 'flashcard.viewCompanion' })}
      >
        <span className="w-9 h-9 shrink-0"><AnimalAvatar animalId={animalId} mood="static" stage={stageIndex(known)} size={36} /></span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 leading-none">
            <span className="text-sm font-display font-bold text-text-primary truncate">{name || a.name}</span>
            <span className="text-xs font-extrabold text-accent-cyan shrink-0"><FormattedMessage id="flashcard.points" values={{ count: points }} /></span>
          </div>

          {nextSkill ? (
            <>
              <div className="flex items-center justify-between text-[10px] text-text-muted mt-1">
                <span className="truncate"><FormattedMessage id="flashcard.nextSkill" values={{ skill: `${nextSkill.icon} ${nextSkill.name}` }} /></span>
                <span className="shrink-0 ml-2 font-bold"><FormattedMessage id="bucket.wordCount" values={{ count: remaining }} /></span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1">
                <div className="h-full rounded-full bg-accent-cyan transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <p className="text-[10px] text-text-muted mt-1"><FormattedMessage id="flashcard.allSkillsUnlocked" /></p>
          )}
        </div>
      </Link>
    </div>
  );
}
