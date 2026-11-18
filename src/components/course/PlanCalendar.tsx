import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCourse } from '../../hooks/useCourse';
import { useActivity } from '../../hooks/useActivity';
import { useDailyGoal } from '../../hooks/useDailyGoal';
import { localDateString } from '../../hooks/useStreak';
import { addDays, daysBetween, taskHref, tasksFor, SKILL_ICON, type CourseChoice } from '../../lib/course';

/** Sunday-first, like the dashboard's calendar. 4 Jan 2026 is a Sunday. */
const WEEK_DATES = Array.from({ length: 7 }, (_, i) => new Date(2026, 0, 4 + i));

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * The plan on a calendar. Looking back, each day shows what was actually done
 * — words answered and the sessions ticked off; looking ahead, what the plan
 * has scheduled. Tap a day for the detail: the words themselves, or what's
 * coming.
 */
export function PlanCalendar({ course }: { course: CourseChoice }) {
  const intl = useIntl();
  const today = localDateString();
  const goal = useDailyGoal((s) => s.goal);
  const log = useCourse((s) => s.log);
  const ensureDays = useCourse((s) => s.ensureDays);
  const events = useActivity((s) => s.events);
  const ensureActivity = useActivity((s) => s.ensure);

  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(today);

  // The six-week grid around this month.
  const cells = useMemo(() => {
    const first = new Date(month);
    first.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return { key: ymd(d), date: d.getDate(), inMonth: d.getMonth() === month.getMonth() };
    });
  }, [month]);

  const gridFrom = cells[0].key;
  const gridTo = cells[cells.length - 1].key;
  useEffect(() => {
    const to = gridTo < today ? gridTo : today;
    if (gridFrom > today) return;
    void ensureDays(gridFrom, to);
    void ensureActivity(new Date(`${gridFrom}T00:00:00`).getTime());
  }, [gridFrom, gridTo, today, ensureDays, ensureActivity]);

  /** Local day → the distinct words answered on it. */
  const wordsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ev of events) {
      const day = localDateString(new Date(ev.at));
      const list = map.get(day) ?? [];
      const w = ev.word.toLowerCase();
      if (!list.includes(w)) list.push(w);
      map.set(day, list);
    }
    return map;
  }, [events]);

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const inCourse = (day: string) => daysBetween(course.startedOn, day) >= 0;

  return (
    <section className="card-game border-border p-4 sm:p-5">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-base font-display font-bold text-text-primary">
          {intl.formatDate(month, { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-1">
          <button onClick={() => shift(-1)} aria-label={intl.formatMessage({ id: 'plan.cal.prev' })} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted">
            <Icon icon="lucide:chevron-left" />
          </button>
          <button onClick={() => shift(1)} aria-label={intl.formatMessage({ id: 'plan.cal.next' })} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted">
            <Icon icon="lucide:chevron-right" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-text-muted mb-1">
        {WEEK_DATES.map((d) => <span key={d.getDay()}>{intl.formatDate(d, { weekday: 'narrow' })}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const past = c.key < today;
          const isToday = c.key === today;
          const planned = inCourse(c.key) ? tasksFor(course, goal, c.key) : [];
          const doneKeys = new Set(log[c.key] ?? []);
          const words = wordsByDay.get(c.key)?.length ?? 0;
          const allDone = planned.length > 0 && planned.every((t) => doneKeys.has(t.key)) && words >= goal;
          return (
            <button
              key={c.key}
              onClick={() => setSelected(c.key)}
              aria-pressed={selected === c.key}
              className={`relative min-h-14 rounded-lg p-1 flex flex-col items-center gap-0.5 transition-colors ${
                selected === c.key ? 'bg-accent-purple/15 ring-2 ring-accent-purple' : 'hover:bg-bg-hover'
              } ${c.inMonth ? '' : 'opacity-40'}`}
            >
              <span className={`text-xs font-bold tabular-nums ${isToday ? 'px-1.5 rounded-full bg-accent-purple text-bg-primary' : 'text-text-primary'}`}>
                {c.date}
              </span>
              {(past || isToday) && words > 0 && (
                <span className="text-[10px] font-bold text-accent-cyan tabular-nums leading-none">{words}</span>
              )}
              <span className="flex gap-0.5">
                {planned.map((t) => (
                  <Icon
                    key={t.key}
                    icon={SKILL_ICON[t.skill]}
                    className={`text-[10px] ${
                      doneKeys.has(t.key) ? 'text-accent-green' : past ? 'text-text-muted/40' : 'text-accent-purple/60'
                    }`}
                  />
                ))}
              </span>
              {allDone && <Icon icon="lucide:star" className="absolute top-0.5 right-0.5 text-[9px] text-accent-orange" />}
            </button>
          );
        })}
      </div>

      <DayDetail
        course={course}
        day={selected}
        today={today}
        goal={goal}
        words={wordsByDay.get(selected) ?? []}
        done={new Set(log[selected] ?? [])}
      />
    </section>
  );
}

function DayDetail({ course, day, today, goal, words, done }: {
  course: CourseChoice; day: string; today: string; goal: number; words: string[]; done: Set<string>;
}) {
  const intl = useIntl();
  const date = new Date(`${day}T00:00:00`);
  const future = day > today;
  const before = daysBetween(course.startedOn, day) < 0;
  const planned = before ? [] : tasksFor(course, goal, day);
  const label = day === today ? intl.formatMessage({ id: 'plan.today' })
    : day === addDays(today, 1) ? intl.formatMessage({ id: 'plan.cal.tomorrow' })
    : intl.formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <h3 className="text-sm font-bold text-text-primary mb-2">{label}</h3>

      {before ? (
        <p className="text-sm text-text-muted"><FormattedMessage id="plan.cal.beforeStart" /></p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <li className="flex items-center gap-2 text-sm">
            <Icon
              icon={future ? 'lucide:circle-dashed' : words.length >= goal ? 'lucide:circle-check' : 'lucide:circle'}
              className={future ? 'text-text-muted' : words.length >= goal ? 'text-accent-green' : 'text-text-muted'}
            />
            <span className="flex-1 text-text-primary font-bold">
              {future
                ? <FormattedMessage id="plan.words" values={{ n: goal }} />
                : <FormattedMessage id="plan.cal.wordsDone" values={{ n: words.length, goal }} />}
            </span>
          </li>
          {planned.map((t) => {
            const isDone = done.has(t.key);
            const row = (
              <>
                <Icon
                  icon={future ? 'lucide:circle-dashed' : isDone ? 'lucide:circle-check' : 'lucide:circle'}
                  className={isDone ? 'text-accent-green' : 'text-text-muted'}
                />
                <span className="flex-1 text-text-primary font-bold"><FormattedMessage id={t.labelId} /></span>
                <Icon icon={SKILL_ICON[t.skill]} className="text-text-muted" />
              </>
            );
            return (
              <li key={t.key}>
                {day === today
                  ? <Link to={taskHref(t)} className="flex items-center gap-2 text-sm hover:opacity-80">{row}</Link>
                  : <div className="flex items-center gap-2 text-sm">{row}</div>}
              </li>
            );
          })}
        </ul>
      )}

      {!future && words.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {words.slice(0, 40).map((w) => (
            <Link key={w} to={`/?word=${encodeURIComponent(w)}`} className="px-2 py-0.5 rounded-md bg-bg-tertiary text-xs font-bold text-text-secondary hover:text-text-primary">
              {w}
            </Link>
          ))}
          {words.length > 40 && <span className="text-xs text-text-muted self-center">+{words.length - 40}</span>}
        </div>
      )}
    </div>
  );
}
