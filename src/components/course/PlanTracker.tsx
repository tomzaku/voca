import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useCourse } from '../../hooks/useCourse';
import { useDailyGoal } from '../../hooks/useDailyGoal';
import { localDateString } from '../../hooks/useStreak';
import { tasksFor, visitMatches } from '../../lib/course';

/**
 * Ticks off today's skill tasks as the learner reaches them. Opening the page
 * is the tick — the practice pages don't report "finished" in any one shared
 * way, and a plan that only counts what it can't see would never fill up.
 * Mounted once in the app shell, so it doesn't matter how they got there.
 */
export function PlanTracker() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const tab = params.get('tab');
  const course = useCourse((s) => s.course);
  const markDone = useCourse((s) => s.markDone);
  const goal = useDailyGoal((s) => s.goal);

  useEffect(() => {
    if (!course) return;
    for (const task of tasksFor(course, goal, localDateString())) {
      if (visitMatches(task, pathname, tab)) markDone(task.key);
    }
  }, [course, goal, pathname, tab, markDone]);

  return null;
}
