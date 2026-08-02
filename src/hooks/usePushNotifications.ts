// Everything awkward about Web Push permission, kept out of the UI.
//
// Permission is not a boolean. The states below are the ones a user can
// actually land in, and two of them are dead ends the interface has to explain
// rather than silently swallow:
//   'denied'            — irreversible from JS. requestPermission() resolves
//                         'denied' instantly, forever. Only the browser's own
//                         site settings can undo it, so we must say so.
//   'ios-needs-install' — iOS exposes PushManager only to Home Screen apps,
//                         and offers no programmatic install prompt.

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { isIos, isStandalone } from '../lib/device';
import {
  ALL_DAYS,
  DEFAULT_REMINDER_TIMES,
  MAX_REMINDER_TIMES,
  fetchReminderPrefs,
  pushConfigError,
  saveReminderPrefs,
  subscribeDevice,
  unsubscribeDevice,
} from '../lib/push';

export type PushStatus =
  | 'loading'
  | 'unsupported'
  | 'ios-needs-install'
  | 'default'
  | 'granted'
  | 'denied';

function detectStatus(): PushStatus {
  // Setup problem rather than a browser limitation — say so loudly, because the
  // UI's only other symptom is a section that quietly isn't there.
  const configError = pushConfigError();
  if (configError) {
    console.warn('[voca] push notifications unavailable:', configError);
    return 'unsupported';
  }

  const capable =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  // On iOS the Push API is simply absent in a normal tab, so "not capable +
  // iOS + not installed" is the add-to-Home-Screen case rather than a device
  // that can never do this.
  if (!capable) return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported';

  return Notification.permission as 'default' | 'granted' | 'denied';
}

export function usePushNotifications(userId: string | undefined) {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [enabled, setEnabled] = useState(false);
  const [notifyStreak, setNotifyStreak] = useState(true);
  const [notifyReview, setNotifyReview] = useState(true);
  const [times, setTimesState] = useState<number[]>(DEFAULT_REMINDER_TIMES);
  const [days, setDaysState] = useState<number[]>(ALL_DAYS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const detected = detectStatus();
    setStatus(detected);
    if (!userId) return;

    let cancelled = false;
    void fetchReminderPrefs(userId).then((prefs) => {
      if (cancelled) return;
      setEnabled(prefs.enabled);
      setNotifyStreak(prefs.notifyStreak);
      setNotifyReview(prefs.notifyReview);
      setTimesState(prefs.times);
      setDaysState(prefs.days);

      // `enabled` is a per-user preference but subscriptions are per-device, so
      // a second device arrives with the toggle already on and no endpoint of
      // its own. Without this it would show "on" and silently never ring.
      // Subscribing is idempotent, so re-running it costs nothing.
      if (prefs.enabled && detected === 'granted') void subscribeDevice(userId);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Prompt for permission, then subscribe. Must be called from a user gesture. */
  const enable = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as PushStatus);
      if (permission !== 'granted') return;

      const ok = await subscribeDevice(userId);
      if (!ok) {
        toast.error("Couldn't set up reminders on this device.");
        return;
      }
      await saveReminderPrefs(userId, { enabled: true, notifyStreak, notifyReview, times, days });
      setEnabled(true);
    } catch (err) {
      // Never let a rejection escape: an unhandled one leaves the control
      // looking simply broken, with the reason buried in the console.
      console.warn('[voca] enabling reminders failed:', err);
      toast.error((err as Error).message || "Couldn't enable reminders.");
    } finally {
      setBusy(false);
    }
  }, [userId, notifyStreak, notifyReview, times, days, busy]);

  /**
   * Turn reminders on/off. Off unsubscribes this device but deliberately keeps
   * the browser permission, so coming back doesn't need a prompt we may not be
   * allowed to show.
   */
  const toggle = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    const next = !enabled;
    try {
      if (next) {
        const ok = await subscribeDevice(userId);
        if (!ok) {
          toast.error("Couldn't set up reminders on this device.");
          return;
        }
      } else {
        await unsubscribeDevice(userId);
      }
      await saveReminderPrefs(userId, { enabled: next, notifyStreak, notifyReview, times, days });
      setEnabled(next);
    } catch (err) {
      console.warn('[voca] toggling reminders failed:', err);
      toast.error((err as Error).message || "Couldn't update reminders.");
    } finally {
      setBusy(false);
    }
  }, [userId, enabled, notifyStreak, notifyReview, times, days, busy]);

  const persistTimes = useCallback(
    async (next: number[]) => {
      if (!userId) return;
      const previous = times;
      setTimesState(next);
      try {
        await saveReminderPrefs(userId, { enabled, notifyStreak, notifyReview, times: next, days });
      } catch (err) {
        // `saveReminderPrefs` throws, so without this the rejection is unhandled
        // and the UI silently claims a schedule the server never stored.
        setTimesState(previous);
        console.warn('[voca] saving reminder times failed:', err);
        toast.error((err as Error).message);
      }
    },
    [userId, enabled, notifyStreak, notifyReview, days, times],
  );

  /** Append a time. No-op past the cap, or if that slot is already scheduled. */
  const addTime = useCallback(
    async (minutes: number) => {
      if (times.includes(minutes) || times.length >= MAX_REMINDER_TIMES) return;
      await persistTimes([...times, minutes].sort((a, b) => a - b));
    },
    [times, persistTimes],
  );

  /**
   * Remove a time. Refuses the last one for the same reason `toggleDay` does:
   * an empty schedule is indistinguishable from a broken one.
   */
  const removeTime = useCallback(
    async (minutes: number) => {
      if (times.length <= 1) return;
      await persistTimes(times.filter((t) => t !== minutes));
    },
    [times, persistTimes],
  );

  /** Move one time to another slot. Collapses onto an existing entry silently. */
  const updateTime = useCallback(
    async (from: number, to: number) => {
      if (from === to) return;
      const next = times.filter((t) => t !== from);
      if (!next.includes(to)) next.push(to);
      await persistTimes(next.sort((a, b) => a - b));
    },
    [times, persistTimes],
  );

  /**
   * Add/remove a weekday. Removing the last one is refused rather than allowed:
   * an empty set silently means "never", which looks identical to enabled-but-
   * broken. Turning the whole thing off is what the toggle is for.
   */
  const toggleDay = useCallback(
    async (day: number) => {
      if (!userId) return;
      const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
      if (next.length === 0) return;
      setDaysState(next);
      try {
        await saveReminderPrefs(userId, { enabled, notifyStreak, notifyReview, times, days: next });
      } catch (err) {
        setDaysState(days);
        console.warn('[voca] saving reminder days failed:', err);
        toast.error((err as Error).message);
      }
    },
    [userId, enabled, notifyStreak, notifyReview, times, days],
  );

  /**
   * Per-type switches. These are preferences, not subscriptions — muting one
   * kind never touches the push endpoint, so nothing needs re-permitting.
   */
  const toggleType = useCallback(
    async (type: 'streak' | 'review') => {
      if (!userId) return;
      const nextStreak = type === 'streak' ? !notifyStreak : notifyStreak;
      const nextReview = type === 'review' ? !notifyReview : notifyReview;
      if (type === 'streak') setNotifyStreak(nextStreak);
      else setNotifyReview(nextReview);
      try {
        await saveReminderPrefs(userId, {
          enabled,
          notifyStreak: nextStreak,
          notifyReview: nextReview,
          times,
          days,
        });
      } catch (err) {
        // Roll back so the switch can't claim a setting the server rejected.
        if (type === 'streak') setNotifyStreak(notifyStreak);
        else setNotifyReview(notifyReview);
        console.warn('[voca] saving notification type failed:', err);
        toast.error((err as Error).message);
      }
    },
    [userId, enabled, notifyStreak, notifyReview, times, days],
  );

  return {
    status,
    enabled,
    notifyStreak,
    notifyReview,
    toggleType,
    times,
    days,
    busy,
    atCapacity: times.length >= MAX_REMINDER_TIMES,
    enable,
    toggle,
    addTime,
    removeTime,
    updateTime,
    toggleDay,
  };
}
