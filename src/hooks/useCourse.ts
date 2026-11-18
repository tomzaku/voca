// The learner's course — chosen at onboarding, kept in the `settings`
// resource and mirrored in localStorage so a visitor without an account keeps
// theirs. Same shape as useDailyGoal: local first, the server is the copy that
// follows you between devices.
//
// Also which plan tasks were done on which day: the `plan` resource, with a
// local mirror of recent days so ticks show instantly, survive offline, and
// work signed out. The calendar reads past days through `ensureDays`.

import { create } from 'zustand';
import { fetchSettings, saveSettings } from '../lib/settingsApi';
import { fetchPlanDays, markPlanTask } from '../lib/planApi';
import { addDays, parseChoice, type CourseChoice } from '../lib/course';
import { localDateString } from './useStreak';

const KEY = 'voca.course';
const LOG_KEY = 'voca.planLog';
/** Days of ticks kept locally — the calendar fetches anything older. */
const LOCAL_DAYS = 60;

type Log = Record<string, string[]>;

function loadLocal(): CourseChoice | null {
  try { return parseChoice(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return null; }
}

function storeLocal(c: CourseChoice | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch { /* private mode */ }
}

function loadLog(): Log {
  try {
    const v = JSON.parse(localStorage.getItem(LOG_KEY) ?? 'null');
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out: Log = {};
    for (const [day, keys] of Object.entries(v)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(keys)) out[day] = keys.filter((k) => typeof k === 'string');
    }
    return out;
  } catch { return {}; }
}

/** Mirror the recent part of the log; older days live on the server. */
function storeLog(log: Log) {
  const cutoff = addDays(localDateString(), -LOCAL_DAYS);
  const recent = Object.fromEntries(Object.entries(log).filter(([day]) => day >= cutoff));
  try { localStorage.setItem(LOG_KEY, JSON.stringify(recent)); } catch { /* private mode */ }
}

interface CourseState {
  course: CourseChoice | null;
  setCourse: (c: CourseChoice | null) => void;
  /** Day → task keys done that day. */
  log: Log;
  /** Tick a task for today. */
  markDone: (key: string) => void;
  /** Make sure the log covers `from`..`to` (inclusive), from the server. */
  ensureDays: (from: string, to: string) => Promise<void>;
  loadFromRemote: () => Promise<void>;
}

/** Ranges already fetched this session, so paging the calendar back and forth is free. */
const fetched = new Set<string>();

export const useCourse = create<CourseState>((set, get) => ({
  course: loadLocal(),
  log: loadLog(),

  setCourse: (course) => {
    set({ course });
    storeLocal(course);
    // Quiet: signed out it's a no-op, and the local copy stands either way.
    void saveSettings({ course });
  },

  markDone: (key) => {
    const day = localDateString();
    const today = get().log[day] ?? [];
    if (today.includes(key)) return;
    const log = { ...get().log, [day]: [...today, key] };
    set({ log });
    storeLog(log);
    void markPlanTask(day, key);
  },

  ensureDays: async (from, to) => {
    const range = `${from}|${to}`;
    if (fetched.has(range)) return;
    fetched.add(range);
    const days = await fetchPlanDays(from, to);
    if (!days) { fetched.delete(range); return; }
    // Union, never replace: a tick made on this device a moment ago may not
    // have reached the server yet.
    const log = { ...get().log };
    for (const { day, tasks } of days) log[day] = [...new Set([...(log[day] ?? []), ...tasks])];
    set({ log });
    storeLog(log);
  },

  loadFromRemote: async () => {
    const settings = await fetchSettings();
    if (settings) {
      const remote = parseChoice(settings.course);
      if (remote) {
        set({ course: remote });
        storeLocal(remote);
      } else {
        // Chosen on this device before signing in — carry it up to the account.
        const local = loadLocal();
        if (local) void saveSettings({ course: local });
      }
    }
    // Today's ticks made signed out go up with the account, so the reminder
    // tonight knows they're done.
    const day = localDateString();
    for (const key of get().log[day] ?? []) void markPlanTask(day, key);
    fetched.clear();
    await get().ensureDays(addDays(day, -LOCAL_DAYS), day);
  },
}));
