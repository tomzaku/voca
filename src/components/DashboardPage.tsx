// Learning dashboard: how long the streak is, and a month-by-month calendar of
// what was actually answered each day.
//
// The chart and the calendar are both built from the answer feed in
// `useActivity` — one range fetch, not a walk over the vocabulary store, which
// no longer carries answer logs. The range covers whatever the chart and the
// displayed month need between them, and widens when the calendar goes back.
//
// The log keeps the last 50 answers per word, so very old days can thin out for
// heavily-drilled words; recent months, which is what anyone actually looks at,
// are complete.

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { useActivity } from '../hooks/useActivity';
import { MasteryBar } from './MasteryBar';
import { Leaderboard } from './Leaderboard';
import { useStreak, localDateString } from '../hooks/useStreak';
import type { ActivityEvent as DayEvent } from '../lib/progressApi';

type Filter = 'all' | 'correct' | 'incorrect';
/** Which edge the day drawer slides in from. */
type Side = 'left' | 'right';
type Range = 'day' | 'week';

/** How many periods the activity chart covers. */
const DAY_BUCKETS = 14;
const WEEK_BUCKETS = 12;

/**
 * One word per day, however many times it was drilled. Shared by the chart and
 * the calendar so the two can never disagree about what "5 words" means.
 */
function uniqueByWord(events: DayEvent[]): DayEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const k = e.word.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'correct', label: 'Correct' },
  { id: 'incorrect', label: 'Incorrect' },
];

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** Spelled out from `sm` up, where there's room — as Google Calendar does. */
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const DAY_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const DAY_MS = 86_400_000;

/** Local YYYY-MM-DD for an ISO timestamp — days must be the learner's, not UTC's. */
function dayKeyOf(iso: string): string {
  return localDateString(new Date(iso));
}

/**
 * How many words fit in one calendar cell at the current width. Measured in JS
 * rather than hidden with responsive classes because the "+N more" count has to
 * match what's actually visible — CSS can hide the chips but can't recount them.
 */
function wordsPerCell(): number {
  if (window.matchMedia('(min-width: 1024px)').matches) return 6;
  if (window.matchMedia('(min-width: 640px)').matches) return 3;
  // A 7-column grid on a phone leaves no room for text; the count and the day
  // panel below carry it instead.
  return 0;
}

function useWordsPerCell(): number {
  const [count, setCount] = useState(wordsPerCell);
  useEffect(() => {
    const onResize = () => setCount(wordsPerCell());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return count;
}

export function DashboardPage() {
  const events = useActivity((s) => s.events);
  const loadingActivity = useActivity((s) => s.loading);
  const ensureActivity = useActivity((s) => s.ensure);
  const streak = useStreak((s) => s.count);
  const longest = useStreak((s) => s.longest);

  const [filter, setFilter] = useState<Filter>('all');
  // First of the displayed month; navigation only ever moves whole months.
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  // null = no day open. The detail is a drawer, not a permanent panel.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [drawerSide, setDrawerSide] = useState<Side>('right');
  const [range, setRange] = useState<Range>('day');
  const perCell = useWordsPerCell();

  // The earliest instant anything on screen needs: the chart's window, or the
  // month grid being browsed, whichever reaches further back. Asked for on every
  // render — `ensure` is a no-op once the range is covered and fresh.
  const neededSince = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const chart = range === 'day'
      ? startOfToday.getTime() - (DAY_BUCKETS - 1) * DAY_MS
      : startOfToday.getTime() - (startOfToday.getDay() + (WEEK_BUCKETS - 1) * 7) * DAY_MS;
    // The grid, not the month: `cells` fills its leading slots with up to six
    // real days from the month before, and those carry data worth showing.
    const grid = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
    return Math.min(chart, grid.getTime());
  }, [range, month]);

  useEffect(() => {
    void ensureActivity(neededSince);
  }, [ensureActivity, neededSince]);

  /** Every answer in the loaded range, bucketed by local day. */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    for (const ev of events) {
      const key = dayKeyOf(ev.at);
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [events]);

  /** Day key -> the events that survive the current filter, deduped by word. */
  const filteredByDay = useMemo(() => {
    const matches = (e: DayEvent) =>
      filter === 'all' || (filter === 'correct' ? e.ok : !e.ok);
    const map = new Map<string, DayEvent[]>();
    for (const [day, events] of eventsByDay) {
      const kept = events.filter(matches);
      if (kept.length === 0) continue;
      // A word drilled five times in a day is still one word on the calendar —
      // showing it five times would bury the other words studied that day.
      map.set(day, uniqueByWord(kept));
    }
    return map;
  }, [eventsByDay, filter]);

  /**
   * A full rectangle of weeks. Like Google Calendar, the leading and trailing
   * slots are filled with real days from the neighbouring months (greyed) rather
   * than left blank — a ragged grid reads as broken, and those days still carry
   * data worth seeing at a month boundary.
   */
  const cells = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstWeekday = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const rows = Math.ceil((firstWeekday + daysInMonth) / 7);
    return Array.from({ length: rows * 7 }, (_, i) => {
      const date = new Date(year, m, 1 - firstWeekday + i);
      return {
        key: localDateString(date),
        dayNum: date.getDate(),
        inMonth: date.getMonth() === m,
      };
    });
  }, [month]);

  const monthTotals = useMemo(() => {
    let days = 0;
    let words = 0;
    for (const [day, list] of filteredByDay) {
      if (!day.startsWith(localDateString(month).slice(0, 7))) continue;
      days++;
      words += list.length;
    }
    return { days, words };
  }, [filteredByDay, month]);

  /**
   * Distinct words studied per period, most recent last. Always unfiltered —
   * it's the headline summary, while the Viewed/Correct/Incorrect chips below
   * belong to the calendar.
   */
  const activity = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const countOn = (key: string) => uniqueByWord(eventsByDay.get(key) ?? []).length;

    const buckets: { key: string; count: number; tooltip: string }[] = [];
    if (range === 'day') {
      for (let i = DAY_BUCKETS - 1; i >= 0; i--) {
        const d = new Date(startOfToday.getTime() - i * DAY_MS);
        const key = localDateString(d);
        buckets.push({
          key,
          count: countOn(key),
          tooltip: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        });
      }
    } else {
      // Weeks run Sunday-to-Saturday, matching the calendar grid above.
      const thisWeekStart = new Date(startOfToday.getTime() - startOfToday.getDay() * DAY_MS);
      for (let w = WEEK_BUCKETS - 1; w >= 0; w--) {
        const start = new Date(thisWeekStart.getTime() - w * 7 * DAY_MS);
        let count = 0;
        for (let d = 0; d < 7; d++) {
          count += countOn(localDateString(new Date(start.getTime() + d * DAY_MS)));
        }
        buckets.push({
          key: localDateString(start),
          count,
          tooltip: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        });
      }
    }

    const total = buckets.reduce((a, b) => a + b.count, 0);
    return {
      buckets,
      total,
      max: Math.max(1, ...buckets.map((b) => b.count)),
      // Rounded to one decimal: "6.4 a day" is honest where "6" implies exactness.
      average: Math.round((total / buckets.length) * 10) / 10,
    };
  }, [eventsByDay, range]);

  const today = localDateString();
  const selected = selectedDay ? (filteredByDay.get(selectedDay) ?? []) : [];
  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="max-w-page mx-auto px-4 py-8 flex flex-col gap-6">
      {/* First on the page: where you stand against everyone else is the thing
          people come back for, and it's also the only section that changes
          because of what someone ELSE did since you last looked. */}
      <Leaderboard />

      {/* Headline: the three numbers worth knowing, plus what the last two
          weeks actually looked like. Bars, not a line — daily counts are
          discrete events, and a line would imply a continuous quantity. */}
      <div className="rounded-2xl border-[3px] border-border bg-bg-card p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-around text-center">
          <div className="flex flex-col items-center gap-1">
            <Icon icon="lucide:flame" className="text-2xl text-accent-orange" />
            <span className="text-3xl font-title text-accent-orange tabular-nums">{streak}</span>
            <span className="text-xs text-text-muted">day streak</span>
          </div>
          <div className="w-px h-14 bg-border" />
          <div className="flex flex-col items-center gap-1">
            <Icon icon="lucide:trophy" className="text-2xl text-accent-yellow" />
            <span className="text-3xl font-title text-accent-yellow tabular-nums">{longest}</span>
            <span className="text-xs text-text-muted">personal best</span>
          </div>
          <div className="w-px h-14 bg-border" />
          <div className="flex flex-col items-center gap-1">
            <Icon icon="lucide:book-open" className="text-2xl text-accent-cyan" />
            <span className="text-3xl font-title text-accent-cyan tabular-nums">
              {activity.total}
            </span>
            <span className="text-xs text-text-muted">
              words {range === 'day' ? 'in 14 days' : 'in 12 weeks'}
            </span>
          </div>
        </div>

        {/* Activity chart */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-bold text-text-secondary">
                Words per {range === 'day' ? 'day' : 'week'}
              </p>
              {/* "0 on average" is a claim about the learner; while the feed is
                  still arriving it isn't one we can make yet. */}
              <p className="text-[11px] text-text-muted tabular-nums">
                {loadingActivity && activity.total === 0
                  ? 'Loading…'
                  : `${activity.average} on average · best ${activity.max}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(['day', 'week'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                  className={`btn-3d px-2.5 py-1 text-[11px] font-bold ${
                    range === r ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  {r === 'day' ? 'Daily' : 'Weekly'}
                </button>
              ))}
            </div>
          </div>

          {/* One measure over time, so one hue; height carries the magnitude and
              the tooltip carries the exact value. Labelling every bar would be
              noise at 14 of them. */}
          <div className="flex items-end gap-0.5 sm:gap-1 h-24">
            {activity.buckets.map((b) => (
              <div
                key={b.key}
                title={`${b.tooltip}: ${b.count} word${b.count === 1 ? '' : 's'}`}
                className="flex-1 h-full flex items-end min-w-0"
              >
                <div
                  className={`w-full rounded-t transition-[height] ${
                    b.count > 0 ? 'bg-accent-cyan' : 'bg-bg-tertiary'
                  }`}
                  style={{
                    // Empty periods keep a 2px stub so the baseline stays
                    // readable as a row rather than disappearing.
                    height: b.count > 0 ? `${Math.max((b.count / activity.max) * 100, 6)}%` : '2px',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Ends only — a tick under all 14 bars is unreadable and adds nothing. */}
          <div className="flex justify-between mt-1.5 text-[10px] text-text-muted/70">
            <span>{activity.buckets[0]?.tooltip}</span>
            <span>{activity.buckets[activity.buckets.length - 1]?.tooltip}</span>
          </div>
        </div>
      </div>

      {/* Where the vocabulary stands — state, as opposed to the activity
          everything else on this page measures. */}
      <MasteryBar />

      {/* Calendar */}
      <div className="relative rounded-2xl border-[3px] border-border bg-bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b-[3px] border-border">
          <div className="min-w-0">
            <p className="font-display font-bold text-lg text-text-primary truncate">
              {MONTH_FORMAT.format(month)}
            </p>
            <p className="text-[11px] text-text-muted">
              {monthTotals.days} day{monthTotals.days === 1 ? '' : 's'} · {monthTotals.words} word
              {monthTotals.words === 1 ? '' : 's'}
            </p>
          </div>
          {/* Segmented control: mutually exclusive, so radio semantics rather
              than three independent toggle buttons. */}
          <div
            role="radiogroup"
            aria-label="Filter days by answer"
            className="inline-flex items-center rounded-full bg-bg-tertiary p-0.5 order-last sm:order-none w-full sm:w-auto"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                  filter === f.id
                    ? 'bg-bg-card text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              className="btn-3d px-3 py-1.5 text-xs font-bold bg-bg-tertiary text-text-secondary"
            >
              Today
            </button>
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="btn-3d w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center"
            >
              <Icon icon="lucide:chevron-left" />
            </button>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="btn-3d w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center"
            >
              <Icon icon="lucide:chevron-right" />
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAY_INITIALS.map((w, i) => (
            <div
              key={i}
              className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted/70"
            >
              <span className="sm:hidden">{w}</span>
              <span className="hidden sm:inline">{WEEKDAY_SHORT[i]}</span>
            </div>
          ))}
        </div>

        {/* Grid. Continuous hairlines rather than gapped cards — that unbroken
            ruling is most of what makes a calendar read as a calendar. */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const list = filteredByDay.get(cell.key) ?? [];
            const isToday = cell.key === today;
            const isSelected = cell.key === selectedDay;
            // Drop the outer hairlines so they don't double up with the card's
            // own border.
            const lastCol = i % 7 === 6;
            const lastRow = i >= cells.length - 7;
            return (
              <button
                key={cell.key}
                onClick={() => {
                  // Columns 0-3 sit in the left half, so the drawer goes right;
                  // 4-6 the reverse. The day you clicked is never covered.
                  setDrawerSide(i % 7 <= 3 ? 'right' : 'left');
                  setSelectedDay((d) => (d === cell.key ? null : cell.key));
                }}
                aria-label={`${cell.key}, ${list.length} words`}
                aria-pressed={isSelected}
                className={`relative ${lastCol ? '' : 'border-r'} ${lastRow ? '' : 'border-b'} border-border min-h-16 sm:min-h-28 lg:min-h-36 p-1 sm:p-1.5 flex flex-col items-center sm:items-stretch gap-1 text-left transition-colors overflow-hidden ${
                  isSelected ? 'bg-accent-cyan/10' : 'hover:bg-bg-hover'
                } ${cell.inMonth ? '' : 'bg-bg-tertiary/25'}`}
              >
                {/* Day number: top-left, with today as a filled disc. */}
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs tabular-nums sm:self-start ${
                    isToday
                      ? 'bg-accent-cyan text-bg-primary font-extrabold'
                      : cell.inMonth
                        ? 'text-text-secondary'
                        : 'text-text-muted/40'
                  }`}
                >
                  {cell.dayNum}
                </span>

                {/* Mobile: dots, since a 7-column grid on a phone has no room
                    for text. Desktop: full-width event chips. */}
                {list.length > 0 && perCell === 0 && (
                  <span className="flex items-center gap-0.5">
                    {list.slice(0, 3).map((e) => (
                      <span
                        key={e.word}
                        className={`w-1.5 h-1.5 rounded-full ${
                          e.ok ? 'bg-accent-green' : 'bg-accent-red'
                        }`}
                      />
                    ))}
                    {list.length > 3 && (
                      <span className="text-[9px] text-text-muted leading-none">
                        +{list.length - 3}
                      </span>
                    )}
                  </span>
                )}

                {list.length > 0 && perCell > 0 && (
                  <span className="flex flex-col gap-px w-full min-w-0">
                    {list.slice(0, perCell).map((e) => (
                      <span
                        key={e.word}
                        title={e.word}
                        className={`flex items-center gap-1 w-full rounded px-1 py-0.5 text-[11px] leading-tight ${
                          e.ok
                            ? 'bg-accent-green/10 text-accent-green'
                            : 'bg-accent-red/10 text-accent-red'
                        }`}
                      >
                        {/* A mark, not a dot: correct vs incorrect must survive
                            colour blindness. */}
                        <Icon
                          icon={e.ok ? 'lucide:check' : 'lucide:x'}
                          className="text-[10px] shrink-0"
                        />
                        <span className="truncate">{e.word}</span>
                      </span>
                    ))}
                    {list.length > perCell && (
                      <span className="px-1 text-[11px] leading-tight text-text-muted hover:underline">
                        {list.length - perCell} more
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day detail, drawn inside the calendar and clipped to it. Opens on
            the side opposite the day you clicked, so that day stays visible.
            No tint or blur — being able to still read the grid is the point. */}
        {selectedDay && (
          <>
            {/* Transparent catcher: dismisses on an outside click without
                dimming anything. Scoped to the card, so the rest of the page
                stays interactive. */}
            <div className="absolute inset-0 z-10" onClick={() => setSelectedDay(null)} />
            <aside
              className={`absolute top-0 bottom-0 z-20 w-72 max-w-[80%] bg-bg-secondary shadow-2xl flex flex-col ${
                drawerSide === 'right'
                  ? 'right-0 border-l-[3px] border-border animate-slide-in-right'
                  : 'left-0 border-r-[3px] border-border animate-slide-in-left'
              }`}
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3 border-b-[3px] border-border">
                <div className="min-w-0">
                  <h3 className="text-sm font-display font-extrabold text-text-primary">
                    {selectedDay === today
                      ? 'Today'
                      : DAY_FORMAT.format(new Date(`${selectedDay}T00:00:00`))}
                    {selected.length > 0 && (
                      <span className="ml-2 text-[11px] font-bold text-text-muted">
                        {selected.length}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                    {selected.length === 0
                      ? filter === 'all'
                        ? 'Nothing studied on this day.'
                        : `No ${filter} answers on this day.`
                      : 'Tap a word to open its card.'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  aria-label="Close"
                  className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary cursor-pointer"
                >
                  <Icon icon="lucide:x" />
                </button>
              </div>

              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 overflow-y-auto">
                  {selected.map((e) => (
                    <Link
                      key={e.word}
                      to={`/?word=${encodeURIComponent(e.word)}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                        e.ok
                          ? 'bg-accent-green/10 text-accent-green border-accent-green/25'
                          : 'bg-accent-red/10 text-accent-red border-accent-red/25'
                      }`}
                    >
                      <Icon icon={e.ok ? 'lucide:check' : 'lucide:x'} className="text-[11px]" />
                      {e.word}
                    </Link>
                  ))}
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
