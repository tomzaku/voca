import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useDailyGoal } from '../../hooks/useDailyGoal';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { localDateString } from '../../hooks/useStreak';
import { paceWeeks, planStages, planWeeks, SKILL_ICON, type CourseChoice, type PlanWeek } from '../../lib/course';

/**
 * The whole course, start to finish: each word band a section, each section
 * its weeks — which slice of words, which practice sessions, and when. Done
 * weeks are ticked, this week is open, the rest are dated from today at the
 * learner's pace. Bands other than the current one start folded, since a long
 * course runs to dozens of weeks.
 */
export function PlanCourse({ course }: { course: CourseChoice }) {
  const goal = useDailyGoal((s) => s.goal);
  const progress = useVocabularyStore((s) => s.progress);
  const today = localDateString();
  const weeks = useMemo(
    () => planWeeks(course, planStages(course, progress), goal, today),
    [course, progress, goal, today],
  );
  const pace = paceWeeks(course, weeks, today);
  const currentStage = weeks.find((w) => w.status === 'current')?.stage ?? weeks[weeks.length - 1]?.stage;
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentStage ? [currentStage] : []));

  const byStage = useMemo(() => {
    const map = new Map<string, PlanWeek[]>();
    for (const w of weeks) map.set(w.stage, [...(map.get(w.stage) ?? []), w]);
    return [...map];
  }, [weeks]);

  const toggle = (stage: string) => setOpen((s) => {
    const next = new Set(s);
    if (next.has(stage)) next.delete(stage); else next.add(stage);
    return next;
  });

  return (
    <section className="card-game border-border p-4 sm:p-5">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-display font-bold text-text-primary">
          <FormattedMessage id="plan.course.title" values={{ weeks: weeks.length }} />
        </h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          pace < 0 ? 'bg-accent-orange/15 text-accent-orange' : 'bg-accent-green/15 text-accent-green'
        }`}>
          {pace < 0
            ? <FormattedMessage id="plan.course.behind" values={{ n: -pace }} />
            : pace > 0
              ? <FormattedMessage id="plan.course.ahead" values={{ n: pace }} />
              : <FormattedMessage id="plan.course.onTrack" />}
        </span>
      </header>

      <div className="flex flex-col gap-2">
        {byStage.map(([stage, list]) => {
          const done = list.filter((w) => w.status === 'done').length;
          const isOpen = open.has(stage);
          return (
            <div key={stage} className="rounded-xl bg-bg-tertiary/60">
              <button onClick={() => toggle(stage)} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                <span className="text-sm font-display font-bold text-accent-purple w-7">{stage}</span>
                <span className="flex-1 text-sm font-bold text-text-primary">
                  <FormattedMessage id="plan.course.stage" values={{ words: list[list.length - 1].to, weeks: list.length }} />
                </span>
                <span className="text-xs font-bold text-text-muted tabular-nums">{done}/{list.length}</span>
                <Icon icon={isOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="text-text-muted" />
              </button>
              {isOpen && (
                <ol className="px-2 pb-2 flex flex-col gap-1">
                  {list.map((w) => <WeekRow key={w.index} week={w} />)}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeekRow({ week }: { week: PlanWeek }) {
  const intl = useIntl();
  const size = week.to - week.from + 1;
  const pct = Math.round((week.seen / size) * 100);
  const current = week.status === 'current';
  return (
    <li className={`rounded-lg px-2.5 py-2 ${current ? 'bg-bg-card ring-2 ring-accent-purple' : ''}`}>
      <div className="flex items-center gap-2">
        <Icon
          icon={week.status === 'done' ? 'lucide:circle-check' : current ? 'lucide:circle-dot' : 'lucide:circle'}
          className={`shrink-0 ${week.status === 'done' ? 'text-accent-green' : current ? 'text-accent-purple' : 'text-text-muted'}`}
        />
        <span className="text-xs font-bold text-text-primary">
          <FormattedMessage id="plan.course.week" values={{ n: week.index + 1 }} />
        </span>
        <span className="text-xs text-text-muted">
          {current
            ? <FormattedMessage id="plan.course.thisWeek" />
            : intl.formatDate(new Date(`${week.start}T00:00:00`), { day: 'numeric', month: 'short' })}
        </span>
        <span className="flex-1" />
        <span className="flex items-center gap-1.5">
          {week.tasks.map(({ task, count }) => (
            <span key={task.key} title={intl.formatMessage({ id: task.labelId })} className="flex items-center text-[10px] font-bold text-text-muted">
              <Icon icon={SKILL_ICON[task.skill]} className="text-xs" />
              {count > 1 && <span>×{count}</span>}
            </span>
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1 pl-6">
        <span className="text-[11px] text-text-muted tabular-nums shrink-0">
          <FormattedMessage id="plan.course.words" values={{ from: week.from, to: week.to }} />
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
          <div className={`h-full rounded-full ${week.status === 'done' ? 'bg-accent-green' : 'bg-accent-purple'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </li>
  );
}
