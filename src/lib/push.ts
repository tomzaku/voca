// Web Push plumbing: turning browser permission into a subscription row the
// `notify` edge function can deliver to, plus the per-user reminder schedule.
//
// The app is a static site, so nothing of ours is running at 8am to send
// anything — delivery is Postgres (pg_cron) -> the `notify` function -> the
// push service -> the service worker in src/sw.ts.

import { supabase } from './supabase';
import { fetchSettings, saveSettings } from './settingsApi';
import { removePushSubscription, savePushSubscription } from './pushApi';

/**
 * Reminder times are stored as MINUTES SINCE MIDNIGHT (7:30 AM = 450), in
 * half-hour steps. One integer per time, no separate minute field to keep in
 * step, and it sorts naturally.
 */
export const SLOT_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;

/** Default schedule for a new user: 7:00 AM, their local clock, every day. */
export const DEFAULT_REMINDER_TIMES = [7 * 60];

/**
 * Ceiling on reminders per day. Past a handful, a reminder app stops being a
 * nudge and becomes noise you mute — which costs you every reminder, not just
 * the excess ones.
 */
export const MAX_REMINDER_TIMES = 5;

/** 0 = Sunday … 6 = Saturday — matches both Date#getDay() and Postgres `dow`. */
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Single-letter chip labels, indexed by day number. */
export const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Full names — the initials repeat (S/S, T/T), so screen readers need these. */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

export interface ReminderPrefs {
  /** Master switch. Off unsubscribes the device; the per-type flags below are
   *  preferences that survive it. */
  enabled: boolean;
  notifyStreak: boolean;
  notifyReview: boolean;
  /** Minutes since midnight, e.g. 450 for 7:30 AM. */
  times: number[];
  days: number[];
  timezone: string;
}

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((d, i) => d === [...b].sort()[i]);

/**
 * "Every day at 7:00 AM" / "Weekdays at 7:00 AM, 8:00 PM" / "Mon, Wed at 7:00 AM".
 * Naming the common day patterns beats reading seven highlighted letters back.
 */
export function formatSchedule(times: number[], days: number[]): string {
  if (days.length === 0 || times.length === 0) return 'No schedule set';
  const at = `at ${[...times].sort((a, b) => a - b).map(formatTime).join(', ')}`;
  if (sameDays(days, ALL_DAYS)) return `Every day ${at}`;
  if (sameDays(days, WEEKDAYS)) return `Weekdays ${at}`;
  if (sameDays(days, WEEKEND)) return `Weekends ${at}`;
  const named = [...days].sort().map((d) => DAY_SHORT[d]).join(', ');
  return `${named} ${at}`;
}

/** The browser's current IANA zone, e.g. "Asia/Ho_Chi_Minh". */
export function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** "7:30 AM" — display form, in the user's own locale conventions. */
export function formatTime(minutes: number): string {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * "07:30" — the value format `<input type="time">` requires. Always 24-hour
 * regardless of what the browser *displays*, which is locale-dependent.
 */
export function toTimeInputValue(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Parse an `<input type="time">` value back to minutes, snapped to the nearest
 * half hour. `step` should prevent off-slot values, but not every browser
 * enforces it on typed input — and an unsnapped time would simply never match
 * the sender's slot, i.e. silently never fire.
 */
export function fromTimeInputValue(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const raw = Number(match[1]) * 60 + Number(match[2]);
  if (!Number.isFinite(raw) || raw < 0 || raw >= MINUTES_PER_DAY) return null;
  return (Math.round(raw / SLOT_MINUTES) * SLOT_MINUTES) % MINUTES_PER_DAY;
}

/** First free slot for a new entry — an hour after the latest, wrapping round. */
export function nextFreeSlot(times: number[]): number {
  const start = times.length > 0 ? Math.max(...times) + 60 : 7 * 60;
  for (let i = 0; i < MINUTES_PER_DAY / SLOT_MINUTES; i++) {
    const candidate = (start + i * SLOT_MINUTES) % MINUTES_PER_DAY;
    if (!times.includes(candidate)) return candidate;
  }
  return start % MINUTES_PER_DAY;
}

/**
 * VAPID keys travel as base64url text but `subscribe()` wants raw bytes.
 * Undoing the URL-safe alphabet and re-padding is the whole job.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** A subscription's keys arrive as ArrayBuffers; the DB stores base64url text. */
function encodeKey(sub: PushSubscription, name: 'p256dh' | 'auth'): string {
  const raw = sub.getKey(name);
  if (!raw) return '';
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const vapidPublicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '';

/**
 * Why push is unavailable, or null when it's good to go.
 *
 * This is deliberately distinct from "the browser can't do push". A missing key
 * is a *setup* problem with a fix, and the reminder UI hides itself either way
 * — so without this the only symptom is a Profile page that silently lacks a
 * section, which tells nobody anything.
 */
export function pushConfigError(): string | null {
  if (!supabase) {
    return 'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).';
  }
  if (!vapidPublicKey) {
    return (
      'VITE_VAPID_PUBLIC_KEY is not set, so daily reminders are hidden. ' +
      'Generate a pair with `npx web-push generate-vapid-keys`, put the public ' +
      'half in .env, and restart the dev server (Vite only reads .env at startup). ' +
      'For the deployed site, add it as a GitHub Actions secret.'
    );
  }
  return null;
}

/** Push can't work without a configured VAPID key, however capable the browser. */
export function pushConfigured(): boolean {
  return pushConfigError() === null;
}

/**
 * `navigator.serviceWorker.ready` never rejects — by spec it waits forever for
 * an active worker. If registration failed (or the dev server isn't serving
 * one), awaiting it deadlocks whatever called us, and any `busy` flag guarding
 * the UI stays stuck on. Racing a timeout turns that silent hang into an error
 * we can actually show someone.
 */
async function readyRegistration(timeoutMs = 10_000): Promise<ServiceWorkerRegistration> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('No active service worker — push cannot be set up.')),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Subscribe this device and persist the endpoint. Returns false if the browser
 * refused — the caller has already checked permission, but a push service can
 * still fail (offline, or a service worker that never activated).
 */
export async function subscribeDevice(): Promise<boolean> {
  if (!supabase || !vapidPublicKey) return false;

  const registration = await readyRegistration();

  // Reuse an existing subscription when there is one: re-subscribing with the
  // same key returns the same endpoint, but calling it needlessly can fail if
  // the key ever changed.
  const existing = await registration.pushManager.getSubscription();
  const sub =
    existing ??
    (await registration.pushManager.subscribe({
      // Required by Chrome: every push must result in a visible notification.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));

  const saved = await savePushSubscription({
    endpoint: sub.endpoint,
    p256dh: encodeKey(sub, 'p256dh'),
    auth: encodeKey(sub, 'auth'),
  });
  // A browser subscription the server doesn't know about would never be sent
  // to, so a failed save means this device isn't subscribed.
  return saved;
}

/**
 * Drop this device's subscription. Note this does NOT surrender notification
 * permission — the user can re-enable later without a prompt, which matters
 * because a denied prompt can never be shown again.
 */
export async function unsubscribeDevice(): Promise<void> {
  if (!supabase) return;

  const registration = await readyRegistration();
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;

  await sub.unsubscribe().catch(() => undefined);
  await removePushSubscription(sub.endpoint);
}

/** Load the user's reminder schedule, falling back to 8am local. */
export async function fetchReminderPrefs(): Promise<ReminderPrefs> {
  const fallback: ReminderPrefs = {
    enabled: false,
    notifyStreak: true,
    notifyReview: true,
    times: DEFAULT_REMINDER_TIMES,
    days: ALL_DAYS,
    timezone: localTimezone(),
  };
  const settings = await fetchSettings();
  if (!settings) return fallback;

  const { reminderDays: days, reminderTimes: times } = settings;
  return {
    enabled: Boolean(settings.reminderEnabled),
    // Default true when absent: an opted-in user wanted everything.
    notifyStreak: settings.notifyStreak ?? true,
    notifyReview: settings.notifyReview ?? true,
    times: times && times.length > 0 ? times : DEFAULT_REMINDER_TIMES,
    days: days && days.length > 0 ? days : ALL_DAYS,
    timezone: settings.reminderTimezone || fallback.timezone,
  };
}

/**
 * Persist the schedule. Always writes the *current* device timezone, so the
 * reminder follows a user who moves rather than firing on their old clock.
 */
export async function saveReminderPrefs(
  prefs: Pick<ReminderPrefs, 'enabled' | 'notifyStreak' | 'notifyReview' | 'times' | 'days'>,
): Promise<void> {
  await saveSettings({
    reminderEnabled: prefs.enabled,
    notifyStreak: prefs.notifyStreak,
    notifyReview: prefs.notifyReview,
    // Sorted + deduped: the DB caps the length, and a stored duplicate would
    // read back as a repeated row in the UI.
    reminderTimes: [...new Set(prefs.times)].sort((a, b) => a - b),
    reminderDays: [...prefs.days].sort(),
    reminderTimezone: localTimezone(),
  });
}
