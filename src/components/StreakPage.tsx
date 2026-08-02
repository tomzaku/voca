// Streak dashboard: how long the run is, and a month-by-month calendar of what
// was actually answered each day.
//
// Everything here is derived from `history` (the per-word answer log) already in
// the vocabulary store — no extra queries. That log keeps the last 50 answers
// per word, so very old days can thin out for heavily-drilled words; recent
// months, which is what anyone actually looks at, are complete.

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useStreak, localDateString } from '../hooks/useStreak';
import type { ReviewEvent } from '../types';

/** One answer, flattened out of its word so days can be built across all words. */
interface DayEvent {
  word: string;
  ok: boolean;
  at: string;
}

type Filter = 'all' | 'correct' | 'incorrect';

const FILTERS: { id: Filter; label: string; icon: string }[] = [
  { id: 'all', label: 'Viewed', icon: 'lucide:eye' },
  { id: 'correct', label: 'Correct', icon: 'lucide:check' },
  { id: 'incorrect', label: 'Incorrect', icon: 'lucide:x' },
];

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** Spelled out from `sm` up, where there's room — as Google Calendar does. */
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

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

export function StreakPage() {
  const progress = useVocabularyStore((s) => s.progress);
  const streak = useStreak((s) => s.count);
  const longest = useStreak((s) => s.longest);

  const [filter, setFilter] = useState<Filter>('all');
  // First of the displayed month; navigation only ever moves whole months.
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string>(() => localDateString());
  const perCell = useWordsPerCell();

  /** Every answer ever recorded, bucketed by local day. */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    for (const entry of Object.values(progress)) {
      for (const ev of (entry.history ?? []) as ReviewEvent[]) {
        const key = dayKeyOf(ev.at);
        const list = map.get(key);
        const item: DayEvent = { word: entry.word, ok: ev.ok, at: ev.at };
        if (list) list.push(item);
        else map.set(key, [item]);
      }
    }
    return map;
  }, [progress]);

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
      const seen = new Set<string>();
      const unique = kept.filter((e) => {
        const k = e.word.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      map.set(day, unique);
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

  const today = localDateString();
  const selected = filteredByDay.get(selectedDay) ?? [];
  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="max-w-page mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Streak headline */}
      <div className="rounded-2xl border-[3px] border-border bg-bg-card p-6 flex items-center justify-around text-center">
        <div className="flex flex-col items-center gap-1">
          <Icon icon="lucide:flame" className="text-3xl text-accent-orange" />
          <span className="text-3xl font-title text-accent-orange tabular-nums">{streak}</span>
          <span className="text-xs text-text-muted">day streak</span>
        </div>
        <div className="w-px h-14 bg-border" />
        <div className="flex flex-col items-center gap-1">
          <Icon icon="lucide:trophy" className="text-3xl text-accent-yellow" />
          <span className="text-3xl font-title text-accent-yellow tabular-nums">{longest}</span>
          <span className="text-xs text-text-muted">personal best</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`btn-3d flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold ${
              filter === f.id
                ? 'bg-accent-cyan text-bg-primary'
                : 'bg-bg-card text-text-secondary'
            }`}
          >
            <Icon icon={f.icon} className="text-sm" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border-[3px] border-border bg-bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-[3px] border-border">
          <div className="min-w-0">
            <p className="font-display font-bold text-lg text-text-primary truncate">
              {MONTH_FORMAT.format(month)}
            </p>
            <p className="text-[11px] text-text-muted">
              {monthTotals.days} day{monthTotals.days === 1 ? '' : 's'} · {monthTotals.words} word
              {monthTotals.words === 1 ? '' : 's'}
            </p>
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
                onClick={() => setSelectedDay(cell.key)}
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
      </div>

      {/* Selected day */}
      <div className="rounded-2xl border-[3px] border-border bg-bg-card p-4">
        <p className="text-sm font-display font-bold text-text-primary mb-3">
          {selectedDay === today ? 'Today' : selectedDay}
          {selected.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted">
              {selected.length} word{selected.length === 1 ? '' : 's'}
            </span>
          )}
        </p>

        {selected.length === 0 ? (
          <p className="text-xs text-text-muted">
            {filter === 'all'
              ? 'Nothing studied on this day.'
              : `No ${filter} answers on this day.`}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
}
