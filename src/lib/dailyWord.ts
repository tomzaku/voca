// Word of the Day. A word is picked deterministically from the active word
// pack using the calendar date as the seed, so the same date always yields the
// same word (stable across reloads and shared between users) without storing
// anything. The History page uses this to show a rolling archive of past days.

import type { VocabularyWord } from '../types';
import { getActiveWordList } from './wordService';

export interface DailyWord {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  word: string;
  level: VocabularyWord['level'];
}

/** FNV-1a hash → unsigned 32-bit int. Cheap and well-distributed for our use. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Local `YYYY-MM-DD` for a date (not UTC — we want the user's calendar day). */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The word assigned to a given date. `list` is injectable to avoid rebuilding it per call. */
export function getDailyWord(date: Date, list = getActiveWordList()): DailyWord {
  const key = dateKey(date);
  const idx = list.length ? hashString(key) % list.length : 0;
  const entry = list[idx];
  return { date: key, word: entry.word, level: entry.level };
}

/** Daily words for the last `days` days, today first. */
export function getRecentDailyWords(days = 30): DailyWord[] {
  const list = getActiveWordList();
  if (list.length === 0) return [];
  const today = new Date();
  const out: DailyWord[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(getDailyWord(d, list));
  }
  return out;
}
