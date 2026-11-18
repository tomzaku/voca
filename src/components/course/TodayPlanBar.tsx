import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage } from 'react-intl';
import { useCourse } from '../../hooks/useCourse';
import { useDailyGoal, useWordsToday } from '../../hooks/useDailyGoal';
import { localDateString } from '../../hooks/useStreak';
import { taskHref, tasksFor, SKILL_ICON } from '../../lib/course';

/**
 * One line above the flash card: how today's plan stands, and the next
 * session to do — so the plan is in front of the learner where they study,
 * not only on a page they'd have to visit. Nothing without a course.
 */
export function TodayPlanBar() {
  const course = useCourse((s) => s.course);
  const log = useCourse((s) => s.log);
  const goal = useDailyGoal((s) => s.goal);
  const words = useWordsToday();
  if (!course) return null;

  const today = localDateString();
  const tasks = tasksFor(course, goal, today);
  const done = new Set(log[today] ?? []);
  const next = tasks.find((t) => !done.has(t.key));
  const all = words >= goal && !next;

  return (
    <div className="max-w-lg mx-auto mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-card border-2 border-border text-sm">
      <Link to="/plan" className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80">
        <Icon icon={all ? 'lucide:circle-check' : 'lucide:route'} className={`text-lg shrink-0 ${all ? 'text-accent-green' : 'text-accent-purple'}`} />
        <span className="font-bold text-text-primary truncate">
          {all
            ? <FormattedMessage id="plan.bar.allDone" />
            : <FormattedMessage id="plan.bar.status" values={{ words: Math.min(words, goal), goal, done: tasks.filter((t) => done.has(t.key)).length, total: tasks.length }} />}
        </span>
      </Link>
      {next && (
        <Link to={taskHref(next)} className="btn-3d shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-purple text-bg-primary text-xs font-bold">
          <Icon icon={SKILL_ICON[next.skill]} />
          <FormattedMessage id={next.labelId} />
        </Link>
      )}
    </div>
  );
}
