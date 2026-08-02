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
import { isIos, isStandalone } from '../lib/device';
import {
  DEFAULT_REMINDER_HOUR,
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
  const [hour, setHourState] = useState(DEFAULT_REMINDER_HOUR);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const detected = detectStatus();
    setStatus(detected);
    if (!userId) return;

    let cancelled = false;
    void fetchReminderPrefs(userId).then((prefs) => {
      if (cancelled) return;
      setEnabled(prefs.enabled);
      setHourState(prefs.hour);

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
      if (!ok) return;
      await saveReminderPrefs(userId, { enabled: true, hour });
      setEnabled(true);
    } finally {
      setBusy(false);
    }
  }, [userId, hour, busy]);

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
        if (!ok) return;
      } else {
        await unsubscribeDevice(userId);
      }
      await saveReminderPrefs(userId, { enabled: next, hour });
      setEnabled(next);
    } finally {
      setBusy(false);
    }
  }, [userId, enabled, hour, busy]);

  const setHour = useCallback(
    async (next: number) => {
      if (!userId) return;
      setHourState(next);
      await saveReminderPrefs(userId, { enabled, hour: next });
    },
    [userId, enabled],
  );

  return { status, enabled, hour, busy, enable, toggle, setHour };
}
