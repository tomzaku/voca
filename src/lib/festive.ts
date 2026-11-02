// The festive season the app dresses up for — Lunar New Year (Tết) for now.
//
// "Auto" turns it on for the season: three weeks before the first day of the
// new year, through Rằm tháng Giêng, the 15th day, when Tết traditionally
// winds down. Lunar dates move every year, so they're listed rather than
// computed — a lunisolar calendar is a lot of code to be wrong in, and a
// table is easy to check against any calendar.

export type FestiveMode = 'auto' | 'on' | 'off';
export const FESTIVE_MODES: FestiveMode[] = ['auto', 'on', 'off'];

/** The first day of each Lunar New Year (Vietnam), local date. */
export const LUNAR_NEW_YEARS = [
  '2026-02-17',
  '2027-02-06',
  '2028-01-26',
  '2029-02-13',
  '2030-02-03',
  '2031-01-23',
  '2032-02-11',
  '2033-01-31',
  '2034-02-19',
  '2035-02-08',
] as const;

const DAY = 86_400_000;
/** Decorations go up about three weeks ahead… */
export const DAYS_BEFORE = 21;
/** …and come down after the 15th day (the first day is day 1). */
export const DAYS_AFTER = 14;

/** Midnight at the start of a `YYYY-MM-DD`, in local time. */
function localDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Whether `now` falls in a Lunar New Year season. */
export function inLunarSeason(now: Date): boolean {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return LUNAR_NEW_YEARS.some((iso) => {
    const day = localDay(iso);
    return t >= day - DAYS_BEFORE * DAY && t <= day + DAYS_AFTER * DAY;
  });
}

/** The next (or current) Lunar New Year's first day on or after the season's start, if listed. */
export function nextLunarNewYear(now: Date): Date | null {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const iso = LUNAR_NEW_YEARS.find((d) => localDay(d) + DAYS_AFTER * DAY >= t);
  return iso ? new Date(localDay(iso)) : null;
}

export function festiveActive(mode: FestiveMode, now: Date): boolean {
  return mode === 'on' || (mode === 'auto' && inLunarSeason(now));
}
