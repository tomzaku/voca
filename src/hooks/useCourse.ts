// The learner's course — chosen at onboarding, kept in the `settings`
// resource and mirrored in localStorage so a visitor without an account keeps
// theirs. Same shape as useDailyGoal: local first, the server is the copy that
// follows you between devices.
//
// Also which of today's plan tasks are done. That's per device and per day —
// a tick, not a record — so it lives in localStorage only and resets itself
// when the date changes.

import { create } from 'zustand';
import { fetchSettings, saveSettings } from '../lib/settingsApi';
import { parseChoice, type CourseChoice } from '../lib/course';
import { localDateString } from './useStreak';

const KEY = 'voca.course';
const DONE_KEY = 'voca.planDone';

function loadLocal(): CourseChoice | null {
  try { return parseChoice(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return null; }
}

function storeLocal(c: CourseChoice | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch { /* private mode */ }
}

interface DoneMemo { day: string; keys: string[] }

function loadDone(): DoneMemo {
  const today = localDateString();
  try {
    const v = JSON.parse(localStorage.getItem(DONE_KEY) ?? 'null');
    if (v && v.day === today && Array.isArray(v.keys)) return { day: today, keys: v.keys.filter((k: unknown) => typeof k === 'string') };
  } catch { /* fall through */ }
  return { day: today, keys: [] };
}

interface CourseState {
  course: CourseChoice | null;
  setCourse: (c: CourseChoice | null) => void;
  /** Today's finished task keys. */
  done: DoneMemo;
  markDone: (key: string) => void;
  loadFromRemote: () => Promise<void>;
}

export const useCourse = create<CourseState>((set, get) => ({
  course: loadLocal(),
  done: loadDone(),

  setCourse: (course) => {
    set({ course });
    storeLocal(course);
    // Quiet: signed out it's a no-op, and the local copy stands either way.
    void saveSettings({ course });
  },

  markDone: (key) => {
    let done = get().done;
    if (done.day !== localDateString()) done = loadDone();
    if (done.keys.includes(key)) return;
    const next = { day: done.day, keys: [...done.keys, key] };
    set({ done: next });
    try { localStorage.setItem(DONE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  },

  loadFromRemote: async () => {
    const settings = await fetchSettings();
    if (!settings) return;
    const remote = parseChoice(settings.course);
    if (!remote) {
      // Chosen on this device before signing in — carry it up to the account.
      const local = loadLocal();
      if (local) void saveSettings({ course: local });
      return;
    }
    set({ course: remote });
    storeLocal(remote);
  },
}));
