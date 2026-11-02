import { registerSW } from 'virtual:pwa-register';

// Why this exists: the browser only re-checks sw.js on a real navigation (or
// once a day). An installed PWA that's brought back from the background is a
// *resume*, not a navigation — so after a deploy the old build kept running
// until the OS happened to cold-start the app, minutes or hours later.
//
// Here we ask for an update ourselves at launch and every time the app comes
// back to the foreground. src/sw.ts skips waiting, and `autoUpdate` reloads the
// page once the new worker activates — so a deploy lands a few seconds after
// the app is reopened. Checks happen only on resume (not on a timer), so the
// reload never interrupts someone mid-quiz.

// Don't re-fetch sw.js on every quick app switch.
const MIN_GAP_MS = 30_000;

export function startPwaUpdates() {
  if (!('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      let lastCheck = Date.now();

      const check = () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return;
        if (Date.now() - lastCheck < MIN_GAP_MS) return;
        lastCheck = Date.now();
        registration.update().catch(() => {
          /* offline or server hiccup — the next resume tries again */
        });
      };

      document.addEventListener('visibilitychange', check);
      window.addEventListener('focus', check);
      window.addEventListener('online', check);
    },
  });
}
