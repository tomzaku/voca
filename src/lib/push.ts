// Web Push plumbing: turning browser permission into a subscription row the
// `notify` edge function can deliver to, plus the per-user reminder schedule.
//
// The app is a static site, so nothing of ours is running at 8am to send
// anything — delivery is Postgres (pg_cron) -> the `notify` function -> the
// push service -> the service worker in src/sw.ts.

import { supabase } from './supabase';

/** Default schedule for a new user: 7am, their local clock, every day. */
export const DEFAULT_REMINDER_HOURS = [7];

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
  enabled: boolean;
  hours: number[];
  days: number[];
  timezone: string;
}

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((d, i) => d === [...b].sort()[i]);

/**
 * "Every day at 7:00 AM" / "Weekdays at 7:00 AM, 8:00 PM" / "Mon, Wed at 7:00 AM".
 * Naming the common day patterns beats reading seven highlighted letters back.
 */
export function formatSchedule(hours: number[], days: number[]): string {
  if (days.length === 0 || hours.length === 0) return 'No schedule set';
  const at = `at ${[...hours].sort((a, b) => a - b).map(formatHour).join(', ')}`;
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

/** "8:00 AM" — labels the hour picker in the user's own locale conventions. */
export function formatHour(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
export async function subscribeDevice(userId: string): Promise<boolean> {
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

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: encodeKey(sub, 'p256dh'),
      auth: encodeKey(sub, 'auth'),
    },
    { onConflict: 'user_id,endpoint' },
  );

  if (error) {
    console.warn('[voca] failed to save push subscription:', error.message);
    return false;
  }
  return true;
}

/**
 * Drop this device's subscription. Note this does NOT surrender notification
 * permission — the user can re-enable later without a prompt, which matters
 * because a denied prompt can never be shown again.
 */
export async function unsubscribeDevice(userId: string): Promise<void> {
  if (!supabase) return;

  const registration = await readyRegistration();
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;

  await sub.unsubscribe().catch(() => undefined);
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', sub.endpoint);
  if (error) console.warn('[voca] failed to remove push subscription:', error.message);
}

/** Load the user's reminder schedule, falling back to 8am local. */
export async function fetchReminderPrefs(userId: string): Promise<ReminderPrefs> {
  const fallback: ReminderPrefs = {
    enabled: false,
    hours: DEFAULT_REMINDER_HOURS,
    days: ALL_DAYS,
    timezone: localTimezone(),
  };
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from('user_settings')
    .select('reminder_enabled, reminder_hours, reminder_days, reminder_timezone')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return fallback;
  const days = data.reminder_days as number[] | null;
  const hours = data.reminder_hours as number[] | null;
  return {
    enabled: Boolean(data.reminder_enabled),
    hours: hours && hours.length > 0 ? hours : DEFAULT_REMINDER_HOURS,
    days: days && days.length > 0 ? days : ALL_DAYS,
    timezone: (data.reminder_timezone as string | null) || fallback.timezone,
  };
}

/**
 * Persist the schedule. Always writes the *current* device timezone, so the
 * reminder follows a user who moves rather than firing on their old clock.
 */
export async function saveReminderPrefs(
  userId: string,
  prefs: Pick<ReminderPrefs, 'enabled' | 'hours' | 'days'>,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    reminder_enabled: prefs.enabled,
    // Sorted + deduped: the DB caps the length, and a stored duplicate would
    // read back as a repeated row in the UI.
    reminder_hours: [...new Set(prefs.hours)].sort((a, b) => a - b),
    reminder_days: [...prefs.days].sort(),
    reminder_timezone: localTimezone(),
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[voca] failed to save reminder prefs:', error.message);
}
