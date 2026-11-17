import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage } from 'react-intl';
import { useCourse } from '../../hooks/useCourse';
import { useDailyGoal, useWordsToday } from '../../hooks/useDailyGoal';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { useCollections } from '../../hooks/useCollections';
import { localDateString } from '../../hooks/useStreak';
import { currentStage, daysBetween, daysLeft, planStages, taskHref, tasksFor, SKILL_ICON } from '../../lib/course';

/** "about 3 weeks" — days below a fortnight, weeks below ~10, months after. */
export function PlanDuration({ days }: { days: number }) {
  if (days <= 0) return <FormattedMessage id="plan.durationDone" />;
  if (days < 14) return <FormattedMessage id="plan.durationDays" values={{ n: days }} />;
  if (days < 70) return <FormattedMessage id="plan.durationWeeks" values={{ n: Math.round(days / 7) }} />;
  return <FormattedMessage id="plan.durationMonths" values={{ n: Math.round(days / 30) }} />;
}

/**
 * The learner's course at a glance: where they're headed, the word bands on
 * the way with how much of each they've seen, and today's to-do — the day's
 * words plus the skill sessions the course rotates through. Without a course,
 * an invitation to pick one.
 */
export function PlanCard() {
  const course = useCourse((s) => s.course);
  const done = useCourse((s) => s.done);
  const goal = useDailyGoal((s) => s.goal);
  const wordsToday = useWordsToday();
  const progress = useVocabularyStore((s) => s.progress);
  const setActive = useCollections((s) => s.setActive);
  const navigate = useNavigate();

  if (!course) {
    return (
      <Link to="/plan" className="card-game border-accent-purple p-5 flex items-center gap-4 hover:brightness-105">
        <Icon icon="lucide:route" className="text-3xl text-accent-purple shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-text-primary"><FormattedMessage id="plan.none.title" /></span>
          <span className="block text-sm text-text-muted"><FormattedMessage id="plan.none.hint" /></span>
        </span>
        <Icon icon="lucide:chevron-right" className="text-xl text-text-muted" />
      </Link>
    );
  }

  const today = localDateString();
  const stages = planStages(course, progress);
  const stage = currentStage(stages);
  const tasks = tasksFor(course, goal, today);
  const doneToday = new Set(done.day === today ? done.keys : []);
  const day = daysBetween(course.startedOn, today) + 1;
  const studyStage = () => { setActive(stage.collectionId); navigate('/'); };

  return (
    <section className="card-game border-accent-purple p-5 sm:p-6 flex flex-col gap-5">
      <header className="flex items-start gap-3">
        <Icon icon={course.id === 'ielts' ? 'lucide:graduation-cap' : 'lucide:messages-square'} className="text-3xl text-accent-purple shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-display font-bold text-text-primary">
            {course.id === 'ielts'
              ? <FormattedMessage id="plan.ieltsTitle" values={{ band: course.band }} />
              : <FormattedMessage id="course.everyday.name" />}
          </h2>
          <p className="text-sm text-text-muted">
            <FormattedMessage id="plan.dayOf" values={{ day }} />
            {' · '}
            <PlanDuration days={daysLeft(stages, goal)} />
          </p>
        </div>
        <Link to="/plan?edit=1" className="text-xs font-bold text-text-muted hover:text-text-primary shrink-0">
          <FormattedMessage id="plan.change" />
        </Link>
      </header>

      {/* The bands on the way, each filling as its words are seen. */}
      <div className="flex gap-2">
        {stages.map((s) => {
          const pct = s.total ? Math.round((s.seen / s.total) * 100) : 0;
          const here = s === stage;
          return (
            <div key={s.cefr} className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between text-xs font-bold mb-1">
                <span className={here ? 'text-accent-purple' : 'text-text-muted'}>{s.cefr}</span>
                <span className="text-text-muted tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                <div className={`h-full rounded-full ${here ? 'bg-accent-purple' : 'bg-accent-green'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
          <FormattedMessage id="plan.today" />
        </p>
        <ul className="flex flex-col gap-2">
          <li>
            <button onClick={studyStage} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-hover text-left">
              <Check done={wordsToday >= goal} />
              <span className="flex-1 min-w-0 text-sm font-bold text-text-primary">
                <FormattedMessage id="plan.wordsAt" values={{ n: goal, level: stage.cefr }} />
              </span>
              <span className="text-xs font-bold text-text-muted tabular-nums">{Math.min(wordsToday, goal)}/{goal}</span>
            </button>
          </li>
          {tasks.map((t) => (
            <li key={t.key}>
              <Link to={taskHref(t)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-hover">
                <Check done={doneToday.has(t.key)} />
                <span className="flex-1 min-w-0 text-sm font-bold text-text-primary"><FormattedMessage id={t.labelId} /></span>
                <Icon icon={SKILL_ICON[t.skill]} className="text-lg text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Check({ done }: { done: boolean }) {
  return done
    ? <Icon icon="lucide:circle-check" className="text-xl text-accent-green shrink-0" />
    : <Icon icon="lucide:circle" className="text-xl text-text-muted shrink-0" />;
}
